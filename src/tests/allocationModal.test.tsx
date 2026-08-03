import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AllocationModal } from '@/features/production/planning/AllocationModal';
import { plannerRepository } from '../services/plannerService';
import { Priority, DueStatus } from '../domain/types';
import { PlanningQueueFgItem } from '../services/repositories/PlannerRepository';

describe('Phase 3C.1 — Fix FG Output Qty Deduction Rule Tests', () => {
  const sampleTarget = {
    productionDate: '2026-07-20',
    roomId: 'R1',
    roomName: 'ห้องขนม 1',
  };

  const sampleFgItem: PlanningQueueFgItem = {
    salesOrderId: 'so-1001',
    salesOrderLineId: 'sol-1001-1',
    poNumber: 'PO-2026-001',
    customerName: 'บริษัท อิ่มอร่อย พลาซ่า จำกัด',
    productCode: 'SKU-BAK-001',
    productName: 'พายไก่ไข่เค็ม 120g',
    orderedQty: 500,
    plannedQty: 0,
    remainingQty: 500,
    unit: 'ชิ้น',
    dueDate: '2026-07-22',
    priority: Priority.URGENT,
    dueStatus: DueStatus.DUE_SOON,
    planningStatus: 'UNPLANNED',
  };

  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
    plannerRepository.initialize();
  });

  it('1. Rejects FG Allocation when fgOutputQty is missing', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    expect(draftRes.success).toBe(true);
    const planId = draftRes.plan!.id;

    // Call createFgAllocation without fgOutputQty
    const res = plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: undefined as unknown as number,
      fgOutputUnit: 'ชิ้น',
    });

    expect(res.success).toBe(false);
    expect(res.errors).toContain('fgOutputQty is required for FG allocations');
  });

  it('2. Uses fgOutputQty exclusively for remaining quantity deduction (plannedQty = 10 ชุด, fgOutputQty = 60 ชิ้น -> remaining = 440)', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    const res = plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 60,
      fgOutputUnit: 'ชิ้น',
    });

    expect(res.success).toBe(true);

    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');
    const lineItem = queueData.fgItems.find((i) => i.salesOrderLineId === 'sol-1001-1');

    // Ordered 500 - fgOutputQty 60 = 440 (NOT 500 - plannedQty 10 = 490!)
    expect(lineItem?.remainingQty).toBe(440);
    expect(lineItem?.plannedQty).toBe(60);
  });

  it('3. Rejects FG allocation when fgOutputQty exceeds remaining quantity', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    const res = plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 600, // Remaining is 500
      fgOutputUnit: 'ชิ้น',
    });

    expect(res.success).toBe(false);
    expect(res.errors).toContain('fgOutputQty (600) exceeds remaining unallocated quantity (500)');
  });

  it('4. Saves WIP/PREP allocation successfully without fgOutputQty', () => {
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

    expect(wipRes.success).toBe(true);
    expect(wipRes.allocation?.plannedQty).toBe(5);
    expect(wipRes.allocation?.plannedUnit).toBe('หม้อ');
    expect(wipRes.allocation?.fgOutputQty).toBeUndefined();
  });

  it('5. Renders FG Allocation Modal and submits valid fgOutputQty & plannedQty', () => {
    const handleConfirm = vi.fn();

    render(
      <AllocationModal
        isOpen={true}
        onClose={vi.fn()}
        targetCell={sampleTarget}
        fgItem={sampleFgItem}
        wipPrepItem={null}
        onConfirmFg={handleConfirm}
        onConfirmWipPrep={vi.fn()}
      />
    );

    const plannedQtyInput = screen.getByPlaceholderText('เช่น 10');
    const fgOutputQtyInput = screen.getByPlaceholderText('เช่น 60');

    fireEvent.change(plannedQtyInput, { target: { value: '10' } });
    fireEvent.change(fgOutputQtyInput, { target: { value: '60' } });

    fireEvent.click(screen.getByText('บันทึกรายการ'));

    expect(handleConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        plannedQty: 10,
        plannedUnit: 'ชุด',
        fgOutputQty: 60,
        fgOutputUnit: 'ชิ้น',
        note: undefined,
      })
    );
  });

  it('6. Removes FG card from Queue when remainingQty reaches 0', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 50,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 500,
      fgOutputUnit: 'ชิ้น',
    });

    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');
    const lineItem = queueData.fgItems.find((i) => i.salesOrderLineId === 'sol-1001-1');
    expect(lineItem).toBeUndefined();
  });
});
