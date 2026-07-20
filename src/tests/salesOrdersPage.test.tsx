import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { OrdersPage } from '../features/orders/OrdersPage';
import { plannerRepository } from '../services/plannerService';

describe('Phase 2B.1 — Sales Orders Read-Only Page Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
  });

  it('1. Successfully renders Sales Orders page title and KPI summary cards', () => {
    render(<OrdersPage />);

    expect(screen.getByText('ใบสั่งซื้อ (Sales Orders)')).toBeInTheDocument();
    expect(screen.getByText('จำนวน PO ทั้งหมด')).toBeInTheDocument();
    expect(screen.getByText('จำนวนรายการสินค้า')).toBeInTheDocument();
    expect(screen.getByText('รายการสินค้าด่วน')).toBeInTheDocument();
    expect(screen.getByText('รายการยังไม่วางแผน')).toBeInTheDocument();
  });

  it('2. Displays PO list from Seed Data', () => {
    render(<OrdersPage />);

    expect(screen.getByText('PO-2026-001')).toBeInTheDocument();
    expect(screen.getByText('PO-2026-002')).toBeInTheDocument();
    expect(screen.getByText('PO-2026-003')).toBeInTheDocument();
  });

  it('3. Expands PO card to display product lines when clicked', () => {
    render(<OrdersPage />);

    // Click on PO-2026-001 card to expand
    const poCard = screen.getByText('PO-2026-001');
    fireEvent.click(poCard);

    // Product line SKU names should appear
    expect(screen.getByText('พายไก่ไข่เค็ม 120g')).toBeInTheDocument();
    expect(screen.getByText('ขนมปังเนยสด 200g')).toBeInTheDocument();
  });

  it('4. Searches PO list by PO number', () => {
    render(<OrdersPage />);

    const searchInput = screen.getByPlaceholderText('ค้นหา PO/ลูกค้า/สินค้า');
    fireEvent.change(searchInput, { target: { value: 'PO-2026-002' } });

    expect(screen.getByText('PO-2026-002')).toBeInTheDocument();
    expect(screen.queryByText('PO-2026-001')).not.toBeInTheDocument();
  });

  it('5. Searches PO list by Customer name', () => {
    render(<OrdersPage />);

    const searchInput = screen.getByPlaceholderText('ค้นหา PO/ลูกค้า/สินค้า');
    fireEvent.change(searchInput, { target: { value: 'บริษัท อิ่มอร่อย พลาซ่า จำกัด' } });

    expect(screen.getByText('PO-2026-001')).toBeInTheDocument();
    expect(screen.queryByText('PO-2026-003')).not.toBeInTheDocument();
  });

  it('6. Filters PO list by Priority (ด่วน)', () => {
    render(<OrdersPage />);

    const selects = screen.getAllByRole('combobox');
    const prioritySelect = selects[0]!;

    fireEvent.change(prioritySelect, { target: { value: 'URGENT' } });

    // Only POs with URGENT lines should remain
    expect(screen.getByText('PO-2026-001')).toBeInTheDocument();
  });

  it('7. Displays EmptyState when search query matches no items', () => {
    render(<OrdersPage />);

    const searchInput = screen.getByPlaceholderText('ค้นหา PO/ลูกค้า/สินค้า');
    fireEvent.change(searchInput, { target: { value: 'NONEXISTENT_PO_999' } });

    expect(screen.getByText('ไม่พบรายการใบสั่งซื้อ')).toBeInTheDocument();
    expect(screen.getByText('ไม่พบข้อมูล PO ที่ตรงกับคำค้นหาหรือตัวกรองที่เลือกไว้')).toBeInTheDocument();
  });

  it('8. Clicking "สร้าง PO" button opens CreatePoModal', () => {
    render(<OrdersPage />);

    const createBtn = screen.getByText('สร้าง PO');
    fireEvent.click(createBtn);

    expect(screen.getByText('สร้างใบสั่งซื้อใหม่ (Create PO)')).toBeInTheDocument();
  });
});
