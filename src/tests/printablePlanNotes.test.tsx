import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { plannerRepository as repository } from '@/services/plannerService';
import { PlanningPage } from '@/features/production/planning/PlanningPage';

describe('PHASE 3C.2 — Printable Plan Notes & Customer Tags', () => {
  beforeEach(() => {
    localStorage.clear();
    repository.reset();
    repository.initialize();
  });

  it('1. เพิ่ม Board Note สำเร็จ และ noteId/planId/date/room ถูกต้อง', () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    expect(draftRes.success).toBe(true);
    const plan = draftRes.plan!;

    const noteRes = repository.createBoardNote({
      planId: plan.id,
      productionDate: '2026-07-21',
      roomId: 'R1',
      noteText: 'ช่วย K2',
      highlightOnPlan: true,
    });

    expect(noteRes.success).toBe(true);
    expect(noteRes.note).toBeDefined();
    expect(noteRes.note?.noteText).toBe('ช่วย K2');
    expect(noteRes.note?.highlightOnPlan).toBe(true);
    expect(noteRes.note?.planId).toBe(plan.id);

    const notes = repository.listBoardNotes(plan.id);
    expect(notes.length).toBe(1);
    expect(notes[0]?.noteText).toBe('ช่วย K2');
  });

  it('2. Note ไม่หัก Remaining Qty ของ PO Line', () => {
    const queueBefore = repository.getPlanningQueueData('2026-07-20');
    const poItem = queueBefore.fgItems[0]!;
    const initialRemaining = poItem.remainingQty;

    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    // Create a Board Note
    repository.createBoardNote({
      planId: plan.id,
      productionDate: '2026-07-21',
      roomId: 'R1',
      noteText: 'หมายเหตุแบบอิสระ ไม่ผูกกับ PO',
    });

    const queueAfter = repository.getPlanningQueueData('2026-07-20');
    const poItemAfter = queueAfter.fgItems.find(
      (item) => item.salesOrderLineId === poItem.salesOrderLineId
    );

    expect(poItemAfter?.remainingQty).toBe(initialRemaining);
  });

  it('3. Note เพิ่มไม่ได้ถ้า Plan ไม่ใช่ Draft (PUBLISHED, SUPERSEDED, CANCELLED)', () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    // Publish the plan
    const pubRes = repository.publishPlan(plan.id);
    expect(pubRes.success).toBe(true);

    const noteRes = repository.createBoardNote({
      planId: plan.id,
      productionDate: '2026-07-21',
      roomId: 'R1',
      noteText: 'ไม่ควรเพิ่มได้',
    });

    expect(noteRes.success).toBe(false);
    expect(noteRes.errors?.[0]).toContain('non-draft plan');
  });

  it('4 & 5 & 6. Allocation มี printCustomerTag, printNote และ highlightOnPlan แสดงบน Board Card', async () => {
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
      printNote: 'ใช้ไลน์บ่าย / รอวัตถุดิบ',
      highlightOnPlan: true,
    });

    expect(allocRes.success).toBe(true);
    expect(allocRes.allocation?.printCustomerTag).toBe('ITC+E');
    expect(allocRes.allocation?.printNote).toBe('ใช้ไลน์บ่าย / รอวัตถุดิบ');
    expect(allocRes.allocation?.highlightOnPlan).toBe(true);

    // Render UI to verify card elements and highlight class
    render(<PlanningPage />);

    await waitFor(() => {
      expect(screen.getByText('ITC+E')).toBeInTheDocument();
      expect(screen.getByText('หมายเหตุ: ใช้ไลน์บ่าย / รอวัตถุดิบ')).toBeInTheDocument();
    });

    const highlightCard = document.querySelector('.highlight-on-plan');
    expect(highlightCard).not.toBeNull();
  });

  it('7. ลบ Note แล้วหายจาก Board', () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const noteRes = repository.createBoardNote({
      planId: plan.id,
      productionDate: '2026-07-21',
      roomId: 'R1',
      noteText: 'โน้ตที่จะถูกลบ',
    });

    const noteId = noteRes.note!.noteId;
    expect(repository.listBoardNotes(plan.id).length).toBe(1);

    const removeRes = repository.removeBoardNote(noteId);
    expect(removeRes.success).toBe(true);
    expect(repository.listBoardNotes(plan.id).length).toBe(0);
  });

  it('8. Published Plan แก้ไขหรือลบ Note ไม่ได้', () => {
    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const noteRes = repository.createBoardNote({
      planId: plan.id,
      productionDate: '2026-07-21',
      roomId: 'R1',
      noteText: 'โน้ตรอทดสอบ Published',
    });
    const noteId = noteRes.note!.noteId;

    // Publish Plan
    repository.publishPlan(plan.id);

    const updateRes = repository.updateBoardNote(noteId, { noteText: 'แก้ข้อความ' });
    expect(updateRes.success).toBe(false);

    const removeRes = repository.removeBoardNote(noteId);
    expect(removeRes.success).toBe(false);
  });

  it('9. Remaining Qty ยังหักด้วย fgOutputQty เท่านั้น (printCustomerTag / printNote ไม่มีผล)', () => {
    const queueBefore = repository.getPlanningQueueData('2026-07-20');
    const poItem = queueBefore.fgItems[0]!;
    const initialRemaining = poItem.remainingQty;

    const draftRes = repository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    repository.createFgAllocation({
      planId: plan.id,
      salesOrderId: poItem.salesOrderId,
      salesOrderLineId: poItem.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: poItem.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 100,
      fgOutputUnit: poItem.unit,
      printCustomerTag: 'ITC+E (ห้ามมีผลต่อจำนวน)',
      printNote: 'หมายเหตุยาวๆ (ห้ามมีผลต่อจำนวน)',
      highlightOnPlan: true,
    });

    const queueAfter = repository.getPlanningQueueData('2026-07-20');
    const poItemAfter = queueAfter.fgItems.find(
      (item) => item.salesOrderLineId === poItem.salesOrderLineId
    );

    const expectedRemaining = initialRemaining - 100;
    expect(poItemAfter?.remainingQty).toBe(expectedRemaining);
  });

  it('10. BoardNote ต้อง Clone ตอนสร้าง Revision (createPlanRevision)', () => {
    // 1. Create R00 draft & add board note
    const r00Draft = repository.createDraftPlan('2026-07-20').plan!;
    const noteRes = repository.createBoardNote({
      planId: r00Draft.id,
      productionDate: '2026-07-21',
      roomId: 'R2',
      noteText: 'ช่วย K2 บน R00',
      highlightOnPlan: true,
      displayOrder: 1,
    });
    expect(noteRes.success).toBe(true);

    // 2. Publish R00
    repository.publishPlan(r00Draft.id);

    // 3. Create R01 revision
    const revRes = repository.createPlanRevision(r00Draft.id);
    expect(revRes.success).toBe(true);
    const r01Draft = revRes.plan!;
    expect(r01Draft.revisionNumber).toBe('R01');

    // 4. Verify cloned board notes
    const r01Notes = repository.listBoardNotes(r01Draft.id);
    expect(r01Notes.length).toBe(1);
    expect(r01Notes[0]?.noteText).toBe('ช่วย K2 บน R00');
    expect(r01Notes[0]?.highlightOnPlan).toBe(true);
    expect(r01Notes[0]?.planId).toBe(r01Draft.id);
    expect(r01Notes[0]?.noteId).not.toBe(noteRes.note!.noteId); // Must have a new noteId

    // 5. Verify source R00 notes remain untouched
    const r00Notes = repository.listBoardNotes(r00Draft.id);
    expect(r00Notes.length).toBe(1);
    expect(r00Notes[0]?.planId).toBe(r00Draft.id);
  });

  it('11. BoardNote ต้องแสดงเฉพาะ Plan ที่เลือกอยู่', () => {
    const r00Draft = repository.createDraftPlan('2026-07-20').plan!;
    repository.createBoardNote({
      planId: r00Draft.id,
      productionDate: '2026-07-21',
      roomId: 'R1',
      noteText: 'ข้อความ R00',
    });
    repository.publishPlan(r00Draft.id);

    const r01Draft = repository.createPlanRevision(r00Draft.id).plan!;
    // Add a new note to R01 only
    repository.createBoardNote({
      planId: r01Draft.id,
      productionDate: '2026-07-22',
      roomId: 'R3',
      noteText: 'ข้อความเฉพาะ R01',
    });

    // R01 notes count should be 2 (cloned R00 note + new R01 note)
    const r01Notes = repository.listBoardNotes(r01Draft.id);
    expect(r01Notes.length).toBe(2);

    // R00 notes count should remain 1
    const r00Notes = repository.listBoardNotes(r00Draft.id);
    expect(r00Notes.length).toBe(1);

    // Cancel R01 and verify getPlanningBoardData returns R00 notes only
    repository.cancelPlanRevision(r01Draft.id);
    const boardData = repository.getPlanningBoardData('2026-07-20');
    expect(boardData.activePlan?.id).toBe(r00Draft.id);
    expect(boardData.boardNotes.length).toBe(1);
    expect(boardData.boardNotes[0]?.noteText).toBe('ข้อความ R00');
  });
});
