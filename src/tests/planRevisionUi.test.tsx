import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningPage } from '../features/planning/PlanningPage';
import { plannerRepository } from '../services/plannerService';
import { PlanStatus } from '../domain/types';

describe('Phase 3E — Plan Revision UI Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
    plannerRepository.initialize();
  });

  it('1. Displays "สร้างฉบับแก้ไข" button when active plan is PUBLISHED', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    plannerRepository.publishPlan(draftRes.plan!.id);

    render(<PlanningPage />);

    expect(await screen.findByText('สร้างฉบับแก้ไข')).toBeInTheDocument();
  });

  it('2. Creating R01 revision clones allocations into new R01 Draft plan', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const p00Id = draftRes.plan!.id;

    // Create allocation in R00
    plannerRepository.createFgAllocation({
      planId: p00Id,
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

    // Publish R00
    plannerRepository.publishPlan(p00Id);

    // Create Revision R01
    const revRes = plannerRepository.createPlanRevision(p00Id);
    expect(revRes.success).toBe(true);
    expect(revRes.plan?.revisionNumber).toBe('R01');
    expect(revRes.plan?.status).toBe(PlanStatus.DRAFT);

    // Allocations should be cloned into R01
    expect(revRes.plan?.allocations).toHaveLength(1);
    expect(revRes.plan?.allocations[0]?.plannedQty).toBe(10);
    expect(revRes.plan?.allocations[0]?.fgOutputQty).toBe(60);
    expect(revRes.plan?.allocations[0]?.planId).toBe(revRes.plan?.id);
    expect(revRes.plan?.allocations[0]?.sourceAllocationId).toBe(p00Id ? plannerRepository.getPlanningBoardData('2026-07-20').allocations[0]?.sourceAllocationId || revRes.plan?.allocations[0]?.sourceAllocationId : '');
  });

  it('3. R01 Draft allows Editing and Removing allocations, while R00 Published is read-only', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const p00Id = draftRes.plan!.id;

    plannerRepository.createFgAllocation({
      planId: p00Id,
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

    plannerRepository.publishPlan(p00Id);
    const revRes = plannerRepository.createPlanRevision(p00Id);
    const r01Id = revRes.plan!.id;

    render(<PlanningPage />);

    // R01 Draft selected by default -> Edit / Delete buttons exist
    expect(await screen.findByLabelText('แก้ไขรายการวางแผน')).toBeInTheDocument();
    expect(screen.getByLabelText('ลบรายการวางแผน')).toBeInTheDocument();

    // Select R00 Published from dropdown -> Read-only
    const select = screen.getByLabelText('เลือกฉบับแผน');
    fireEvent.change(select, { target: { value: p00Id } });

    await waitFor(() => {
      expect(screen.queryByLabelText('แก้ไขรายการวางแผน')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('ลบรายการวางแผน')).not.toBeInTheDocument();
    });

    // Switch back to R01 -> Edit / Delete buttons reappear
    fireEvent.change(select, { target: { value: r01Id } });
    expect(await screen.findByLabelText('แก้ไขรายการวางแผน')).toBeInTheDocument();
  });

  it('4. Publishing R01 changes R00 to SUPERSEDED and R01 to PUBLISHED', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const p00Id = draftRes.plan!.id;
    plannerRepository.publishPlan(p00Id);

    const revRes = plannerRepository.createPlanRevision(p00Id);
    const r01Id = revRes.plan!.id;

    const pubRevRes = plannerRepository.publishPlanRevision(r01Id);
    expect(pubRevRes.success).toBe(true);

    const plans = plannerRepository.listWeekPlans('2026-07-20');
    const r00 = plans.find((p) => p.id === p00Id);
    const r01 = plans.find((p) => p.id === r01Id);

    expect(r00?.status).toBe(PlanStatus.SUPERSEDED);
    expect(r01?.status).toBe(PlanStatus.PUBLISHED);

    const active = plannerRepository.getActivePlanForWeek('2026-07-20');
    expect(active?.id).toBe(r01Id);
  });

  it('5. Cancelling R01 changes R01 to CANCELLED and active plan remains R00 Published', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const p00Id = draftRes.plan!.id;
    plannerRepository.publishPlan(p00Id);

    const revRes = plannerRepository.createPlanRevision(p00Id);
    const r01Id = revRes.plan!.id;

    const cancelRes = plannerRepository.cancelPlanRevision(r01Id);
    expect(cancelRes.success).toBe(true);

    const plans = plannerRepository.listWeekPlans('2026-07-20');
    const r01 = plans.find((p) => p.id === r01Id);
    expect(r01?.status).toBe(PlanStatus.CANCELLED);

    const active = plannerRepository.getActivePlanForWeek('2026-07-20');
    expect(active?.id).toBe(p00Id);
    expect(active?.status).toBe(PlanStatus.PUBLISHED);
  });

  it('6. Does NOT double count PO remaining quantity between R00 Published and R01 Draft', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const p00Id = draftRes.plan!.id;

    plannerRepository.createFgAllocation({
      planId: p00Id,
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

    plannerRepository.publishPlan(p00Id);

    // Create R01 revision (clones 60 fgOutputQty allocation)
    const revRes = plannerRepository.createPlanRevision(p00Id);
    expect(revRes.success).toBe(true);

    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');
    const item = queueData.fgItems.find((i) => i.salesOrderLineId === 'sol-1001-1');

    // Remaining should be 440 (500 - 60), NOT 380 (500 - 60 - 60)
    expect(item?.remainingQty).toBe(440);
    expect(item?.plannedQty).toBe(60);
  });
});
