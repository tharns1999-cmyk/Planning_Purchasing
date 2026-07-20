import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreatePoModal } from '../features/orders/CreatePoModal';
import { plannerRepository } from '../services/plannerService';
import { Priority } from '../domain/types';

describe('Phase 2B.2.1 — Create PO Modal Simplification Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
  });

  it('1. Renders Customer Dropdown select and lacks productCode / line priority / line note inputs', () => {
    render(<CreatePoModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    // Verify Customer field is a select dropdown with "เลือกลูกค้า"
    expect(screen.getByText('เลือกลูกค้า')).toBeInTheDocument();

    // Verify product line form has NO productCode, line priority, or line note inputs
    expect(screen.queryByPlaceholderText('รหัสสินค้า *')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('หมายเหตุรายการ')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('เช่น พายไก่ไข่เค็ม 120g')).toBeInTheDocument();
  });

  it('2. Fails validation if customer selection is not chosen', () => {
    render(<CreatePoModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    // Fill PO Header
    fireEvent.change(screen.getByPlaceholderText('เช่น PO-2026-004'), {
      target: { value: 'PO-2026-999' },
    });

    const saveBtn = screen.getByText('บันทึก PO');
    fireEvent.click(saveBtn);

    expect(screen.getByText('กรุณาเลือกลูกค้า')).toBeInTheDocument();
  });

  it('3. Fails validation if Product Name or Quantity <= 0 is invalid', () => {
    render(<CreatePoModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    // Fill PO Header
    fireEvent.change(screen.getByPlaceholderText('เช่น PO-2026-004'), {
      target: { value: 'PO-2026-999' },
    });

    const customerSelect = screen.getAllByRole('combobox')[0]!;
    fireEvent.change(customerSelect, { target: { value: 'บริษัท อิ่มอร่อย พลาซ่า จำกัด' } });

    // Leave product name empty
    fireEvent.click(screen.getByText('บันทึก PO'));
    expect(screen.getByText('กรุณากรอกชื่อสินค้าในรายการที่ 1')).toBeInTheDocument();
  });

  it('4. Successfully creates PO without productCode input, inheriting PO Header priority', () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(<CreatePoModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />);

    // Fill PO Header with URGENT priority
    fireEvent.change(screen.getByPlaceholderText('เช่น PO-2026-004'), {
      target: { value: 'PO-2026-888' },
    });

    const selects = screen.getAllByRole('combobox');
    const customerSelect = selects[0]!;
    const prioritySelect = selects[1]!;

    fireEvent.change(customerSelect, { target: { value: 'บริษัท อิ่มอร่อย พลาซ่า จำกัด' } });
    fireEvent.change(prioritySelect, { target: { value: Priority.URGENT } });

    // Fill Product Line 1
    fireEvent.change(screen.getByPlaceholderText('เช่น พายไก่ไข่เค็ม 120g'), {
      target: { value: 'ขนมปังอบเนยสด 250g' },
    });

    // Submit form
    fireEvent.click(screen.getByText('บันทึก PO'));

    expect(handleSuccess).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();

    // Verify repository contains new PO
    const createdOrder = plannerRepository.listSalesOrders().find((o) => o.orderNo === 'PO-2026-888');
    expect(createdOrder).toBeDefined();

    const detail = plannerRepository.getSalesOrderWithLines(createdOrder!.id);
    expect(detail).not.toBeNull();
    expect(detail?.order.orderNo).toBe('PO-2026-888');
    expect(detail?.lines).toHaveLength(1);
    expect(detail?.lines[0]!.skuName).toBe('ขนมปังอบเนยสด 250g');
    expect(detail?.lines[0]!.priority).toBe(Priority.URGENT); // Inherits header priority!
  });

  it('5. Shows error message when attempting to create duplicate PO', () => {
    render(<CreatePoModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    // Duplicate PO number
    fireEvent.change(screen.getByPlaceholderText('เช่น PO-2026-004'), {
      target: { value: 'PO-2026-001' },
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0]!, { target: { value: 'บริษัท อิ่มอร่อย พลาซ่า จำกัด' } });

    fireEvent.change(screen.getByPlaceholderText('เช่น พายไก่ไข่เค็ม 120g'), {
      target: { value: 'สินค้าทดสอบ' },
    });

    fireEvent.click(screen.getByText('บันทึก PO'));

    expect(screen.getByText('เลขที่ PO นี้มีอยู่แล้วในระบบ')).toBeInTheDocument();
  });

  it('6. Closes modal when clicking cancel button', () => {
    const handleClose = vi.fn();
    render(<CreatePoModal isOpen={true} onClose={handleClose} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByText('ยกเลิก'));
    expect(handleClose).toHaveBeenCalled();
  });
});
