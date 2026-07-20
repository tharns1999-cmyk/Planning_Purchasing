import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { plannerRepository } from '@/services/plannerService';
import { PrintPreviewPage } from '@/features/print-preview/PrintPreviewPage';
import { ActualEntryType } from '@/domain/types';
import { toPng } from 'html-to-image';

vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
}));

describe('PHASE 4B — Print Preview Page Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.initialize();
    vi.clearAllMocks();
  });

  it('1. Displays Empty State when no plan exists for the week', async () => {
    render(
      <MemoryRouter initialEntries={['/print-preview']}>
        <PrintPreviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ยังไม่มีแผนการผลิตสำหรับสัปดาห์นี้')).toBeInTheDocument();
    });
  });

  it('2. Renders document header, Monday to Saturday grid, and 4 rooms when plan exists', async () => {
    plannerRepository.createDraftPlan('2026-07-20');

    render(
      <MemoryRouter initialEntries={['/print-preview']}>
        <PrintPreviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('แผนการผลิตประจำสัปดาห์')).toBeInTheDocument();
      expect(screen.getByText('ฉบับร่าง (DRAFT)')).toBeInTheDocument();
    });

    // Verify Thai Day names
    expect(screen.getByText('จันทร์')).toBeInTheDocument();
    expect(screen.getByText('เสาร์')).toBeInTheDocument();

    // Verify 4 Room headers
    expect(screen.getByText('R1 - ห้องขนม 1')).toBeInTheDocument();
    expect(screen.getByText('R2 - ห้องขนม 2')).toBeInTheDocument();
    expect(screen.getByText('R3 - ห้องผลไม้')).toBeInTheDocument();
    expect(screen.getByText('R4 - ห้องแพ็ค')).toBeInTheDocument();
  });

  it('3. Renders FG, WIP, Board Notes, Customer Tags, and Highlight styling', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = plannerRepository.getPlanningQueueData('2026-07-20');
    const fgItem = queue.fgItems[0]!;
    const wipItem = queue.wipPrepItems[0]!;

    // Create FG Allocation with print Customer Tag & Highlight
    plannerRepository.createFgAllocation({
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
      printNote: 'พิมพ์ไลน์บ่าย',
      highlightOnPlan: true,
    });

    // Create WIP Allocation
    plannerRepository.createWipPrepAllocation({
      planId: plan.id,
      wipPrepItemId: wipItem.itemId,
      productionDate: '2026-07-21',
      roomId: 'R2',
      plannedQty: 5,
      unit: 'หม้อ',
      plannedUnit: 'หม้อ',
      printCustomerTag: 'KW',
    });

    // Create Board Note with Highlight
    plannerRepository.createBoardNote({
      planId: plan.id,
      productionDate: '2026-07-20',
      roomId: 'R1',
      noteText: 'ช่วย K2 บนแผน',
      highlightOnPlan: true,
    });

    render(
      <MemoryRouter initialEntries={['/print-preview']}>
        <PrintPreviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ITC+E', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('KW', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('ช่วย K2 บนแผน')).toBeInTheDocument();
      expect(screen.getByText('หมายเหตุ: พิมพ์ไลน์บ่าย')).toBeInTheDocument();
    });

    // Verify highlight class
    const highlights = document.querySelectorAll('.highlight-on-plan');
    expect(highlights.length).toBeGreaterThanOrEqual(2);
  });

  it('3.1 Print Preview Card UI Hierarchy: Excludes PO number, emphasizes product name & customer name, shows "ผลิต:" and "ได้ FG:"', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;
    const queue = plannerRepository.getPlanningQueueData('2026-07-20');
    const fgItem = queue.fgItems[0]!;

    const createRes = plannerRepository.createFgAllocation({
      planId: plan.id,
      salesOrderId: fgItem.salesOrderId,
      salesOrderLineId: fgItem.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10,
      unit: fgItem.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 20,
      fgOutputUnit: fgItem.unit,
      printCustomerTag: 'ลูกค้าทดสอบ',
    });
    expect(createRes.success).toBe(true);

    render(
      <MemoryRouter initialEntries={['/print-preview']}>
        <PrintPreviewPage />
      </MemoryRouter>
    );

    const line = plannerRepository.getSnapshot().entities.salesOrderLines.find((l) => l.id === fgItem.salesOrderLineId);

    await waitFor(() => {
      expect(screen.getByText(line!.skuName)).toBeInTheDocument();
      expect(screen.getByText(/ลูกค้า: ลูกค้าทดสอบ/)).toBeInTheDocument();
      expect(screen.getByText(/ผลิต:/)).toBeInTheDocument();
      expect(screen.getByText(/ได้ FG:/)).toBeInTheDocument();
      // PO Number must NOT be displayed in print preview card
      expect(screen.queryByText(/PO: PO-/)).not.toBeInTheDocument();
    });
  });






  it('4. Mode "แผนและผลผลิตจริง" displays actual production metrics', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = plannerRepository.getPlanningQueueData('2026-07-20');
    const fgItem = queue.fgItems[0]!;

    const allocRes = plannerRepository.createFgAllocation({
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
    const allocId = allocRes.allocation!.allocationId;

    plannerRepository.publishPlan(plan.id);

    // Append production actual
    plannerRepository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.FINAL,
      goodQty: 45,
      wasteQty: 3,
      reworkQty: 2,
      shortfallQty: 0,
    });

    render(
      <MemoryRouter initialEntries={['/print-preview']}>
        <PrintPreviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('เฉพาะแผน')).toBeInTheDocument();
    });

    // Switch to Actual mode
    const actualBtn = screen.getByText('แผนและผลผลิตจริง');
    fireEvent.click(actualBtn);

    await waitFor(() => {
      expect(screen.getByText('ผลผลิตจริง:')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument(); // Good qty
      expect(screen.getByText('3')).toBeInTheDocument(); // Waste qty
      expect(screen.getByText('2')).toBeInTheDocument(); // Rework qty
    });
  });

  it('5. Toolbar has no-print class and buttons/helper text are rendered', async () => {
    plannerRepository.createDraftPlan('2026-07-20');

    render(
      <MemoryRouter initialEntries={['/print-preview']}>
        <PrintPreviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('กลับไปหน้าวางแผน')).toBeInTheDocument();
      expect(screen.getByText('ดาวน์โหลด PNG')).toBeInTheDocument();
      expect(screen.getByText(/สำหรับบันทึก PDF แนะนำเลือกกระดาษ A4/)).toBeInTheDocument();
    });

    const toolbar = document.querySelector('.print-toolbar');
    expect(toolbar).not.toBeNull();
    expect(toolbar?.classList.contains('no-print')).toBe(true);
  });

  it('6. Triggers toPng download flow with correct element, options, and scrollbar removal', async () => {
    plannerRepository.createDraftPlan('2026-07-20');
    vi.mocked(toPng).mockImplementation(async (element) => {
      // Verify body has is-exporting-png class during capture
      expect(document.body.classList.contains('is-exporting-png')).toBe(true);
      // Verify captured element is print-page, not scroll container or toolbar
      expect((element as HTMLElement).classList.contains('print-page')).toBe(true);
      expect((element as HTMLElement).classList.contains('print-preview-scroll-container')).toBe(false);
      expect((element as HTMLElement).classList.contains('print-toolbar')).toBe(false);

      return 'data:image/png;base64,mocked';
    });

    const spyClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/print-preview']}>
        <PrintPreviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ดาวน์โหลด PNG')).toBeInTheDocument();
    });

    const downloadBtn = screen.getByText('ดาวน์โหลด PNG');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(toPng).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          cacheBust: true,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          width: expect.any(Number),
          height: expect.any(Number),
          style: expect.objectContaining({
            overflow: 'visible',
            height: 'auto',
            maxHeight: 'none',
          }),
        })
      );
      expect(spyClick).toHaveBeenCalled();
      // Verify body removes is-exporting-png after capture
      expect(document.body.classList.contains('is-exporting-png')).toBe(false);
    });

    spyClick.mockRestore();
  });

  it('7. Displays Thai error when PNG export fails', async () => {
    plannerRepository.createDraftPlan('2026-07-20');
    vi.mocked(toPng).mockRejectedValue(new Error('Export failed'));

    render(
      <MemoryRouter initialEntries={['/print-preview']}>
        <PrintPreviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ดาวน์โหลด PNG')).toBeInTheDocument();
    });

    const downloadBtn = screen.getByText('ดาวน์โหลด PNG');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(screen.getByText('ไม่สามารถสร้างไฟล์ PNG ได้ กรุณาลองใหม่อีกครั้ง')).toBeInTheDocument();
    });
  });

  it('8. Verifies print-page structural rules (no overflow-auto/scroll, print-table w-full, toolbar outside printableRef)', async () => {
    plannerRepository.createDraftPlan('2026-07-20');

    render(
      <MemoryRouter initialEntries={['/print-preview']}>
        <PrintPreviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('แผนการผลิตประจำสัปดาห์')).toBeInTheDocument();
    });

    const printPage = document.querySelector('.print-page');
    expect(printPage).not.toBeNull();
    expect(printPage?.classList.contains('overflow-auto')).toBe(false);
    expect(printPage?.classList.contains('overflow-scroll')).toBe(false);
    expect(printPage?.classList.contains('overflow-x-auto')).toBe(false);

    // Toolbar must NOT be inside printPage
    const toolbarInPrintPage = printPage?.querySelector('.print-toolbar');
    expect(toolbarInPrintPage).toBeNull();

    // Outer scroll container wraps printPage
    const scrollContainer = document.querySelector('.print-preview-scroll-container');
    expect(scrollContainer).not.toBeNull();
    expect(scrollContainer?.contains(printPage)).toBe(true);

    // print-table has w-full
    const printTable = document.querySelector('.print-table');
    expect(printTable).not.toBeNull();
    expect(printTable?.classList.contains('w-full')).toBe(true);
  });
});

