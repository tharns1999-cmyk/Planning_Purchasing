import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocalStorageRepository } from '@/services/repositories/LocalStorageRepository';
import { PlanningPage } from '@/features/production/planning/PlanningPage';

describe('PHASE 3D.1 — Move Allocation Card by Drag & Drop Tests', () => {
  let repository: LocalStorageRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageRepository();
    repository.initialize();
  });

  it('1. Draft FG allocation ย้ายไปวันอื่นได้ และข้อมูลเดิมคงอยู่ครบถ้วน', () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = repository.getPlanningQueueData('2026-07-20');
    const fgItem = queue.fgItems[0]!;

    const allocRes = repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem.salesOrderId,
      salesOrderLineId: fgItem.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: fgItem.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 50,
      fgOutputUnit: fgItem.unit,
      printCustomerTag: 'ITC+E',
      printNote: 'ใช้ไลน์บ่าย',
      highlightOnPlan: true,
    });

    expect(allocRes.success).toBe(true);
    const originalAlloc = allocRes.allocation!;

    // Move to another date
    const moveRes = repository.updateAllocation(originalAlloc.allocationId, {
      productionDate: '2026-07-22',
      roomId: 'R1',
    });

    expect(moveRes.success).toBe(true);
    const movedAlloc = moveRes.allocation!;

    expect(movedAlloc.productionDate).toBe('2026-07-22');
    expect(movedAlloc.roomId).toBe('R1');
    expect(movedAlloc.plannedQty).toBe(10);
    expect(movedAlloc.fgOutputQty).toBe(50);
    expect(movedAlloc.printCustomerTag).toBe('ITC+E');
    expect(movedAlloc.printNote).toBe('ใช้ไลน์บ่าย');
    expect(movedAlloc.highlightOnPlan).toBe(true);
  });

  it('2. Draft WIP/PREP allocation ย้ายไปห้องอื่นได้ และข้อมูลเดิมคงอยู่ครบถ้วน', () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = repository.getPlanningQueueData('2026-07-20');
    const wipItem = queue.wipPrepItems[0]!;

    const allocRes = repository.createWipPrepAllocation({
      planId: plan.id,
      wipPrepItemId: wipItem.itemId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 5,
      unit: 'หม้อ',
      plannedUnit: 'หม้อ',
      printCustomerTag: 'KW',
      printNote: 'เตรียมพิเศษ',
      highlightOnPlan: false,
    });

    expect(allocRes.success).toBe(true);
    const originalAlloc = allocRes.allocation!;

    // Move to another room
    const moveRes = repository.updateAllocation(originalAlloc.allocationId, {
      productionDate: '2026-07-20',
      roomId: 'R3',
    });

    expect(moveRes.success).toBe(true);
    const movedAlloc = moveRes.allocation!;

    expect(movedAlloc.productionDate).toBe('2026-07-20');
    expect(movedAlloc.roomId).toBe('R3');
    expect(movedAlloc.plannedQty).toBe(5);
    expect(movedAlloc.printCustomerTag).toBe('KW');
    expect(movedAlloc.printNote).toBe('เตรียมพิเศษ');
    expect(movedAlloc.highlightOnPlan).toBe(false);
  });

  it('3. Published allocation ย้ายไม่ได้ (updateAllocation คืนค่า success = false)', () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = repository.getPlanningQueueData('2026-07-20');
    const fgItem = queue.fgItems[0]!;

    const allocRes = repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem.salesOrderId,
      salesOrderLineId: fgItem.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: fgItem.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 50,
      fgOutputUnit: fgItem.unit,
    });

    repository.publishPlan(plan.id);

    const moveRes = repository.updateAllocation(allocRes.allocation!.allocationId, {
      productionDate: '2026-07-21',
      roomId: 'R2',
    });

    expect(moveRes.success).toBe(false);
    expect(moveRes.errors?.[0]).toContain('Cannot modify allocation in a PUBLISHED plan');
  });

  it('4. Drop ไป invalid date นอกสัปดาห์ หรือ invalid room ถูกปฏิเสธ', () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = repository.getPlanningQueueData('2026-07-20');
    const fgItem = queue.fgItems[0]!;

    const allocRes = repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem.salesOrderId,
      salesOrderLineId: fgItem.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: fgItem.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 50,
      fgOutputUnit: fgItem.unit,
    });

    // Invalid date outside week
    const moveDateRes = repository.updateAllocation(allocRes.allocation!.allocationId, {
      productionDate: '2026-08-01',
      roomId: 'R1',
    });
    expect(moveDateRes.success).toBe(false);

    // Invalid room ID
    const moveRoomRes = repository.updateAllocation(allocRes.allocation!.allocationId, {
      productionDate: '2026-07-20',
      roomId: 'R999',
    });
    expect(moveRoomRes.success).toBe(false);
  });

  it('5. CREATE_ALLOCATION จาก Queue เปิด Modal แต่ MOVE_ALLOCATION ไม่เปิด Modal', async () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = repository.getPlanningQueueData('2026-07-20');
    const fgItem = queue.fgItems[0]!;

    const allocRes = repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem.salesOrderId,
      salesOrderLineId: fgItem.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: fgItem.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 50,
      fgOutputUnit: fgItem.unit,
    });
    const alloc = allocRes.allocation!;

    render(<PlanningPage />);

    // Wait for page load
    await waitFor(() => {
      expect(screen.getByText('พายไก่ไข่เค็ม 120g')).toBeInTheDocument();
    });

    // 1. Simulate MOVE_ALLOCATION drop on R2 cell
    const targetCell = screen.getAllByRole('cell')[7]!; // Room 2 cell
    const moveEvent = {
      preventDefault: () => {},
      dataTransfer: {
        getData: (format: string) =>
          format === 'application/json'
            ? JSON.stringify({
                type: 'MOVE_ALLOCATION',
                allocationId: alloc.allocationId,
                currentProductionDate: '2026-07-20',
                currentRoomId: 'R1',
              })
            : '',
      },
    };

    fireEvent.drop(targetCell, moveEvent);

    // Verify move notice appears and quantity modal is NOT open
    await waitFor(() => {
      expect(screen.getByText('ย้ายรายการวางแผนเรียบร้อยแล้ว')).toBeInTheDocument();
    });
    expect(screen.queryByText('จำนวนที่วางแผนผลิต *')).not.toBeInTheDocument();

    // Verify allocation updated in repository
    const updatedPlan = repository.getActivePlanForWeek('2026-07-20')!;
    const updatedAlloc = updatedPlan.allocations.find((a) => a.allocationId === alloc.allocationId);
    expect(updatedAlloc?.roomId).toBe('R2');

    // 2. Simulate CREATE_ALLOCATION drop from Queue -> opens Allocation Modal
    const createEvent = {
      preventDefault: () => {},
      dataTransfer: {
        getData: (format: string) =>
          format === 'application/json'
            ? JSON.stringify({
                type: 'FG',
                item: fgItem,
              })
            : '',
      },
    };

    fireEvent.drop(targetCell, createEvent);

    await waitFor(() => {
      expect(screen.getByText('จำนวนที่วางแผนผลิต *')).toBeInTheDocument();
    });
  });

  it('6. วางลง cell เดิมไม่ต้องทำอะไรและไม่เกิด error', async () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = repository.getPlanningQueueData('2026-07-20');
    const fgItem = queue.fgItems[0]!;

    const allocRes = repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem.salesOrderId,
      salesOrderLineId: fgItem.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: fgItem.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 50,
      fgOutputUnit: fgItem.unit,
    });
    const alloc = allocRes.allocation!;

    render(<PlanningPage />);

    await waitFor(() => {
      expect(screen.getByText('พายไก่ไข่เค็ม 120g')).toBeInTheDocument();
    });

    const sameCell = screen.getAllByRole('cell')[1]!; // Monday R1 cell
    const sameCellMoveEvent = {
      preventDefault: () => {},
      dataTransfer: {
        getData: (format: string) =>
          format === 'application/json'
            ? JSON.stringify({
                type: 'MOVE_ALLOCATION',
                allocationId: alloc.allocationId,
                currentProductionDate: '2026-07-20',
                currentRoomId: 'R1',
              })
            : '',
      },
    };

    fireEvent.drop(sameCell, sameCellMoveEvent);

    // Should not trigger notice and alloc should remain in R1 2026-07-20
    const currentAlloc = repository.getActivePlanForWeek('2026-07-20')!.allocations[0]!;
    expect(currentAlloc.productionDate).toBe('2026-07-20');
    expect(currentAlloc.roomId).toBe('R1');
  });
});
