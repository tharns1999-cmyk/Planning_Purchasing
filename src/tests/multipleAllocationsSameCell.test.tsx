import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LocalStorageRepository } from '@/services/repositories/LocalStorageRepository';
import { PlanningPage } from '@/features/production/planning/PlanningPage';

describe('BUG FIX — Multiple Allocations in Same Cell Tests', () => {
  let repository: LocalStorageRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageRepository();
    repository.initialize();
  });

  it('1. สามารถลง FG 2 รายการในวันและห้องเดียวกันได้ โดยไม่เขียนทับกัน', () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = repository.getPlanningQueueData('2026-07-20');
    const fgItem1 = queue.fgItems[0]!;
    const fgItem2 = queue.fgItems[1]!;

    // Add 1st FG Allocation to Mon (2026-07-20) / Room 1 (R1)
    const allocRes1 = repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem1.salesOrderId,
      salesOrderLineId: fgItem1.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: fgItem1.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 50,
      fgOutputUnit: fgItem1.unit,
    });
    expect(allocRes1.success).toBe(true);

    // Add 2nd FG Allocation to SAME Mon (2026-07-20) / Room 1 (R1)
    const allocRes2 = repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem2.salesOrderId,
      salesOrderLineId: fgItem2.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 5,
      unit: fgItem2.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 30,
      fgOutputUnit: fgItem2.unit,
    });
    expect(allocRes2.success).toBe(true);

    // Check plan allocations
    const activePlan = repository.getActivePlanForWeek('2026-07-20')!;
    const cellAllocations = activePlan.allocations.filter(
      (a) => a.productionDate === '2026-07-20' && a.roomId === 'R1'
    );

    expect(cellAllocations.length).toBe(2);
    expect(cellAllocations[0]!.allocationId).toBe(allocRes1.allocation!.allocationId);
    expect(cellAllocations[1]!.allocationId).toBe(allocRes2.allocation!.allocationId);
  });

  it('2. สามารถลง WIP/PREP หลายรายการและ Board Note ในวัน/ห้องเดียวกันได้', () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = repository.getPlanningQueueData('2026-07-20');
    const wip1 = queue.wipPrepItems[0]!;
    const wip2 = queue.wipPrepItems[1]!;

    // Create 2 WIP allocations in Sat (2026-07-25) / Pack Room (R4)
    repository.createWipPrepAllocation({
      planId: plan.id,
      wipPrepItemId: wip1.itemId,
      productionDate: '2026-07-25',
      roomId: 'R4',
      plannedQty: 5,
      unit: 'หม้อ',
    });

    repository.createWipPrepAllocation({
      planId: plan.id,
      wipPrepItemId: wip2.itemId,
      productionDate: '2026-07-25',
      roomId: 'R4',
      plannedQty: 10,
      unit: 'ถาด',
    });

    // Create Board Note in Sat (2026-07-25) / Pack Room (R4)
    repository.createBoardNote({
      planId: plan.id,
      productionDate: '2026-07-25',
      roomId: 'R4',
      noteText: 'เตรียมแพ็คใหญ่พิเศษ',
    });

    const activePlan = repository.getActivePlanForWeek('2026-07-20')!;
    const cellAllocations = activePlan.allocations.filter(
      (a) => a.productionDate === '2026-07-25' && a.roomId === 'R4'
    );
    const cellNotes = repository.listBoardNotes(plan.id).filter(
      (n) => n.productionDate === '2026-07-25' && n.roomId === 'R4'
    );

    expect(cellAllocations.length).toBe(2);
    expect(cellNotes.length).toBe(1);
  });

  it('3. ย้าย Card ไปยัง Cell ที่มีงานอยู่แล้ว เป็นการต่อท้าย (Append) ไม่ลบงานเดิม', () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = repository.getPlanningQueueData('2026-07-20');
    const fgItem1 = queue.fgItems[0]!;
    const fgItem2 = queue.fgItems[1]!;

    // Cell 1: Mon (2026-07-20) / R1
    const alloc1 = repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem1.salesOrderId,
      salesOrderLineId: fgItem1.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: fgItem1.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 50,
      fgOutputUnit: fgItem1.unit,
    }).allocation!;

    // Cell 2: Tue (2026-07-21) / R1
    const alloc2 = repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem2.salesOrderId,
      salesOrderLineId: fgItem2.salesOrderLineId,
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 5,
      unit: fgItem2.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 30,
      fgOutputUnit: fgItem2.unit,
    }).allocation!;

    // Move alloc1 from Mon/R1 to Tue/R1 (which already has alloc2)
    const moveRes = repository.updateAllocation(alloc1.allocationId, {
      productionDate: '2026-07-21',
      roomId: 'R1',
    });
    expect(moveRes.success).toBe(true);

    const activePlan = repository.getActivePlanForWeek('2026-07-20')!;
    const tueAllocations = activePlan.allocations.filter(
      (a) => a.productionDate === '2026-07-21' && a.roomId === 'R1'
    );

    expect(tueAllocations.length).toBe(2);
    expect(tueAllocations.map((a) => a.allocationId)).toContain(alloc1.allocationId);
    expect(tueAllocations.map((a) => a.allocationId)).toContain(alloc2.allocationId);
  });

  it('4. ลบ Card 1 ใบออกจาก Cell ที่มีงานหลายใบ งานอื่นต้องอยู่ครบ', () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = repository.getPlanningQueueData('2026-07-20');
    const fgItem1 = queue.fgItems[0]!;
    const fgItem2 = queue.fgItems[1]!;

    const alloc1 = repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem1.salesOrderId,
      salesOrderLineId: fgItem1.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: fgItem1.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 50,
      fgOutputUnit: fgItem1.unit,
    }).allocation!;

    const alloc2 = repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem2.salesOrderId,
      salesOrderLineId: fgItem2.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 5,
      unit: fgItem2.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 30,
      fgOutputUnit: fgItem2.unit,
    }).allocation!;

    // Remove 1st allocation
    const removeRes = repository.removeAllocation(alloc1.allocationId);
    expect(removeRes.success).toBe(true);

    const activePlan = repository.getActivePlanForWeek('2026-07-20')!;
    const remainingInCell = activePlan.allocations.filter(
      (a) => a.productionDate === '2026-07-20' && a.roomId === 'R1'
    );

    expect(remainingInCell.length).toBe(1);
    expect(remainingInCell[0]!.allocationId).toBe(alloc2.allocationId);
  });

  it('5. Remaining Qty หักผลรวมจาก fgOutputQty ของทุก FG allocation ในรายการนั้น', () => {
    const queueBefore = repository.getPlanningQueueData('2026-07-20');
    const poItem = queueBefore.fgItems[0]!;
    const initialRemaining = poItem.remainingQty;

    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    // Add 1st allocation of 40 FG output
    repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: poItem.salesOrderId,
      salesOrderLineId: poItem.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: poItem.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 40,
      fgOutputUnit: poItem.unit,
    });

    // Add 2nd allocation of 30 FG output for SAME PO Line in R2
    repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: poItem.salesOrderId,
      salesOrderLineId: poItem.salesOrderLineId,
      productionDate: '2026-07-21',
      roomId: 'R2',
      plannedQty: 8,
      unit: poItem.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 30,
      fgOutputUnit: poItem.unit,
    });

    const queueAfter = repository.getPlanningQueueData('2026-07-20');
    const poItemAfter = queueAfter.fgItems.find(
      (item) => item.salesOrderLineId === poItem.salesOrderLineId
    );

    // Total fgOutputQty allocated = 40 + 30 = 70
    expect(poItemAfter?.remainingQty).toBe(initialRemaining - 70);
  });

  it('6. PlanningPage UI แสดงผลหลาย Card ใน Cell เดียวกันได้', async () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = repository.getPlanningQueueData('2026-07-20');
    const fgItem1 = queue.fgItems[0]!;
    const fgItem2 = queue.fgItems[1]!;

    repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem1.salesOrderId,
      salesOrderLineId: fgItem1.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: fgItem1.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 50,
      fgOutputUnit: fgItem1.unit,
    });

    repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem2.salesOrderId,
      salesOrderLineId: fgItem2.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 5,
      unit: fgItem2.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 30,
      fgOutputUnit: fgItem2.unit,
    });

    render(<PlanningPage />);

    await waitFor(() => {
      expect(screen.getAllByText(fgItem1.productName).length).toBeGreaterThan(0);
      expect(screen.getAllByText(fgItem2.productName).length).toBeGreaterThan(0);
    });
  });
});
