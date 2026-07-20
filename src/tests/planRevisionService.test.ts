import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRepository } from '../services/repositories/LocalStorageRepository';
import { PlanStatus } from '../domain/types';
import { TestIdGenerator, TestClock } from '../utils/idGenerator';
import { calculateActivePlannedQtyForLine, calculateRemainingQty } from '../domain/calculations';

describe('Phase 1E.3 — Plan Revision Service Tests', () => {
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

  it('1. Successfully creates R01 DRAFT revision from R00 PUBLISHED plan', () => {
    // 1. Create R00 Draft
    const draftRes = repository.createDraftPlan(monday);
    const r00PlanId = draftRes.plan!.id;

    // 2. Add an allocation to R00
    const allocRes = repository.createFgAllocation({
      planId: r00PlanId,
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
    const r00AllocId = allocRes.allocation!.allocationId;

    // 3. Publish R00
    repository.publishPlan(r00PlanId);

    // 4. Create R01 Revision
    const revRes = repository.createPlanRevision(r00PlanId);
    expect(revRes.success).toBe(true);
    expect(revRes.plan).toBeDefined();

    if (revRes.plan) {
      expect(revRes.plan.revisionNumber).toBe('R01');
      expect(revRes.plan.status).toBe(PlanStatus.DRAFT);
      expect(revRes.plan.sourcePlanId).toBe(r00PlanId);
      expect(revRes.plan.allocations).toHaveLength(1);

      const clonedAlloc = revRes.plan.allocations[0]!;
      expect(clonedAlloc.allocationId).not.toBe(r00AllocId);
      expect(clonedAlloc.sourceAllocationId).toBe(r00AllocId);
      expect(clonedAlloc.planId).toBe(revRes.plan.id);
      expect(clonedAlloc.plannedQty).toBe(200);
    }
  });

  it('2. Clones all allocations with new IDs and correct sourceAllocationId', () => {
    const draftRes = repository.createDraftPlan(monday);
    const r00Id = draftRes.plan!.id;

    repository.createFgAllocation({
      planId: r00Id,
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

    repository.createWipPrepAllocation({
      planId: r00Id,
      wipPrepItemId: 'wip-01',
      productionDate: '2026-07-22',
      roomId: 'R2',
      plannedQty: 50,
    });

    repository.publishPlan(r00Id);

    const r01Res = repository.createPlanRevision(r00Id);
    expect(r01Res.success).toBe(true);
    const r01Allocations = r01Res.plan!.allocations;

    expect(r01Allocations).toHaveLength(2);
    expect(r01Allocations[0]!.sourceAllocationId).toBeDefined();
    expect(r01Allocations[1]!.sourceAllocationId).toBeDefined();
    expect(r01Allocations[0]!.allocationId).not.toBe(r01Allocations[0]!.sourceAllocationId);
  });

  it('3. Rejects creating revision from DRAFT, SUPERSEDED, or CANCELLED plans', () => {
    // Draft plan
    const draftRes = repository.createDraftPlan(monday);
    const draftId = draftRes.plan!.id;

    const revFromDraft = repository.createPlanRevision(draftId);
    expect(revFromDraft.success).toBe(false);
    expect(revFromDraft.errors).toContain('Revisions can only be created from a PUBLISHED plan (current status: DRAFT)');

    // Cancelled plan
    repository.cancelDraftPlan(draftId);
    const revFromCancelled = repository.createPlanRevision(draftId);
    expect(revFromCancelled.success).toBe(false);
    expect(revFromCancelled.errors).toContain('Revisions can only be created from a PUBLISHED plan (current status: CANCELLED)');
  });

  it('4. Rejects creating revision from a PUBLISHED plan that is not the latest published revision', () => {
    // R00 Draft -> Publish R00
    const draft0 = repository.createDraftPlan(monday);
    const r00Id = draft0.plan!.id;
    repository.publishPlan(r00Id);

    // Create R01 Revision -> Publish R01
    const rev1 = repository.createPlanRevision(r00Id);
    const r01Id = rev1.plan!.id;
    repository.publishPlanRevision(r01Id);

    // Attempt to create revision from superseded R00
    const revFromR00 = repository.createPlanRevision(r00Id);
    expect(revFromR00.success).toBe(false);
    expect(revFromR00.errors).toContain('Revisions can only be created from a PUBLISHED plan (current status: SUPERSEDED)');
  });

  it('5. Rejects creating revision when a DRAFT plan already exists for that week', () => {
    const draft0 = repository.createDraftPlan(monday);
    const r00Id = draft0.plan!.id;
    repository.publishPlan(r00Id);

    // Create R01 Draft
    repository.createPlanRevision(r00Id);

    // Attempt to create another revision while R01 Draft is active
    const secondRev = repository.createPlanRevision(r00Id);
    expect(secondRev.success).toBe(false);
    expect(secondRev.errors).toContain('A DRAFT plan already exists for week starting 2026-07-20');
  });

  it('6. Publishing R01 changes R01 to PUBLISHED and R00 to SUPERSEDED atomically', () => {
    const draft0 = repository.createDraftPlan(monday);
    const r00Id = draft0.plan!.id;
    repository.publishPlan(r00Id);

    const rev1 = repository.createPlanRevision(r00Id);
    const r01Id = rev1.plan!.id;

    const pubRes = repository.publishPlanRevision(r01Id);
    expect(pubRes.success).toBe(true);
    expect(pubRes.plan?.status).toBe(PlanStatus.PUBLISHED);

    // Check R00 is now SUPERSEDED
    const plans = repository.listWeekPlans(monday);
    const r00Plan = plans.find((p) => p.id === r00Id);
    expect(r00Plan?.status).toBe(PlanStatus.SUPERSEDED);
  });

  it('7. Cancelling R01 changes R01 to CANCELLED while R00 remains PUBLISHED', () => {
    const draft0 = repository.createDraftPlan(monday);
    const r00Id = draft0.plan!.id;
    repository.publishPlan(r00Id);

    const rev1 = repository.createPlanRevision(r00Id);
    const r01Id = rev1.plan!.id;

    const cancelRes = repository.cancelPlanRevision(r01Id);
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.plan?.status).toBe(PlanStatus.CANCELLED);

    const plans = repository.listWeekPlans(monday);
    const r00Plan = plans.find((p) => p.id === r00Id);
    expect(r00Plan?.status).toBe(PlanStatus.PUBLISHED);

    // Active plan falls back to R00
    const activePlan = repository.getActivePlanForWeek(monday);
    expect(activePlan?.id).toBe(r00Id);
    expect(activePlan?.status).toBe(PlanStatus.PUBLISHED);
  });

  it('8. Remaining Quantity is accurately calculated without double-counting across revisions', () => {
    const lineId = 'sol-1001-1'; // ordered = 500

    // 1. Create R00 Draft with 200 allocated
    const d0 = repository.createDraftPlan(monday);
    const r00Id = d0.plan!.id;
    repository.createFgAllocation({
      planId: r00Id,
      salesOrderId: 'so-1001',
      salesOrderLineId: lineId,
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 200,
      unit: 'ชิ้น',
      plannedUnit: 'ชิ้น',
      fgOutputQty: 200,
      fgOutputUnit: 'ชิ้น',
    });
    repository.publishPlan(r00Id);

    // Active plan is R00 PUBLISHED (planned = 200, remaining = 300)
    let db = repository.getSnapshot();
    let activePlanned = calculateActivePlannedQtyForLine(lineId, db.entities.weeklyPlans);
    expect(activePlanned).toBe(200);
    expect(calculateRemainingQty(500, 0, activePlanned)).toBe(300);

    // 2. Create R01 Draft (cloned 200 allocated) -> Update R01 allocation to 350
    const rev1 = repository.createPlanRevision(r00Id);
    const r01Id = rev1.plan!.id;
    const r01AllocId = rev1.plan!.allocations[0]!.allocationId;

    repository.updateAllocation(r01AllocId, { plannedQty: 350, fgOutputQty: 350 });

    // Active plan is now R01 DRAFT (planned = 350, remaining = 150)
    db = repository.getSnapshot();
    activePlanned = calculateActivePlannedQtyForLine(lineId, db.entities.weeklyPlans);
    expect(activePlanned).toBe(350); // Does NOT double count R00 + R01 (200 + 350)!
    expect(calculateRemainingQty(500, 0, activePlanned)).toBe(150);

    // 3. Publish R01 -> R00 is SUPERSEDED, R01 is PUBLISHED
    repository.publishPlanRevision(r01Id);
    db = repository.getSnapshot();
    activePlanned = calculateActivePlannedQtyForLine(lineId, db.entities.weeklyPlans);
    expect(activePlanned).toBe(350);
    expect(calculateRemainingQty(500, 0, activePlanned)).toBe(150);
  });

  it('9. Atomic failure: failed revision creation does NOT alter the database', () => {
    const plansBefore = repository.listWeekPlans(monday).length;

    // Invalid non-existent plan ID
    const result = repository.createPlanRevision('non-existent-id');
    expect(result.success).toBe(false);

    const plansAfter = repository.listWeekPlans(monday).length;
    expect(plansAfter).toBe(plansBefore);
  });
});
