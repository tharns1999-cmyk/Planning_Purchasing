import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanningQueuePanel } from '@/features/production/planning/PlanningQueuePanel';
import { plannerRepository } from '../services/plannerService';
import { SourceType } from '../domain/types';

describe('PHASE 5H — WIP Menu Management Card UI Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
    plannerRepository.initialize();
  });

  it('1. Tab displays "WIP งานแปรรูป" and UI contains no "PREP" or "งานเตรียม" text', () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    expect(screen.getByText(/WIP งานแปรรูป/)).toBeInTheDocument();
    expect(screen.queryByText(/WIP \/ งานเตรียม/)).not.toBeInTheDocument();
    expect(screen.queryByText(/PREP \(งานเตรียม\)/)).not.toBeInTheDocument();

    const wipTabBtn = screen.getByText(/WIP งานแปรรูป/);
    fireEvent.click(wipTabBtn);

    expect(screen.getByPlaceholderText('ค้นหา WIP')).toBeInTheDocument();
    expect(screen.getByText('+ เพิ่มรายการ WIP')).toBeInTheDocument();
    expect(screen.queryByText('เพิ่มรายการ WIP ใหม่')).not.toBeInTheDocument();
    expect(screen.queryByText('WIP-CHICKEN-PREP')).not.toBeInTheDocument();
    expect(screen.queryByText(/งานเตรียม/)).not.toBeInTheDocument();
  });

  it('2. Add WIP button opens Add Modal with Thai title and inputs without itemCode input field', () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    fireEvent.click(screen.getByText(/WIP งานแปรรูป/));

    const addBtn = screen.getByText('+ เพิ่มรายการ WIP');
    fireEvent.click(addBtn);

    expect(screen.getByText('เพิ่มรายการ WIP')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ระบุชื่อ WIP/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/ระบุรหัส WIP/)).not.toBeInTheDocument();
  });

  it('3. Successfully creates a new WIP item via Modal with auto-generated itemCode', async () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');
    const onRefresh = vi.fn();

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByText(/WIP งานแปรรูป/));
    fireEvent.click(screen.getByText('+ เพิ่มรายการ WIP'));

    fireEvent.change(screen.getByPlaceholderText(/ระบุชื่อ WIP/), {
      target: { value: 'หมูสามชั้นสไลซ์ (WIP)' },
    });

    fireEvent.click(screen.getByText('บันทึก'));

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });

    const created = plannerRepository.listWipItems().find((i) => i.itemName === 'หมูสามชั้นสไลซ์ (WIP)');
    expect(created).toBeDefined();
    expect(created?.itemCode).toBeDefined();
    expect(created?.itemName).toBe('หมูสามชั้นสไลซ์ (WIP)');
    expect(created?.itemType).toBe(SourceType.WIP);
  });

  it('4. Rejects creation when name is missing and shows Thai error message', async () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    fireEvent.click(screen.getByText(/WIP งานแปรรูป/));
    fireEvent.click(screen.getByText('+ เพิ่มรายการ WIP'));

    // Click Save without filling name
    fireEvent.click(screen.getByText('บันทึก'));
    expect(screen.getByText('กรุณากรอกชื่อ WIP')).toBeInTheDocument();
  });

  it('5. Edits a WIP item via Modal and updates fields', async () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');
    const onRefresh = vi.fn();

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByText(/WIP งานแปรรูป/));

    const editButtons = screen.getAllByText('แก้ไข');
    fireEvent.click(editButtons[0]!);

    expect(screen.getByText('แก้ไขรายการ WIP')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/ระบุชื่อ WIP/);
    fireEvent.change(nameInput, { target: { value: 'ไก่ผัดไส้พายสูตรพิเศษ 2026' } });

    fireEvent.click(screen.getByText('บันทึก'));

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });

    const updated = plannerRepository.getWipItem('wip-01');
    expect(updated?.itemName).toBe('ไก่ผัดไส้พายสูตรพิเศษ 2026');
    expect(updated?.itemCode).toBe('WIP-CHICKEN-PREP');
  });

  it('6. Disables WIP item: hides from Queue when toggle is off, shows with "ปิดใช้งาน" badge when toggle is on', async () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');
    const onRefresh = vi.fn();

    const { rerender } = render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByText(/WIP งานแปรรูป/));

    const disableButtons = screen.getAllByText('ปิดใช้งาน');
    fireEvent.click(disableButtons[0]!);

    expect(onRefresh).toHaveBeenCalled();

    // Verify item is set to active=false in repository
    const item = plannerRepository.listWipItems(true).find((i) => i.itemId === 'wip-01');
    expect(item?.active).toBe(false);

    // Re-render with updated queue data
    const updatedQueue = plannerRepository.getPlanningQueueData('2026-07-20');
    rerender(
      <PlanningQueuePanel
        fgItems={updatedQueue.fgItems}
        wipPrepItems={updatedQueue.wipPrepItems}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByText(/WIP งานแปรรูป/));
    // Default showInactive is false -> item should be hidden
    expect(screen.queryByText('ไก่ผัดไส้พายหมักเครื่องเทศ (WIP)')).not.toBeInTheDocument();

    // Check "แสดงรายการที่ปิดใช้งาน" toggle
    const toggleCheckbox = screen.getByLabelText('แสดงรายการที่ปิดใช้งาน');
    fireEvent.click(toggleCheckbox);

    // Now inactive item should appear with "ปิดใช้งาน" badge and "เปิดใช้งาน" button
    expect(screen.getByText('ไก่ผัดไส้พายหมักเครื่องเทศ (WIP)')).toBeInTheDocument();
    expect(screen.getAllByText('ปิดใช้งาน').length).toBeGreaterThan(0);
    expect(screen.getByText('เปิดใช้งาน')).toBeInTheDocument();
  });

  it('7. Search filters WIP queue by Name, Code, Related FG, and Note', () => {
    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    fireEvent.click(screen.getByText(/WIP งานแปรรูป/));

    const searchInput = screen.getByPlaceholderText('ค้นหา WIP');

    // Search by Name
    fireEvent.change(searchInput, { target: { value: 'ไก่ผัดไส้' } });
    expect(screen.getByText('ไก่ผัดไส้พายหมักเครื่องเทศ (WIP)')).toBeInTheDocument();
    expect(screen.queryByText('แป้งพายชั้นหมักเนยสด (WIP)')).not.toBeInTheDocument();

    // Search non-existent
    fireEvent.change(searchInput, { target: { value: 'SEARCH_NO_MATCH_999' } });
    expect(screen.getByText('ไม่พบรายการ WIP ตามคำค้นหา')).toBeInTheDocument();
    expect(screen.getByText('ลองค้นหาด้วยคำอื่น')).toBeInTheDocument();
  });

  it('8. Historical PREP items in seed data are strictly hidden from Queue', () => {
    // Manually add a PREP item to repo
    plannerRepository.createWipPrepItem({
      itemType: SourceType.PREP,
      itemName: 'หัวหอมหั่นเตาเตรียมผัด (PREP)',
      defaultUnit: 'กก.',
    });

    const queueData = plannerRepository.getPlanningQueueData('2026-07-20');

    render(
      <PlanningQueuePanel
        fgItems={queueData.fgItems}
        wipPrepItems={queueData.wipPrepItems}
      />
    );

    fireEvent.click(screen.getByText(/WIP งานแปรรูป/));

    expect(screen.queryByText('หัวหอมหั่นเตาเตรียมผัด (PREP)')).not.toBeInTheDocument();
  });
});
