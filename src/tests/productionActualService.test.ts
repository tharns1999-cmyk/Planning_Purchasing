import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRepository } from '../services/repositories/LocalStorageRepository';
import { ActualEntryType, ProductionStatus } from '../domain/types';
import { TestIdGenerator, TestClock } from '../utils/idGenerator';
import { AppendProductionActualInput } from '../services/repositories/PlannerRepository';

describe('Phase 1F — Production Actual Service Tests', () => {
  let repository: LocalStorageRepository;
  let testIdGen: TestIdGenerator;
  let testClock: TestClock;
  let publishedPlanId: string;
  let draftPlanId: string;
  let allocId: string;

  const monday = '2026-07-20';

  beforeEach(() => {
    localStorage.clear();
    testIdGen = new TestIdGenerator('test');
    testClock = new TestClock('2026-07-20T12:00:00.000Z');
    repository = new LocalStorageRepository('weekly-production-planner-db', testIdGen, testClock);
    repository.initialize();

    // Setup: Create DRAFT plan, add FG Allocation (plannedQty = 500), then PUBLISH plan
    const draftRes = repository.createDraftPlan(monday);
    draftPlanId = draftRes.plan!.id;

    const allocRes = repository.createFgAllocation({
      planId: draftPlanId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 500,
      unit: 'ชิ้น',
      plannedUnit: 'ชิ้น',
      fgOutputQty: 500,
      fgOutputUnit: 'ชิ้น',
    });
    allocId = allocRes.allocation!.allocationId;

    const pubRes = repository.publishPlan(draftPlanId);
    publishedPlanId = pubRes.plan!.id;
  });

  it('1. Successfully appends a PARTIAL actual entry to allocation in PUBLISHED plan', () => {
    const input: AppendProductionActualInput = {
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 200,
      wasteQty: 10,
      reworkQty: 5,
      shortfallQty: 0,
      recordedBy: 'ช่างเครื่อง A',
    };

    const result = repository.appendProductionActual(input);
    expect(result.success).toBe(true);
    expect(result.actualEntry).toBeDefined();

    if (result.actualEntry) {
      expect(result.actualEntry.actualEntryId).toBeDefined();
      expect(result.actualEntry.entryType).toBe(ActualEntryType.PARTIAL);
      expect(result.actualEntry.goodQty).toBe(200);
      expect(result.actualEntry.recordedBy).toBe('ช่างเครื่อง A');
    }

    const actuals = repository.listProductionActuals(allocId);
    expect(actuals).toHaveLength(1);
  });

  it('2. Allows multiple PARTIAL actual entries prior to FINAL entry', () => {
    repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 150,
      wasteQty: 5,
      reworkQty: 0,
      shortfallQty: 0,
    });

    repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 150,
      wasteQty: 5,
      reworkQty: 0,
      shortfallQty: 0,
    });

    const actuals = repository.listProductionActuals(allocId);
    expect(actuals).toHaveLength(2);

    const summary = repository.getAllocationActualSummary(allocId);
    expect(summary?.totalGoodQty).toBe(300);
    expect(summary?.status).toBe(ProductionStatus.IN_PROGRESS);
  });

  it('3. Successfully appends FINAL actual entry and derives COMPLETED status', () => {
    repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 250,
      wasteQty: 5,
      reworkQty: 0,
      shortfallQty: 0,
    });

    const finalRes = repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.FINAL,
      goodQty: 250,
      wasteQty: 5,
      reworkQty: 0,
      shortfallQty: 0,
    });

    expect(finalRes.success).toBe(true);

    const summary = repository.getAllocationActualSummary(allocId);
    expect(summary?.totalGoodQty).toBe(500);
    expect(summary?.status).toBe(ProductionStatus.COMPLETED);
    expect(summary?.remainingToProduce).toBe(0);
  });

  it('4. Rejects any actual entry after a FINAL entry has been recorded', () => {
    repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.FINAL,
      goodQty: 500,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 0,
    });

    const resultAfterFinal = repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 50,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 0,
    });

    expect(resultAfterFinal.success).toBe(false);
    expect(resultAfterFinal.errors).toContain('Allocation already has a FINAL actual entry. No further entries allowed.');
  });

  it('5. Rejects appending actual entry to an allocation in a DRAFT plan', () => {
    // Create new DRAFT plan with allocation
    const draft2 = repository.createDraftPlan('2026-07-27'); // next week
    const draftId2 = draft2.plan!.id;

    const alloc2 = repository.createFgAllocation({
      planId: draftId2,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-2',
      productionDate: '2026-07-28',
      roomId: 'R1',
      plannedQty: 100,
      unit: 'ชิ้น',
      plannedUnit: 'ชิ้น',
      fgOutputQty: 100,
      fgOutputUnit: 'ชิ้น',
    });
    const draftAllocId = alloc2.allocation!.allocationId;

    const result = repository.appendProductionActual({
      allocationId: draftAllocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 50,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 0,
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Actual entries can only be appended to allocations in a PUBLISHED plan (current plan status: DRAFT)');
  });

  it('6. Rejects appending actual entry to an allocation in a CANCELLED or SUPERSEDED plan directly', () => {
    // Create R01 Revision from published plan -> R00 becomes SUPERSEDED
    const revRes = repository.createPlanRevision(publishedPlanId);
    const r01Id = revRes.plan!.id;
    repository.publishPlanRevision(r01Id); // R00 is now SUPERSEDED

    // Attempt actual on allocId from R00
    const resultSuperseded = repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 50,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 0,
    });

    expect(resultSuperseded.success).toBe(false);
    expect(resultSuperseded.errors).toContain('Actual entries can only be appended to allocations in a PUBLISHED plan (current plan status: SUPERSEDED)');
  });

  it('7. Rejects negative quantities, NaN, or total quantity sum = 0', () => {
    const resNegative = repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: -10,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 0,
    });
    expect(resNegative.success).toBe(false);
    expect(resNegative.errors).toContain('Quantities (goodQty, wasteQty, reworkQty, shortfallQty) must be finite non-negative numbers (>= 0)');

    const resZeroSum = repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 0,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 0,
    });
    expect(resZeroSum.success).toBe(false);
    expect(resZeroSum.errors).toContain('Sum of goodQty, wasteQty, reworkQty, and shortfallQty must be greater than 0');
  });

  it('8. Requires shortfallReason when FINAL entry has shortfallQty > 0', () => {
    const resNoReason = repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.FINAL,
      goodQty: 400,
      wasteQty: 10,
      reworkQty: 0,
      shortfallQty: 90,
    });
    expect(resNoReason.success).toBe(false);
    expect(resNoReason.errors).toContain('FINAL entry with shortfallQty > 0 requires a shortfallReason');

    const resWithReason = repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.FINAL,
      goodQty: 400,
      wasteQty: 10,
      reworkQty: 0,
      shortfallQty: 90,
      shortfallReason: 'เครื่องจักรในห้อง R1 ขัดข้อง',
    });
    expect(resWithReason.success).toBe(true);

    const summary = repository.getAllocationActualSummary(allocId);
    expect(summary?.status).toBe(ProductionStatus.CLOSED_SHORTFALL);
    expect(summary?.remainingToProduce).toBe(100);
  });

  it('9. Correctly calculates summary totals and status derivation', () => {
    // Initial summary before actuals
    const summaryInitial = repository.getAllocationActualSummary(allocId);
    expect(summaryInitial?.plannedQty).toBe(500);
    expect(summaryInitial?.totalGoodQty).toBe(0);
    expect(summaryInitial?.status).toBe(ProductionStatus.NOT_STARTED);

    // Append Partial 1
    repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 200,
      wasteQty: 15,
      reworkQty: 5,
      shortfallQty: 0,
    });

    // Append Partial 2
    repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 250,
      wasteQty: 10,
      reworkQty: 10,
      shortfallQty: 0,
    });

    const summaryPartial = repository.getAllocationActualSummary(allocId);
    expect(summaryPartial?.totalGoodQty).toBe(450);
    expect(summaryPartial?.totalWasteQty).toBe(25);
    expect(summaryPartial?.totalReworkQty).toBe(15);
    expect(summaryPartial?.remainingToProduce).toBe(50);
    expect(summaryPartial?.status).toBe(ProductionStatus.IN_PROGRESS);
  });

  it('10. Atomic failure: failed append does NOT modify database or state', () => {
    const actualsBefore = repository.listProductionActuals(allocId).length;

    const invalidRes = repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.FINAL,
      goodQty: 100,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 400, // missing shortfallReason
    });

    expect(invalidRes.success).toBe(false);
    const actualsAfter = repository.listProductionActuals(allocId).length;
    expect(actualsAfter).toBe(actualsBefore);
  });
});
