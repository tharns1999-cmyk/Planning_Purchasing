import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRepository } from '../services/repositories/LocalStorageRepository';
import {
  CreateFgAllocationInput,
  CreateWipPrepAllocationInput,
} from '../services/repositories/PlannerRepository';
import { SourceType } from '../domain/types';

describe('Phase 1E.2 — Plan Allocation Service Tests', () => {
  let repository: LocalStorageRepository;
  let draftPlanId: string;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageRepository();
    repository.initialize();

    // Create a DRAFT plan for testing
    const res = repository.createDraftPlan('2026-07-20');
    expect(res.success).toBe(true);
    draftPlanId = res.plan!.id;
  });

  it('1. Successfully creates an FG Allocation in a DRAFT plan', () => {
    const input: CreateFgAllocationInput = {
      planId: draftPlanId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1', // orderedQty = 500
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 200,
      unit: 'ชิ้น',
      plannedUnit: 'ชิ้น',
      fgOutputQty: 200,
      fgOutputUnit: 'ชิ้น',
      note: 'ผลิตรอบเช้า',
    };

    const result = repository.createFgAllocation(input);
    expect(result.success).toBe(true);
    expect(result.allocation).toBeDefined();

    if (result.allocation) {
      expect(result.allocation.sourceType).toBe(SourceType.FG);
      expect(result.allocation.salesOrderLineId).toBe('sol-1001-1');
      expect(result.allocation.plannedQty).toBe(200);
      expect(result.allocation.fgOutputQty).toBe(200);
      expect(result.allocation.productionDate).toBe('2026-07-21');
    }

    const allocations = repository.listPlanAllocations(draftPlanId);
    expect(allocations).toHaveLength(1);
  });

  it('2. Rejects FG Allocation when fgOutputQty exceeds remaining quantity', () => {
    const inputExceed: CreateFgAllocationInput = {
      planId: draftPlanId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1', // orderedQty = 500
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 600,
      unit: 'ชิ้น',
      plannedUnit: 'ชิ้น',
      fgOutputQty: 600, // Exceeds 500
      fgOutputUnit: 'ชิ้น',
    };

    const result = repository.createFgAllocation(inputExceed);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('fgOutputQty (600) exceeds remaining unallocated quantity (500)');
  });

  it('3. Rejects FG Allocation when PO Line does not belong to specified PO', () => {
    const inputMismatch: CreateFgAllocationInput = {
      planId: draftPlanId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1002-1', // Belongs to so-1002, not so-1001
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 100,
      unit: 'ชิ้น',
      plannedUnit: 'ชิ้น',
      fgOutputQty: 100,
      fgOutputUnit: 'ชิ้น',
    };

    const result = repository.createFgAllocation(inputMismatch);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("SalesOrderLine 'sol-1002-1' does not belong to SalesOrder 'so-1001'");
  });

  it('4. Successfully creates WIP/Prep Allocation with planner-defined quantity', () => {
    const inputWip: CreateWipPrepAllocationInput = {
      planId: draftPlanId,
      wipPrepItemId: 'wip-01',
      productionDate: '2026-07-20',
      roomId: 'R2',
      plannedQty: 150, // Planner defined
      unit: 'กก.',
      plannedUnit: 'กก.',
    };

    const result = repository.createWipPrepAllocation(inputWip);
    expect(result.success).toBe(true);
    expect(result.allocation).toBeDefined();
    if (result.allocation) {
      expect(result.allocation.sourceType).toBe(SourceType.WIP);
      expect(result.allocation.wipPrepItemId).toBe('wip-01');
      expect(result.allocation.plannedQty).toBe(150);
      expect(result.allocation.fgOutputQty).toBeUndefined();
    }
  });

  it('5. Allows the same WIP Item to be allocated multiple times across days/rooms', () => {
    const inputWip1: CreateWipPrepAllocationInput = {
      planId: draftPlanId,
      wipPrepItemId: 'wip-01',
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 100,
      unit: 'กก.',
    };
    const inputWip2: CreateWipPrepAllocationInput = {
      planId: draftPlanId,
      wipPrepItemId: 'wip-01',
      productionDate: '2026-07-21',
      roomId: 'R2',
      plannedQty: 200,
      unit: 'กก.',
    };

    const res1 = repository.createWipPrepAllocation(inputWip1);
    const res2 = repository.createWipPrepAllocation(inputWip2);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(repository.listPlanAllocations(draftPlanId)).toHaveLength(2);
  });

  it('6. Rejects productionDate outside Monday–Saturday range', () => {
    const inputSunday: CreateWipPrepAllocationInput = {
      planId: draftPlanId,
      wipPrepItemId: 'wip-01',
      productionDate: '2026-07-26', // Sunday outside plan week (2026-07-20 to 2026-07-25)
      roomId: 'R1',
      plannedQty: 50,
    };

    const result = repository.createWipPrepAllocation(inputSunday);
    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'productionDate (2026-07-26) must be between plan weekStart (2026-07-20) and weekEnd (2026-07-25)'
    );
  });

  it('7. Rejects invalid roomId (not R1, R2, R3, R4)', () => {
    const inputBadRoom: CreateWipPrepAllocationInput = {
      planId: draftPlanId,
      wipPrepItemId: 'wip-01',
      productionDate: '2026-07-20',
      roomId: 'R99', // Invalid
      plannedQty: 50,
    };

    const result = repository.createWipPrepAllocation(inputBadRoom);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("roomId 'R99' must be one of R1, R2, R3, R4");
  });

  it('8. Rejects adding, updating, or removing allocations in a PUBLISHED plan', () => {
    // Add an initial allocation in draft
    const alloc = repository.createFgAllocation({
      planId: draftPlanId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 200,
      unit: 'ชิ้น',
      plannedUnit: 'ชิ้น',
      fgOutputQty: 200,
      fgOutputUnit: 'ชิ้น',
    });
    const allocId = alloc.allocation!.allocationId;

    // Publish the plan
    repository.publishPlan(draftPlanId);

    // Attempt to add allocation
    const createRes = repository.createFgAllocation({
      planId: draftPlanId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-2',
      productionDate: '2026-07-22',
      roomId: 'R1',
      plannedQty: 100,
      unit: 'ชิ้น',
      plannedUnit: 'ชิ้น',
      fgOutputQty: 100,
      fgOutputUnit: 'ชิ้น',
    });
    expect(createRes.success).toBe(false);
    expect(createRes.errors).toContain('Plan must be in DRAFT status to modify allocations (current status: PUBLISHED)');

    // Attempt to update allocation
    const updateRes = repository.updateAllocation(allocId, { plannedQty: 250 });
    expect(updateRes.success).toBe(false);
    expect(updateRes.errors).toContain('Cannot modify allocation in a PUBLISHED plan');

    // Attempt to remove allocation
    const removeRes = repository.removeAllocation(allocId);
    expect(removeRes.success).toBe(false);
    expect(removeRes.errors).toContain('Cannot remove allocation from a PUBLISHED plan');
  });

  it('9. Updating FG allocation quantity correctly accounts for current allocation quantity', () => {
    // Create initial FG allocation of 300 out of 500 ordered
    const allocRes = repository.createFgAllocation({
      planId: draftPlanId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1', // ordered = 500
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 300,
      unit: 'ชิ้น',
      plannedUnit: 'ชิ้น',
      fgOutputQty: 300,
      fgOutputUnit: 'ชิ้น',
    });
    const allocId = allocRes.allocation!.allocationId;

    // Increasing fgOutputQty from 300 to 500 is allowed (remaining = 200 + current 300 = max 500)
    const updateOk = repository.updateAllocation(allocId, { plannedQty: 500, fgOutputQty: 500 });
    expect(updateOk.success).toBe(true);
    expect(updateOk.allocation?.fgOutputQty).toBe(500);

    // Increasing fgOutputQty to 501 exceeds maximum allowed
    const updateExceed = repository.updateAllocation(allocId, { plannedQty: 501, fgOutputQty: 501 });
    expect(updateExceed.success).toBe(false);
    expect(updateExceed.errors).toContain('fgOutputQty (501) exceeds available remaining quantity (500)');
  });

  it('10. Successfully removes an allocation from a DRAFT plan', () => {
    const allocRes = repository.createFgAllocation({
      planId: draftPlanId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 100,
      unit: 'ชิ้น',
      plannedUnit: 'ชิ้น',
      fgOutputQty: 100,
      fgOutputUnit: 'ชิ้น',
    });
    const allocId = allocRes.allocation!.allocationId;

    expect(repository.listPlanAllocations(draftPlanId)).toHaveLength(1);

    const removeRes = repository.removeAllocation(allocId);
    expect(removeRes.success).toBe(true);
    expect(repository.listPlanAllocations(draftPlanId)).toHaveLength(0);
  });

  it('11. Atomic failure: invalid allocation does NOT modify the database', () => {
    const countBefore = repository.listPlanAllocations(draftPlanId).length;

    const invalidRes = repository.createFgAllocation({
      planId: draftPlanId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 9999, // Exceeds remaining
      unit: 'ชิ้น',
      plannedUnit: 'ชิ้น',
      fgOutputQty: 9999,
      fgOutputUnit: 'ชิ้น',
    });

    expect(invalidRes.success).toBe(false);
    expect(repository.listPlanAllocations(draftPlanId)).toHaveLength(countBefore);
  });
});
