import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningPage } from '../features/planning/PlanningPage';
import { plannerRepository } from '../services/plannerService';

describe('Phase 3D — Edit / Remove Allocation UI Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
    plannerRepository.initialize();
  });

  it('1. Displays Edit and Remove buttons on Board allocation cards when plan is DRAFT', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    expect(draftRes.success).toBe(true);
    const planId = draftRes.plan!.id;

    // Create an FG allocation
    plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 60,
      fgOutputUnit: 'ชิ้น',
    });

    render(<PlanningPage />);

    expect(await screen.findByLabelText('แก้ไขรายการวางแผน')).toBeInTheDocument();
    expect(screen.getByLabelText('ลบรายการวางแผน')).toBeInTheDocument();
  });

  it('2. Does NOT display Edit and Remove buttons when plan is PUBLISHED', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 60,
      fgOutputUnit: 'ชิ้น',
    });

    // Publish the plan
    plannerRepository.publishPlan(planId);

    render(<PlanningPage />);

    await waitFor(() => {
      expect(screen.getByText('ประกาศใช้แล้ว')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('แก้ไขรายการวางแผน')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ลบรายการวางแผน')).not.toBeInTheDocument();
  });

  it('3. Edits FG Allocation and updates remainingQty correctly based on fgOutputQty', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    const allocRes = plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1', // ordered = 500
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 60,
      fgOutputUnit: 'ชิ้น',
    });

    const allocId = allocRes.allocation!.allocationId;

    // Update fgOutputQty from 60 to 100
    const updateRes = plannerRepository.updateAllocation(allocId, {
      plannedQty: 15,
      plannedUnit: 'ชุด',
      fgOutputQty: 100,
      fgOutputUnit: 'ชิ้น',
    });

    expect(updateRes.success).toBe(true);

    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');
    const item = queueData.fgItems.find((i) => i.salesOrderLineId === 'sol-1001-1');

    // 500 ordered - 100 fgOutputQty = 400 remaining
    expect(item?.remainingQty).toBe(400);
    expect(item?.plannedQty).toBe(100);
  });

  it('4. Rejects editing FG Allocation when fgOutputQty exceeds remaining quantity plus existing allocation quantity', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    const allocRes = plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1', // ordered = 500
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 60,
      fgOutputUnit: 'ชิ้น',
    });

    const allocId = allocRes.allocation!.allocationId;

    // Updating fgOutputQty to 600 (exceeds max allowed 500)
    const updateRes = plannerRepository.updateAllocation(allocId, {
      fgOutputQty: 600,
    });

    expect(updateRes.success).toBe(false);
    expect(updateRes.errors).toContain('fgOutputQty (600) exceeds available remaining quantity (500)');
  });

  it('5. Edits WIP Allocation without fgOutputQty restriction', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    const wipRes = plannerRepository.createWipPrepAllocation({
      planId,
      wipPrepItemId: 'wip-01',
      productionDate: '2026-07-20',
      roomId: 'R2',
      plannedQty: 5,
      unit: 'หม้อ',
      plannedUnit: 'หม้อ',
    });

    const allocId = wipRes.allocation!.allocationId;

    const updateRes = plannerRepository.updateAllocation(allocId, {
      plannedQty: 12,
      plannedUnit: 'ถาด',
      roomId: 'R3',
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.allocation?.plannedQty).toBe(12);
    expect(updateRes.allocation?.plannedUnit).toBe('ถาด');
    expect(updateRes.allocation?.roomId).toBe('R3');
  });

  it('6. Removes FG Allocation and restores remainingQty to Planning Queue', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    const allocRes = plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1', // ordered = 500
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 60,
      fgOutputUnit: 'ชิ้น',
    });

    const allocId = allocRes.allocation!.allocationId;

    // Remove allocation
    const removeRes = plannerRepository.removeAllocation(allocId);
    expect(removeRes.success).toBe(true);

    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');
    const item = queueData.fgItems.find((i) => i.salesOrderLineId === 'sol-1001-1');

    // Restores full 500 remainingQty
    expect(item?.remainingQty).toBe(500);
    expect(item?.plannedQty).toBe(0);
  });

  it('7. Removes WIP Allocation from Board', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    const wipRes = plannerRepository.createWipPrepAllocation({
      planId,
      wipPrepItemId: 'wip-01',
      productionDate: '2026-07-20',
      roomId: 'R2',
      plannedQty: 5,
      unit: 'หม้อ',
    });

    const allocId = wipRes.allocation!.allocationId;

    const removeRes = plannerRepository.removeAllocation(allocId);
    expect(removeRes.success).toBe(true);

    const boardData = plannerRepository.getPlanningBoardData('2026-07-20');
    expect(boardData.allocations).toHaveLength(0);
  });

  it('8. Does NOT remove allocation when Confirm Remove Modal is cancelled', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 60,
      fgOutputUnit: 'ชิ้น',
    });

    render(<PlanningPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('ลบรายการวางแผน')).toBeInTheDocument();
    });

    // Click remove button to open Confirm Modal
    fireEvent.click(screen.getByLabelText('ลบรายการวางแผน'));

    expect(screen.getByText('ลบรายการวางแผน')).toBeInTheDocument();
    expect(screen.getByText('ต้องการลบรายการนี้ออกจากแผนใช่หรือไม่')).toBeInTheDocument();

    // Click Cancel button in Modal
    fireEvent.click(screen.getByText('ยกเลิก'));

    // Allocation should still exist in database
    const boardData = plannerRepository.getPlanningBoardData('2026-07-20');
    expect(boardData.allocations).toHaveLength(1);
  });
});
