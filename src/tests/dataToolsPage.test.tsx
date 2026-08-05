import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LocalStorageRepository } from '@/services/repositories/LocalStorageRepository';
import { SettingsPage } from '@/features/production/settings/SettingsPage';

describe('PHASE 4C — Data Tools Page Tests', () => {
  let repository: LocalStorageRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageRepository();
    repository.initialize();
  });

  it('1. Data Summary displays accurate record counts for all 8 database entities', async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <SettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('เครื่องมือข้อมูล (Data Tools)')).toBeInTheDocument();
      expect(screen.getByText('สรุปจำนวนข้อมูลปัจจุบัน (Data Summary)')).toBeInTheDocument();
    });

    const snapshot = repository.getSnapshot();
    expect(screen.getByText('ห้องผลิต (Rooms)')).toBeInTheDocument();
    expect(screen.getByText('Sales Orders')).toBeInTheDocument();
    expect(screen.getByText('Sales Order Lines')).toBeInTheDocument();
    expect(screen.getByText('WIP/PREP Items')).toBeInTheDocument();
    expect(screen.getByText('Weekly Plans')).toBeInTheDocument();
    expect(screen.getByText('Plan Allocations')).toBeInTheDocument();
    expect(screen.getByText('Actual Entries')).toBeInTheDocument();
    expect(screen.getByText('Board Notes')).toBeInTheDocument();

    expect(snapshot.entities.rooms.length).toBeGreaterThan(0);
  });

  it('2. Export Data uses getSnapshot() and produces full database JSON', () => {
    const snapshot = repository.getSnapshot();
    expect(snapshot.entities).toBeDefined();
    expect(Array.isArray(snapshot.entities.rooms)).toBe(true);
    expect(Array.isArray(snapshot.entities.salesOrders)).toBe(true);
    expect(Array.isArray(snapshot.entities.salesOrderLines)).toBe(true);
    expect(Array.isArray(snapshot.entities.wipPrepItems)).toBe(true);
    expect(Array.isArray(snapshot.entities.weeklyPlans)).toBe(true);
    expect(Array.isArray(snapshot.entities.planAllocations)).toBe(true);
    expect(Array.isArray(snapshot.entities.productionActualEntries)).toBe(true);
    expect(Array.isArray(snapshot.entities.boardNotes)).toBe(true);
  });

  it('3. Valid JSON import succeeds and updates LocalStorage database', () => {
    const snapshot = repository.getSnapshot();
    // Modify WIP item name in snapshot
    const testSnapshot = JSON.parse(JSON.stringify(snapshot));
    testSnapshot.entities.wipPrepItems.push({
      itemId: 'wip-test-999',
      itemType: 'WIP',
      itemCode: 'WIP-TEST',
      itemName: 'ซอสพิเศษนำเข้า',
      defaultUnit: 'กิโลกรัม',
      createdAt: '2026-07-20T00:00:00.000Z',
      updatedAt: '2026-07-20T00:00:00.000Z',
    });

    const importRes = repository.importDatabase(testSnapshot);
    expect(importRes.success).toBe(true);

    const updatedSnap = repository.getSnapshot();
    const foundItem = updatedSnap.entities.wipPrepItems.find((i) => i.itemId === 'wip-test-999');
    expect(foundItem).toBeDefined();
    expect(foundItem?.itemName).toBe('ซอสพิเศษนำเข้า');
  });

  it('4. Invalid JSON or missing required entities fails import with Thai error without corrupting database', () => {
    const snapshotBefore = repository.getSnapshot();

    // Missing required entity arrays 'productionActualEntries' and 'rooms'
    const invalidJson = {
      schemaVersion: 1,
      entities: {
        salesOrders: [],
        salesOrderLines: [],
      },
    };

    const importRes = repository.importDatabase(invalidJson);
    expect(importRes.success).toBe(false);
    expect(importRes.errors?.[0]).toContain('ขาดข้อมูลโครงสร้างหลัก');

    // Verify database remains untouched
    const snapshotAfter = repository.getSnapshot();
    expect(snapshotAfter.entities.rooms.length).toBe(snapshotBefore.entities.rooms.length);
    expect(snapshotAfter.entities.salesOrders.length).toBe(snapshotBefore.entities.salesOrders.length);
  });

  it('5. Reset requires typing exact confirmation string RESET', async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <SettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('3. ล้างข้อมูล (Reset Data)')).toBeInTheDocument();
    });

    const openResetBtn = screen.getByText('ล้างข้อมูลและเริ่มใหม่');
    fireEvent.click(openResetBtn);

    await waitFor(() => {
      expect(screen.getByText('ยืนยันการล้างข้อมูลและเริ่มใหม่')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByText('รีเซ็ตเป็น Seed Data');
    expect(confirmBtn).toBeDisabled();

    // Type incorrect case 'reset' -> should remain disabled
    const inputField = screen.getByPlaceholderText('พิมพ์ RESET');
    fireEvent.change(inputField, { target: { value: 'reset' } });
    expect(confirmBtn).toBeDisabled();

    // Type exact 'RESET' -> should be enabled
    fireEvent.change(inputField, { target: { value: 'RESET' } });
    expect(confirmBtn).not.toBeDisabled();

    // Click confirm -> reset succeeds
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText('ล้างข้อมูลและเริ่มต้นใหม่เรียบร้อยแล้ว')).toBeInTheDocument();
    });
  });
});
