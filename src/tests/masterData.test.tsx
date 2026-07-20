import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocalStorageRepository } from '@/services/repositories/LocalStorageRepository';
import { CreatePoModal } from '@/features/orders/CreatePoModal';
import { MasterDataPage } from '@/features/master-data/MasterDataPage';
import { SEED_CUSTOMERS } from '@/data/seedData';


describe('PHASE 5E — Customer-Linked Product Master & Create PO Autocomplete Tests', () => {
  let repository: LocalStorageRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageRepository();
    repository.initialize();
  });

  it('1. Create Product requires Customer selection & validates inputs', () => {
    // Failing without customerId
    const failRes = repository.createProduct({
      customerId: '',
      productCode: 'PROD-TEST-001',
      productName: 'สินค้าทดสอบ 100g',
      defaultUnit: 'ชิ้น',
    });
    expect(failRes.success).toBe(false);
    expect(failRes.errors?.[0]).toContain('กรุณาเลือกลูกค้า');

    // Success with valid customerId
    const cust = repository.listCustomers()[0]!;
    const successRes = repository.createProduct({
      customerId: cust.customerId,
      productCode: 'PROD-TEST-001',
      productName: 'สินค้าทดสอบ 100g',
      defaultUnit: 'ชิ้น',
    });
    expect(successRes.success).toBe(true);
    expect(successRes.product?.customerId).toBe(cust.customerId);
  });

  it('2. listProductsByCustomer returns only active/inactive products linked to that customer', () => {
    const cust1 = SEED_CUSTOMERS[0]!;
    const cust1Products = repository.listProductsByCustomer(cust1.customerId, true);
    expect(cust1Products.length).toBeGreaterThan(0);
    expect(cust1Products.every((p) => p.customerId === cust1.customerId)).toBe(true);

    // Deactivate a product for cust1
    const p1 = cust1Products[0]!;
    repository.setProductActive(p1.productId, false);

    const activeCust1Products = repository.listProductsByCustomer(cust1.customerId, false);
    expect(activeCust1Products.find((p) => p.productId === p1.productId)).toBeUndefined();
  });

  it('3. MasterDataPage Product table displays customer name & unlinked legacy badge', async () => {
    // Add legacy product without customerId
    const snapshot = repository.getSnapshot();
    snapshot.entities.products.push({
      productId: 'prod-legacy',
      productCode: 'PROD-LEGACY',
      productName: 'สินค้าเลกาซีไม่มีลูกค้า',
      defaultUnit: 'ถุง',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem('weekly-production-planner-db', JSON.stringify(snapshot));

    render(<MasterDataPage />);

    // Switch to Products tab
    fireEvent.click(screen.getByText(/สินค้า \(/i));

    await waitFor(() => {
      expect(screen.getByText('PROD-LEGACY')).toBeInTheDocument();
      expect(screen.getByText('ยังไม่ผูกลูกค้า')).toBeInTheDocument();
    });
  });

  it('4. Create PO Modal: Product field disabled when no customer selected & warns when customer has no products', async () => {
    // Create customer with zero products
    repository.createCustomer({
      customerCode: 'CUST-EMPTY',
      customerName: 'บริษัท ไม่มีสินค้า จำกัด',
    });


    render(<CreatePoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />);

    // Product name input should be disabled initially
    const productInput = screen.getByPlaceholderText('กรุณาเลือกลูกค้าก่อน') as HTMLInputElement;
    expect(productInput).toBeDisabled();

    // Select customer without products
    const customerInput = screen.getByPlaceholderText(/พิมพ์ค้นหารหัส หรือ ชื่อลูกค้า/i);
    fireEvent.focus(customerInput);
    fireEvent.change(customerInput, { target: { value: 'CUST-EMPTY' } });

    await waitFor(() => {
      expect(screen.getByText(/CUST-EMPTY - บริษัท ไม่มีสินค้า จำกัด/i)).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText(/CUST-EMPTY - บริษัท ไม่มีสินค้า จำกัด/i));

    // Product input should show warning placeholder
    await waitFor(() => {
      expect(screen.getByPlaceholderText('ยังไม่มีรายการสินค้าของลูกค้านี้ กรุณาเพิ่มในข้อมูลหลักก่อน')).toBeInTheDocument();
    });
  });

  it('5. Create PO Modal: Autocomplete filters products by selected customer & auto-fills details', async () => {
    const cust1 = SEED_CUSTOMERS[0]!; // บริษัท อิ่มอร่อย พลาซ่า จำกัด
    const cust1Prods = repository.listProductsByCustomer(cust1.customerId);
    const targetProd = cust1Prods[0]!;

    render(<CreatePoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />);

    // Search and select Customer 1
    const customerInput = screen.getByPlaceholderText(/พิมพ์ค้นหารหัส หรือ ชื่อลูกค้า/i);
    fireEvent.focus(customerInput);
    fireEvent.change(customerInput, { target: { value: cust1.customerCode } });

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`${cust1.customerCode} - ${cust1.customerName}`, 'i'))).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText(new RegExp(`${cust1.customerCode} - ${cust1.customerName}`, 'i')));

    // Search Product for Customer 1
    const productInput = screen.getByPlaceholderText('พิมพ์ค้นหา หรือ เลือกสินค้า...') as HTMLInputElement;
    expect(productInput).not.toBeDisabled();
    fireEvent.focus(productInput);

    await waitFor(() => {
      expect(screen.getByText(targetProd.productName)).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText(targetProd.productName));

    // Product details auto-filled
    await waitFor(() => {
      expect(productInput.value).toBe(targetProd.productName);
      const unitInput = screen.getByLabelText(/หน่วย \*/i) as HTMLInputElement;
      expect(unitInput.value).toBe(targetProd.defaultUnit);
    });
  });

  it('6. Create PO Modal: Changing customer with active product lines prompts Thai confirm dialog', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<CreatePoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />);

    // Select Customer 1
    const customerInput = screen.getByPlaceholderText(/พิมพ์ค้นหารหัส หรือ ชื่อลูกค้า/i);
    fireEvent.focus(customerInput);
    fireEvent.change(customerInput, { target: { value: 'CUST-001' } });

    await waitFor(() => {
      expect(screen.getByText(/CUST-001 - บริษัท อิ่มอร่อย พลาซ่า จำกัด/i)).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText(/CUST-001 - บริษัท อิ่มอร่อย พลาซ่า จำกัด/i));

    // Type a product name
    const productInput = screen.getByPlaceholderText('พิมพ์ค้นหา หรือ เลือกสินค้า...') as HTMLInputElement;
    fireEvent.change(productInput, { target: { value: 'พายไก่พิเศษ' } });

    // Change to Customer 2
    fireEvent.focus(customerInput);
    fireEvent.change(customerInput, { target: { value: 'CUST-002' } });

    await waitFor(() => {
      expect(screen.getByText(/CUST-002 - ห้างสรรพสินค้า เซ็นทรัลฟู้ดฮอลล์/i)).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByText(/CUST-002 - ห้างสรรพสินค้า เซ็นทรัลฟู้ดฮอลล์/i));

    // Confirmation was triggered
    expect(confirmSpy).toHaveBeenCalledWith('การเปลี่ยนลูกค้าจะล้างรายการสินค้าใน PO ทั้งหมด คุณต้องการเปลี่ยนหรือไม่?');

    confirmSpy.mockRestore();
  });

  it('7. Import database validates customerId reference in products', () => {
    const validSnap = repository.getSnapshot();

    // Invalid product reference to non-existent customerId
    const invalidSnap = structuredClone(validSnap);
    invalidSnap.entities.products.push({
      productId: 'prod-invalid',
      productCode: 'PROD-INVALID',
      productName: 'สินค้าอ้างอิงลูกค้าไม่มีจริง',
      defaultUnit: 'ชิ้น',
      customerId: 'cust-non-existent-999',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = repository.importDatabase(invalidSnap);
    expect(res.success).toBe(false);
    expect(res.errors?.[0]).toContain("รหัสลูกค้า 'cust-non-existent-999' สำหรับสินค้า 'PROD-INVALID' ไม่มีในระบบ");
  });
});
