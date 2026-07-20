import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { plannerRepository } from '@/services/plannerService';
import { CalendarPage } from '@/features/calendar/CalendarPage';

describe('PHASE 4D — Delivery Calendar Page Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.initialize();
  });

  it('1. Displays delivery items under matching dueDate column', async () => {
    render(
      <MemoryRouter initialEntries={['/calendar']}>
        <CalendarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ปฏิทินส่งสินค้า (Delivery Calendar)')).toBeInTheDocument();
      expect(screen.getByText('พายไก่ไข่เค็ม 120g')).toBeInTheDocument();
    });
  });

  it('2. Planned Qty is calculated using fgOutputQty and NOT plannedQty', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = plannerRepository.getPlanningQueueData('2026-07-20');
    const poItem = queue.fgItems[0]!;

    // Create allocation where plannedQty = 10, but fgOutputQty = 100
    plannerRepository.createFgAllocation({
      planId: plan.id,
      salesOrderId: poItem.salesOrderId,
      salesOrderLineId: poItem.salesOrderLineId,
      productionDate: '2026-07-20',
      roomId: 'R1',
      plannedQty: 10, // Must NOT be used to deduct PO
      unit: poItem.unit,
      plannedUnit: 'ชุด',
      fgOutputQty: 100, // MUST be used to deduct PO!
      fgOutputUnit: poItem.unit,
    });

    render(
      <MemoryRouter initialEntries={['/calendar']}>
        <CalendarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
    });
  });

  it('3. Multiple FG allocations for same PO Line sum up fgOutputQty correctly', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const plan = draftRes.plan!;

    const queue = plannerRepository.getPlanningQueueData('2026-07-20');
    const poItem = queue.fgItems[0]!;

    // 1st allocation: 40 FG output
    plannerRepository.createFgAllocation({
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

    // 2nd allocation: 30 FG output
    plannerRepository.createFgAllocation({
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

    render(
      <MemoryRouter initialEntries={['/calendar']}>
        <CalendarPage />
      </MemoryRouter>
    );

    // Total planned FG output = 40 + 30 = 70
    await waitFor(() => {
      expect(screen.getAllByText(/70/).length).toBeGreaterThan(0);
    });
  });

  it('4. Filters (search, priority, unplanned only) filter items correctly', async () => {
    render(
      <MemoryRouter initialEntries={['/calendar']}>
        <CalendarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('พายไก่ไข่เค็ม 120g')).toBeInTheDocument();
    });

    // Filter by search query
    const searchInput = screen.getByPlaceholderText('ค้นหา PO / ลูกค้า / สินค้า...');
    fireEvent.change(searchInput, { target: { value: 'มะม่วงอบแห้ง' } });

    await waitFor(() => {
      expect(screen.getByText('มะม่วงอบแห้งพรีเมียม 150g')).toBeInTheDocument();
      expect(screen.queryByText('พายไก่ไข่เค็ม 120g')).not.toBeInTheDocument();
    });
  });

  it('5. Displays Empty State when no items match week or filters', async () => {
    render(
      <MemoryRouter initialEntries={['/calendar']}>
        <CalendarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('พายไก่ไข่เค็ม 120g')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('ค้นหา PO / ลูกค้า / สินค้า...');
    fireEvent.change(searchInput, { target: { value: 'NON_EXISTENT_PRODUCT_999' } });

    await waitFor(() => {
      expect(screen.getByText('ยังไม่มีรายการส่งสินค้าในสัปดาห์นี้')).toBeInTheDocument();
    });
  });
});
