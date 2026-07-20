import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreatePoModal } from '../features/orders/CreatePoModal';
import { plannerRepository } from '../services/plannerService';
import { Priority } from '../domain/types';

describe('Phase 2B.2.1 — Create PO Modal Simplification Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
  });

  it('1. Renders Customer Autocomplete and locks product field when customer not selected', () => {
    render(<CreatePoModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    // Customer field is Autocomplete
    expect(screen.getByPlaceholderText(/พิมพ์ค้นหารหัส หรือ ชื่อลูกค้า/i)).toBeInTheDocument();

    // Verify product field disabled before customer selected
    expect(screen.getByPlaceholderText('กรุณาเลือกลูกค้าก่อน')).toBeDisabled();
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

  it('3. Fails validation if Product Name is empty', async () => {
    render(<CreatePoModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    // Fill PO Header
    fireEvent.change(screen.getByPlaceholderText('เช่น PO-2026-004'), {
      target: { value: 'PO-2026-999' },
    });

    const customerInput = screen.getByPlaceholderText(/พิมพ์ค้นหารหัส หรือ ชื่อลูกค้า/i);
    fireEvent.focus(customerInput);
    fireEvent.change(customerInput, { target: { value: 'CUST-001' } });

    await waitFor(() => {
      expect(screen.getByText(/CUST-001 - บริษัท อิ่มอร่อย พลาซ่า จำกัด/i)).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText(/CUST-001 - บริษัท อิ่มอร่อย พลาซ่า จำกัด/i));

    // Clear product name input
    const productInput = screen.getByPlaceholderText('พิมพ์ค้นหา หรือ เลือกสินค้า...') as HTMLInputElement;
    fireEvent.change(productInput, { target: { value: '' } });

    // Leave product name empty and submit
    fireEvent.click(screen.getByText('บันทึก PO'));
    expect(screen.getByText('กรุณากรอกชื่อสินค้าในรายการที่ 1')).toBeInTheDocument();
  });

  it('4. Successfully creates PO without productCode input, inheriting PO Header priority', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(<CreatePoModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />);

    // Fill PO Header with URGENT priority
    fireEvent.change(screen.getByPlaceholderText('เช่น PO-2026-004'), {
      target: { value: 'PO-2026-888' },
    });

    const customerInput = screen.getByPlaceholderText(/พิมพ์ค้นหารหัส หรือ ชื่อลูกค้า/i);
    fireEvent.focus(customerInput);
    fireEvent.change(customerInput, { target: { value: 'CUST-001' } });

    await waitFor(() => {
      expect(screen.getByText(/CUST-001 - บริษัท อิ่มอร่อย พลาซ่า จำกัด/i)).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText(/CUST-001 - บริษัท อิ่มอร่อย พลาซ่า จำกัด/i));

    const prioritySelect = screen.getByLabelText('ความเร่งด่วน');
    fireEvent.change(prioritySelect, { target: { value: Priority.URGENT } });

    // Fill Product Line 1
    const productInput = screen.getByPlaceholderText('พิมพ์ค้นหา หรือ เลือกสินค้า...');
    fireEvent.change(productInput, {
      target: { value: 'ขนมปังอบเนยสด 250g' },
    });

    // Submit form
    fireEvent.click(screen.getByText('บันทึก PO'));

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });

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

  it('5. Shows error message when attempting to create duplicate PO', async () => {
    render(<CreatePoModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    // Duplicate PO number
    fireEvent.change(screen.getByPlaceholderText('เช่น PO-2026-004'), {
      target: { value: 'PO-2026-001' },
    });

    const customerInput = screen.getByPlaceholderText(/พิมพ์ค้นหารหัส หรือ ชื่อลูกค้า/i);
    fireEvent.focus(customerInput);
    fireEvent.change(customerInput, { target: { value: 'CUST-001' } });

    await waitFor(() => {
      expect(screen.getByText(/CUST-001 - บริษัท อิ่มอร่อย พลาซ่า จำกัด/i)).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText(/CUST-001 - บริษัท อิ่มอร่อย พลาซ่า จำกัด/i));

    const productInput = screen.getByPlaceholderText('พิมพ์ค้นหา หรือ เลือกสินค้า...');
    fireEvent.change(productInput, {
      target: { value: 'สินค้าทดสอบ' },
    });

    fireEvent.click(screen.getByText('บันทึก PO'));

    await waitFor(() => {
      expect(screen.getByText('เลขที่ PO นี้มีอยู่แล้วในระบบ')).toBeInTheDocument();
    });
  });

  it('6. Closes modal when clicking cancel button', () => {
    const handleClose = vi.fn();
    render(<CreatePoModal isOpen={true} onClose={handleClose} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByText('ยกเลิก'));
    expect(handleClose).toHaveBeenCalled();
  });
});
