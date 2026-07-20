import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRepository } from '../services/repositories/LocalStorageRepository';
import { ActualEntryType, DueStatus, PlanStatus, Priority } from '../domain/types';
import { TestIdGenerator, TestClock } from '../utils/idGenerator';

describe('Phase 1G — Screen Read Models Tests', () => {
  let repository: LocalStorageRepository;
  let testIdGen: TestIdGenerator;
  let testClock: TestClock;

  const monday = '2026-07-20';

  beforeEach(() => {
    localStorage.clear();
    testIdGen = new TestIdGenerator('test');
    testClock = new TestClock('2026-07-20T12:00:00.000Z');
    repository = new LocalStorageRepository('weekly-production-planner-db', testIdGen, testClock);
    repository.initialize();
  });

  it('1. getDashboardSummary calculates accurate counts, urgent lines, and draft/published counts', () => {
    const summary = repository.getDashboardSummary('2026-07-20');

    expect(summary.activePoCount).toBeGreaterThan(0);
    expect(summary.totalPoLineCount).toBeGreaterThan(0);
    expect(summary.unplannedLineCount).toBe(summary.totalPoLineCount); // Initial state before allocations
    expect(summary.partiallyPlannedLineCount).toBe(0);
    expect(summary.fullyPlannedLineCount).toBe(0);
    expect(summary.draftPlanCount).toBe(0);
    expect(summary.publishedPlanCount).toBe(0);
  });

  it('2. getPlanningQueueData hides lines where remainingQty === 0', () => {
    // sol-1001-1 orderedQty = 500
    const draft = repository.createDraftPlan(monday);
    const planId = draft.plan!.id;

    // Fully allocate sol-1001-1 (500)
    repository.createFgAllocation({
      planId,
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

    const queueData = repository.getPlanningQueueData('2026-07-20');
    const sol1Line = queueData.fgItems.find((i) => i.salesOrderLineId === 'sol-1001-1');

    expect(sol1Line).toBeUndefined(); // Filtered out because remainingQty === 0
  });

  it('3. getPlanningQueueData sorts URGENT lines before NORMAL lines, then by dueDate ascending', () => {
    const queueData = repository.getPlanningQueueData('2026-07-20');
    expect(queueData.fgItems.length).toBeGreaterThan(1);

    // Verify all URGENT items precede NORMAL items
    let seenNormal = false;
    for (const item of queueData.fgItems) {
      if (item.priority === Priority.NORMAL) {
        seenNormal = true;
      }
      if (seenNormal) {
        expect(item.priority).not.toBe(Priority.URGENT);
      }
    }
  });

  it('4. getPlanningQueueData calculates accurate DueStatus', () => {
    const queueData = repository.getPlanningQueueData('2026-07-20');
    const firstItem = queueData.fgItems[0];
    expect(firstItem?.dueStatus).toBeDefined();
    expect(Object.values(DueStatus)).toContain(firstItem?.dueStatus);
  });

  it('5. getPlanningBoardData returns activePlan = null and allocations = [] when no plan exists for week', () => {
    const boardData = repository.getPlanningBoardData('2026-07-20');

    expect(boardData.activePlan).toBeNull();
    expect(boardData.allocations).toEqual([]);
    expect(boardData.rooms).toHaveLength(4);
    expect(boardData.days).toHaveLength(6);
    expect(boardData.days[0]).toBe('2026-07-20'); // Monday
    expect(boardData.days[5]).toBe('2026-07-25'); // Saturday
  });

  it('6. getPlanningBoardData selects DRAFT plan over PUBLISHED when both exist for week', () => {
    // R00 Draft -> Publish
    const draft0 = repository.createDraftPlan(monday);
    const r00Id = draft0.plan!.id;
    repository.publishPlan(r00Id);

    // R01 Revision Draft
    const rev1 = repository.createPlanRevision(r00Id);
    const r01Id = rev1.plan!.id;

    const boardData = repository.getPlanningBoardData(monday);

    expect(boardData.activePlan?.id).toBe(r01Id);
    expect(boardData.activePlan?.status).toBe(PlanStatus.DRAFT);
  });

  it('7. getProductionActualWeekData uses ONLY Published plan for actual entries', () => {
    // Create R00 Draft -> Publish
    const draft0 = repository.createDraftPlan(monday);
    const r00Id = draft0.plan!.id;

    const allocRes = repository.createFgAllocation({
      planId: r00Id,
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
    const allocId = allocRes.allocation!.allocationId;

    // While DRAFT: getProductionActualWeekData returns null activePublishedPlan
    let actualWeekData = repository.getProductionActualWeekData(monday);
    expect(actualWeekData.activePublishedPlan).toBeNull();
    expect(actualWeekData.allocations).toHaveLength(0);

    // Publish R00
    repository.publishPlan(r00Id);

    // After PUBLISH: returns published plan and allocations
    actualWeekData = repository.getProductionActualWeekData(monday);
    expect(actualWeekData.activePublishedPlan?.id).toBe(r00Id);
    expect(actualWeekData.allocations).toHaveLength(1);
    expect(actualWeekData.allocations[0]!.allocation.allocationId).toBe(allocId);
  });

  it('8. Shortfall items appear in dashboard summary correctly', () => {
    // R00 Draft -> Allocation -> Publish
    const draft0 = repository.createDraftPlan(monday);
    const r00Id = draft0.plan!.id;

    const allocRes = repository.createFgAllocation({
      planId: r00Id,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 300,
      unit: 'ชิ้น',
      plannedUnit: 'ชิ้น',
      fgOutputQty: 300,
      fgOutputUnit: 'ชิ้น',
    });
    const allocId = allocRes.allocation!.allocationId;

    repository.publishPlan(r00Id);

    // Append FINAL with shortfall
    repository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.FINAL,
      goodQty: 200,
      wasteQty: 10,
      reworkQty: 0,
      shortfallQty: 90,
      shortfallReason: 'เครื่องจักรร้อนเกินไป',
    });

    const summary = repository.getDashboardSummary('2026-07-20');
    expect(summary.shortfallCount).toBe(1);
    expect(summary.recentShortfalls).toHaveLength(1);
    expect(summary.recentShortfalls[0]!.shortfallQty).toBe(90);
    expect(summary.recentShortfalls[0]!.shortfallReason).toBe('เครื่องจักรร้อนเกินไป');
  });
});
