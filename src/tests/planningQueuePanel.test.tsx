import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningQueuePanel } from '../features/planning/PlanningQueuePanel';
import { plannerRepository } from '../services/plannerService';

describe('Phase 3B — Planning Queue UI Read-Only Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
    plannerRepository.initialize();
  });

  it('1. Successfully renders Planning Queue tabs and default FG items', () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    expect(screen.getByText('รายการรอวางแผน (Queue)')).toBeInTheDocument();
    expect(screen.getByText(/สินค้า FG/)).toBeInTheDocument();
    expect(screen.getByText(/WIP \/ งานเตรียม/)).toBeInTheDocument();

    // Verify seed FG item names are rendered
    expect(screen.getByText('พายไก่ไข่เค็ม 120g')).toBeInTheDocument();
    expect(screen.getByText('ขนมปังเนยสด 200g')).toBeInTheDocument();
  });

  it('2. Switches tabs to display WIP / งานเตรียม items', () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    const wipTabBtn = screen.getByText(/WIP \/ งานเตรียม/);
    fireEvent.click(wipTabBtn);

    // Verify seed WIP/Prep item names are rendered
    expect(screen.getByText('ไก่ผัดไส้พายหมักเครื่องเทศ (WIP)')).toBeInTheDocument();
    expect(screen.getByText('แป้งพายชั้นหมักเนยสด (WIP)')).toBeInTheDocument();
  });

  it('3. Searches FG queue by PO Number', () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    const searchInput = screen.getByPlaceholderText('ค้นหา PO/สินค้า/ลูกค้า');
    fireEvent.change(searchInput, { target: { value: 'PO-2026-002' } });

    expect(screen.getByText('มะม่วงอบแห้งพรีเมียม 150g')).toBeInTheDocument();
    expect(screen.queryByText('พายไก่ไข่เค็ม 120g')).not.toBeInTheDocument();
  });

  it('4. Searches FG queue by Customer Name', () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    const searchInput = screen.getByPlaceholderText('ค้นหา PO/สินค้า/ลูกค้า');
    fireEvent.change(searchInput, { target: { value: 'เซ็นทรัลฟู้ดฮอลล์' } });

    expect(screen.getByText('มะม่วงอบแห้งพรีเมียม 150g')).toBeInTheDocument();
    expect(screen.queryByText('พายไก่ไข่เค็ม 120g')).not.toBeInTheDocument();
  });

  it('5. Searches FG queue by Product Name', () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    const searchInput = screen.getByPlaceholderText('ค้นหา PO/สินค้า/ลูกค้า');
    fireEvent.change(searchInput, { target: { value: 'พายไก่' } });

    expect(screen.getByText('พายไก่ไข่เค็ม 120g')).toBeInTheDocument();
    expect(screen.queryByText('ขนมปังเนยสด 200g')).not.toBeInTheDocument();
  });

  it('6. Filters FG queue by Priority (ด่วน)', () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    const selects = screen.getAllByRole('combobox');
    const prioritySelect = selects[0]!;

    fireEvent.change(prioritySelect, { target: { value: 'URGENT' } });

    expect(screen.getByText('พายไก่ไข่เค็ม 120g')).toBeInTheDocument();
    expect(screen.queryByText('ขนมปังเนยสด 200g')).not.toBeInTheDocument();
  });

  it('7. Filters FG queue by Due Status', () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    const selects = screen.getAllByRole('combobox');
    const dueSelect = selects[1]!;

    fireEvent.change(dueSelect, { target: { value: 'DUE_SOON' } });

    expect(screen.getByText('พายไก่ไข่เค็ม 120g')).toBeInTheDocument();
  });

  it('8. Clears FG filters when clicking "ล้างตัวกรอง"', () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    const searchInput = screen.getByPlaceholderText('ค้นหา PO/สินค้า/ลูกค้า');
    fireEvent.change(searchInput, { target: { value: 'พายไก่' } });

    const clearBtn = screen.getByText('ล้างตัวกรอง');
    fireEvent.click(clearBtn);

    expect(screen.getByText('ขนมปังเนยสด 200g')).toBeInTheDocument();
  });

  it('9. Displays EmptyState when no search items match', () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    const searchInput = screen.getByPlaceholderText('ค้นหา PO/สินค้า/ลูกค้า');
    fireEvent.change(searchInput, { target: { value: 'NONEXISTENT_ITEM_999' } });

    expect(screen.getByText('ไม่พบรายการ FG')).toBeInTheDocument();
    expect(screen.getByText('ไม่มีรายการสินค้าสำเร็จรูปค้างวางแผนตรงตามตัวกรอง')).toBeInTheDocument();
  });
});
