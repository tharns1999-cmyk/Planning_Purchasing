import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRepository } from '../services/repositories/LocalStorageRepository';
import { PlanStatus } from '../domain/types';
import { TestIdGenerator, TestClock } from '../utils/idGenerator';

describe('Phase 1E.1 — Weekly Plan Lifecycle Tests', () => {
  let repository: LocalStorageRepository;
  let testIdGen: TestIdGenerator;
  let testClock: TestClock;

  beforeEach(() => {
    localStorage.clear();
    testIdGen = new TestIdGenerator('test');
    testClock = new TestClock('2026-07-20T12:00:00.000Z');
    repository = new LocalStorageRepository('weekly-production-planner-db', testIdGen, testClock);
    repository.initialize();
  });

  it('1. Successfully creates R00 DRAFT plan for a valid Monday weekStart', () => {
    // 2026-07-20 is a Monday
    const result = repository.createDraftPlan('2026-07-20');
    expect(result.success).toBe(true);
    expect(result.plan).toBeDefined();

    if (result.plan) {
      expect(result.plan.id).toBe('plan-0001');
      expect(result.plan.weekStart).toBe('2026-07-20');
      expect(result.plan.weekEnd).toBe('2026-07-25'); // Saturday
      expect(result.plan.revisionNumber).toBe('R00');
      expect(result.plan.status).toBe(PlanStatus.DRAFT);
      expect(result.plan.allocations).toEqual([]);
      expect(result.plan.createdAt).toBe('2026-07-20T12:00:00.000Z');
    }
  });

  it('2. Rejects weekStart if it is not a Monday', () => {
    // 2026-07-22 is a Wednesday
    const result = repository.createDraftPlan('2026-07-22');
    expect(result.success).toBe(false);
    expect(result.errors).toContain('weekStart must be a Monday');
  });

  it('3. Rejects creating duplicate DRAFT plan in the same week', () => {
    const monday = '2026-07-20';
    const firstResult = repository.createDraftPlan(monday);
    expect(firstResult.success).toBe(true);

    const secondResult = repository.createDraftPlan(monday);
    expect(secondResult.success).toBe(false);
    expect(secondResult.errors).toContain('A DRAFT plan already exists for week starting 2026-07-20');
  });

  it('4. Rejects createDraftPlan when a PUBLISHED plan already exists for that week', () => {
    const monday = '2026-07-20';
    const draftResult = repository.createDraftPlan(monday);
    expect(draftResult.success).toBe(true);

    if (draftResult.plan) {
      const pubResult = repository.publishPlan(draftResult.plan.id);
      expect(pubResult.success).toBe(true);
    }

    const newDraftResult = repository.createDraftPlan(monday);
    expect(newDraftResult.success).toBe(false);
    expect(newDraftResult.errors).toContain(
      'A PUBLISHED plan already exists for week starting 2026-07-20. New revision creation must be handled explicitly.'
    );
  });

  it('5. Successfully publishes a DRAFT plan', () => {
    const draftResult = repository.createDraftPlan('2026-07-20');
    expect(draftResult.success).toBe(true);

    if (draftResult.plan) {
      const pubResult = repository.publishPlan(draftResult.plan.id);
      expect(pubResult.success).toBe(true);
      expect(pubResult.plan?.status).toBe(PlanStatus.PUBLISHED);
      expect(pubResult.plan?.publishedAt).toBe('2026-07-20T12:00:00.000Z');
    }
  });

  it('6. Rejects publishing a plan that is not a DRAFT', () => {
    const draftResult = repository.createDraftPlan('2026-07-20');
    expect(draftResult.success).toBe(true);

    if (draftResult.plan) {
      const pubResult = repository.publishPlan(draftResult.plan.id);
      expect(pubResult.success).toBe(true);

      // Attempt second publish
      const rePublishResult = repository.publishPlan(draftResult.plan.id);
      expect(rePublishResult.success).toBe(false);
      expect(rePublishResult.errors).toContain('Only DRAFT plans can be published (current status: PUBLISHED)');
    }
  });

  it('7. Successfully cancels a DRAFT plan and retains record in database', () => {
    const draftResult = repository.createDraftPlan('2026-07-20');
    expect(draftResult.success).toBe(true);

    if (draftResult.plan) {
      const cancelResult = repository.cancelDraftPlan(draftResult.plan.id);
      expect(cancelResult.success).toBe(true);
      expect(cancelResult.plan?.status).toBe(PlanStatus.CANCELLED);
      expect(cancelResult.plan?.cancelledAt).toBe('2026-07-20T12:00:00.000Z');

      // Record is retained in database
      const plansInDb = repository.listWeekPlans('2026-07-20');
      expect(plansInDb).toHaveLength(1);
      expect(plansInDb[0]?.status).toBe(PlanStatus.CANCELLED);

      // Active plan becomes null
      const activePlan = repository.getActivePlanForWeek('2026-07-20');
      expect(activePlan).toBeNull();
    }
  });

  it('8. Rejects cancelling a PUBLISHED plan', () => {
    const draftResult = repository.createDraftPlan('2026-07-20');
    expect(draftResult.success).toBe(true);

    if (draftResult.plan) {
      repository.publishPlan(draftResult.plan.id);

      const cancelResult = repository.cancelDraftPlan(draftResult.plan.id);
      expect(cancelResult.success).toBe(false);
      expect(cancelResult.errors).toContain('Only DRAFT plans can be cancelled (current status: PUBLISHED)');
    }
  });

  it('9. getActivePlanForWeek selects DRAFT over PUBLISHED and returns null when only CANCELLED exist', () => {
    const monday = '2026-07-20';
    expect(repository.getActivePlanForWeek(monday)).toBeNull();

    const draftResult = repository.createDraftPlan(monday);
    expect(repository.getActivePlanForWeek(monday)?.id).toBe(draftResult.plan?.id);
    expect(repository.getActivePlanForWeek(monday)?.status).toBe(PlanStatus.DRAFT);

    repository.publishPlan(draftResult.plan!.id);
    expect(repository.getActivePlanForWeek(monday)?.status).toBe(PlanStatus.PUBLISHED);
  });

  it('10. Atomic failure: invalid weekStart does NOT alter the database', () => {
    const countBefore = repository.listWeekPlans('2026-07-20').length;

    const result = repository.createDraftPlan('2026-07-22'); // Wednesday
    expect(result.success).toBe(false);

    const countAfter = repository.listWeekPlans('2026-07-20').length;
    expect(countAfter).toBe(countBefore);
  });
});
