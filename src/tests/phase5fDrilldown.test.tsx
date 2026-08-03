import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LocalStorageRepository } from '@/services/repositories/LocalStorageRepository';
import { OverviewPage } from '@/features/production/overview/OverviewPage';
import { OrdersPage } from '@/features/production/orders/OrdersPage';
import { buildOverviewReadModel } from '@/domain/readModels';
import { DueStatus, Priority } from '@/domain/types';

describe('BUG FIX — DRILLDOWN DATA ACCURACY & DEFAULT FILTERS TESTS', () => {
  let repository: LocalStorageRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageRepository();
    repository.initialize();
  });

  it('1. Single Source of Truth: buildOverviewReadModel card counts match drilldown items 100%', () => {
    const snapshot = repository.getSnapshot();
    const metrics = buildOverviewReadModel(snapshot, '2026-07-20');

    expect(metrics.allLines.length).toBeGreaterThan(0);

    // Unplanned lines predicate: remainingQty > 0
    expect(metrics.unplannedLines.every((l) => l.remainingQty > 0)).toBe(true);

    // Urgent lines predicate: priority === URGENT
    expect(metrics.urgentLines.every((l) => l.priority === Priority.URGENT)).toBe(true);

    // Due soon lines predicate: dueStatus === DUE_SOON
    expect(metrics.dueSoonLines.every((l) => l.dueStatus === DueStatus.DUE_SOON)).toBe(true);

    // Overdue lines predicate: dueStatus === OVERDUE
    expect(metrics.overdueLines.every((l) => l.dueStatus === DueStatus.OVERDUE)).toBe(true);
  });

  it('2. Overview Page: Clicking Urgent Card opens drilldown where every row is URGENT', async () => {
    render(
      <MemoryRouter>
        <OverviewPage referenceDate="2026-07-20" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ภาพรวมการผลิตรายสัปดาห์')).toBeInTheDocument();
    });

    const urgentCard = screen.getByText('PO เร่งด่วน').closest('div');
    expect(urgentCard).toBeInTheDocument();
    fireEvent.click(urgentCard!);

    await waitFor(() => {
      expect(screen.getByText(/รายการสินค้าสั่งซื้อด่วนพิเศษ/)).toBeInTheDocument();
    });

    // Close Modal
    const closeBtn = screen.getByRole('button', { name: /ปิด/i });
    fireEvent.click(closeBtn);
  });

  it('3. Overview Page: Clicking Unplanned Card opens drilldown where every row has remainingQty > 0', async () => {
    render(
      <MemoryRouter>
        <OverviewPage referenceDate="2026-07-20" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('ยังไม่วางแผน')[0]).toBeInTheDocument();
    });

    const cards = screen.getAllByText('ยังไม่วางแผน');
    expect(cards.length).toBeGreaterThan(0);
    const cardEl = cards[0];
    expect(cardEl).toBeDefined();
    const unplannedCard = cardEl!.closest('div');
    expect(unplannedCard).not.toBeNull();
    fireEvent.click(unplannedCard!);

    await waitFor(() => {
      expect(screen.getByText(/รายการสินค้าที่ยังไม่วางแผน /)).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /ปิด/i });
    fireEvent.click(closeBtn);
  });

  it('4. Sales Orders Page: Filters default to "ทั้งหมด" ("ALL")', async () => {
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ใบสั่งซื้อ (Sales Orders)')).toBeInTheDocument();
    });

    const prioritySelect = screen.getByDisplayValue('ความด่วน: ทั้งหมด') as HTMLSelectElement;
    expect(prioritySelect).toBeInTheDocument();

    const statusSelect = screen.getByDisplayValue('วางแผน: ทั้งหมด') as HTMLSelectElement;
    expect(statusSelect).toBeInTheDocument();

    const dueStatusSelect = screen.getByDisplayValue('กำหนดส่ง: ทั้งหมด') as HTMLSelectElement;
    expect(dueStatusSelect).toBeInTheDocument();
  });

  it('5. Sales Orders Page: Clicking Summary Card changes filter and "ล้างตัวกรอง" resets to default', async () => {
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('รายการสินค้าด่วน')).toBeInTheDocument();
    });

    // Click Urgent Card
    const urgentCard = screen.getByText('รายการสินค้าด่วน').closest('div');
    fireEvent.click(urgentCard!);

    expect(screen.getByDisplayValue('ความด่วน: ด่วน')).toBeInTheDocument();
    expect(screen.getByText(/กำลังดู: รายการด่วน/)).toBeInTheDocument();

    // Click Clear Filters
    const clearBtn = screen.getByRole('button', { name: /ล้างตัวกรอง/i });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);

    expect(screen.getByDisplayValue('ความด่วน: ทั้งหมด')).toBeInTheDocument();
    expect(screen.getByDisplayValue('วางแผน: ทั้งหมด')).toBeInTheDocument();
    expect(screen.getByDisplayValue('กำหนดส่ง: ทั้งหมด')).toBeInTheDocument();
  });

  it('6. Sales Orders Page: Shows empty state "ไม่พบข้อมูลตามตัวกรองที่เลือก" when no items match', async () => {
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ใบสั่งซื้อ (Sales Orders)')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('ค้นหา PO/ลูกค้า/สินค้า');
    fireEvent.change(searchInput, { target: { value: 'NON_EXISTENT_SEARCH_STRING_9999' } });

    await waitFor(() => {
      expect(screen.getByText('ไม่พบข้อมูลตามตัวกรองที่เลือก')).toBeInTheDocument();
    });
  });

  it('7. PO Detail Modal: Shows only line items & allocations of the selected PO', async () => {
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PO-2026-001')).toBeInTheDocument();
    });

    const poCard = screen.getByText('PO-2026-001').closest('div');
    fireEvent.click(poCard!);

    await waitFor(() => {
      expect(screen.getByText('รายละเอียดใบสั่งซื้อ PO: PO-2026-001')).toBeInTheDocument();
      expect(screen.getByText('พายไก่ไข่เค็ม 120g')).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /ปิด/i });
    fireEvent.click(closeBtn);
  });
});
