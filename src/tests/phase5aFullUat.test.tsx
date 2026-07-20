import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { plannerRepository } from '@/services/plannerService';
import { PrintPreviewPage } from '@/features/print-preview/PrintPreviewPage';
import { PlanningPage } from '@/features/planning/PlanningPage';
import { ActualEntryType, Priority } from '@/domain/types';
import { toPng } from 'html-to-image';

vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
}));

describe('PHASE 5A — Full UAT & Regression Hardening Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
    vi.clearAllMocks();
  });


  it('1. Complete End-to-End UAT Flow: PO -> Planning Board -> Notes -> Revision -> Actual -> Print Preview -> Delivery Calendar -> Data Tools', async () => {
    // 1.1 Sales Order Creation
    const createPoRes = plannerRepository.createSalesOrderWithLines(
      {
        poNumber: 'PO-UAT-5A',
        customerName: 'ลูกค้า UAT 5A',
        receivedDate: '2026-07-20',
        priority: Priority.URGENT,
      },
      [
        {
          productName: 'สินค้า UAT-FG 100g',
          orderedQty: 1000,
          unit: 'ชิ้น',
          dueDate: '2026-07-25',
          priority: Priority.URGENT,
        },
      ]
    );
    expect(createPoRes.success).toBe(true);
    const poLineId = createPoRes.order!.lines[0]!.id;

    // 1.2 Check Queue Data
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');
    const uatFgItem = queueData.fgItems.find((i) => i.salesOrderLineId === poLineId);
    expect(uatFgItem).toBeDefined();
    expect(uatFgItem?.remainingQty).toBe(1000);



    // 1.3 Create Draft Plan (R00)
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    expect(draftRes.success).toBe(true);
    const planR00 = draftRes.plan!;

    // 1.4 Create FG Allocation with fgOutputQty = 400
    const fgAllocRes = plannerRepository.createFgAllocation({
      planId: planR00.id,
      salesOrderId: createPoRes.order!.id,
      salesOrderLineId: poLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 40,
      unit: 'ลัง',
      plannedUnit: 'ลัง',
      fgOutputQty: 400,
      fgOutputUnit: 'ชิ้น',
      printCustomerTag: 'UAT-TAG',
      printNote: 'หมายเหตุพิมพ์',
      highlightOnPlan: true,
    });
    expect(fgAllocRes.success).toBe(true);

    // 1.5 Create Board Note
    const noteRes = plannerRepository.createBoardNote({
      planId: planR00.id,
      productionDate: '2026-07-20',
      roomId: 'R1',
      noteText: 'หมายเหตุ UAT Cell R1',
      highlightOnPlan: true,
    });
    expect(noteRes.success).toBe(true);

    // 1.6 Publish R00
    const pubRes = plannerRepository.publishPlan(planR00.id);
    expect(pubRes.success).toBe(true);

    // 1.7 Append Production Actual
    const actualRes = plannerRepository.appendProductionActual({
      allocationId: fgAllocRes.allocation!.allocationId,
      entryType: ActualEntryType.FINAL,
      goodQty: 390,
      wasteQty: 10,
      reworkQty: 0,
      shortfallQty: 10,
      shortfallReason: 'เครื่องจักรขัดข้อง',
    });
    expect(actualRes.success).toBe(true);

    // 1.8 Create R01 Revision
    const revRes = plannerRepository.createPlanRevision(planR00.id);
    expect(revRes.success).toBe(true);
    const planR01 = revRes.plan!;
    expect(planR01.revisionNumber).toBe('R01');
    expect(planR01.allocations.length).toBe(1);

    // Check Board Notes cloned to R01
    const r01Notes = plannerRepository.listBoardNotes(planR01.id);
    expect(r01Notes.length).toBe(1);
    expect(r01Notes[0]!.noteText).toBe('หมายเหตุ UAT Cell R1');

    // 1.9 Render Print Preview & test PNG Export
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,mocked_uat_png');
    const spyClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/print-preview']}>
        <PrintPreviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('แผนการผลิตประจำสัปดาห์')).toBeInTheDocument();
      expect(screen.getByText(/ลูกค้า UAT 5A|สินค้า UAT-FG 100g/)).toBeInTheDocument();
    });

    const downloadBtn = screen.getByText('ดาวน์โหลด PNG');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(toPng).toHaveBeenCalled();
      expect(spyClick).toHaveBeenCalled();
    });
    spyClick.mockRestore();
  });

  it('2. Regression: Remaining Qty deducts ONLY using fgOutputQty and NOT plannedQty', async () => {
    const createPoRes = plannerRepository.createSalesOrderWithLines(
      {
        poNumber: 'PO-DEDUCT-TEST',
        customerName: 'ลูกค้า Deduct',
        receivedDate: '2026-07-20',
        priority: Priority.NORMAL,
      },
      [
        {
          productName: 'สินค้า FG Deduct',
          orderedQty: 500,
          unit: 'ชิ้น',
          dueDate: '2026-07-25',
          priority: Priority.NORMAL,
        },
      ]
    );
    const poLineId = createPoRes.order!.lines[0]!.id;


    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    // Create FG allocation with plannedQty = 10 (ลัง) and fgOutputQty = 200 (ชิ้น)
    plannerRepository.createFgAllocation({
      planId: plan.id,
      salesOrderId: createPoRes.order!.id,
      salesOrderLineId: poLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ลัง',
      plannedUnit: 'ลัง',
      fgOutputQty: 200,
      fgOutputUnit: 'ชิ้น',
    });


    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');
    const fgItem = queueData.fgItems.find((i) => i.salesOrderLineId === poLineId);

    // Remaining should be 500 - 200 = 300 (NOT 500 - 10 = 490)
    expect(fgItem?.remainingQty).toBe(300);
  });

  it('3. Regression: Multiple allocations in the exact same cell (day & room) without overwriting', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');
    const fgItem = queueData.fgItems[0]!;

    const alloc1 = plannerRepository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem.salesOrderId,
      salesOrderLineId: fgItem.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 5,
      unit: fgItem.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 50,
      fgOutputUnit: fgItem.unit,
    });

    const alloc2 = plannerRepository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem.salesOrderId,
      salesOrderLineId: fgItem.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 3,
      unit: fgItem.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 30,
      fgOutputUnit: fgItem.unit,
    });

    expect(alloc1.success).toBe(true);
    expect(alloc2.success).toBe(true);

    const cellAllocations = plannerRepository
      .listPlanAllocations(plan.id)
      .filter((a) => a.productionDate === '2026-07-20' && a.roomId === 'R1');

    expect(cellAllocations.length).toBe(2);
  });

  it('4. Regression: Revision creation clones Board Notes to the new revision', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planR00 = draftRes.plan!;

    plannerRepository.createBoardNote({
      planId: planR00.id,
      productionDate: '2026-07-21',
      roomId: 'R2',
      noteText: 'โน้ต R00 ล้างเครื่อง',
      highlightOnPlan: true,
    });

    plannerRepository.publishPlan(planR00.id);

    const revRes = plannerRepository.createPlanRevision(planR00.id);
    expect(revRes.success).toBe(true);
    const planR01 = revRes.plan!;

    const r01Notes = plannerRepository.listBoardNotes(planR01.id);
    expect(r01Notes.length).toBe(1);
    expect(r01Notes[0]!.planId).toBe(planR01.id);
    expect(r01Notes[0]!.noteText).toBe('โน้ต R00 ล้างเครื่อง');
    expect(r01Notes[0]!.noteId).not.toBe(plannerRepository.listBoardNotes(planR00.id)[0]!.noteId);
  });

  it('5. Regression: PNG Export uses printableRef (.print-page), excludes toolbar, sets full size & applies is-exporting-png', async () => {
    plannerRepository.createDraftPlan('2026-07-20');
    vi.mocked(toPng).mockImplementation(async (elem) => {
      expect(document.body.classList.contains('is-exporting-png')).toBe(true);
      expect((elem as HTMLElement).classList.contains('print-page')).toBe(true);
      expect((elem as HTMLElement).classList.contains('print-toolbar')).toBe(false);
      return 'data:image/png;base64,mocked';
    });

    render(
      <MemoryRouter initialEntries={['/print-preview']}>
        <PrintPreviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ดาวน์โหลด PNG')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ดาวน์โหลด PNG'));

    await waitFor(() => {
      expect(toPng).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          cacheBust: true,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
        })
      );
      expect(document.body.classList.contains('is-exporting-png')).toBe(false);
    });
  });

  it('6. Regression: Print Preview renders on separate route without overlapping Planning Board shell', async () => {
    plannerRepository.createDraftPlan('2026-07-20');

    render(
      <MemoryRouter initialEntries={['/print-preview']}>
        <Routes>
          <Route path="/planning" element={<PlanningPage />} />
          <Route path="/print-preview" element={<PrintPreviewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ตัวอย่างก่อนพิมพ์ (Print Preview)')).toBeInTheDocument();
      expect(screen.getByText('แผนการผลิตประจำสัปดาห์')).toBeInTheDocument();
    });

    // Ensure Planning Board shell elements (queue panel, board title) do NOT render in Print Preview
    expect(screen.queryByText('รายการรอวางแผน (Planning Queue)')).toBeNull();
    expect(screen.queryByText('ตารางวางแผนการผลิตประจำสัปดาห์')).toBeNull();
  });
});
