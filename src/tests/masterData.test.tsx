import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { LocalStorageRepository } from '@/services/repositories/LocalStorageRepository';
import { CreatePoModal } from '@/features/orders/CreatePoModal';
import { MasterDataPage } from '@/features/master-data/MasterDataPage';
import { SEED_CUSTOMERS, SEED_PRODUCTS } from '@/data/seedData';

describe('PHASE 4E — Master Data for Customer & Product Tests', () => {
  let repository: LocalStorageRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageRepository();
    repository.initialize();
  });

  it('1. Can list, create, update, and deactivate customer', () => {
    const initialCustomers = repository.listCustomers(true);
    expect(initialCustomers.length).toBeGreaterThanOrEqual(5);

    // Create customer
    const createRes = repository.createCustomer({
      customerCode: 'CUST-NEW-001',
      customerName: 'บริษัท ทดสอบใหม่ จำกัด',
    });
    expect(createRes.success).toBe(true);
    expect(createRes.customer?.customerCode).toBe('CUST-NEW-001');

    // Duplicate code validation
    const dupRes = repository.createCustomer({
      customerCode: 'cust-new-001',
      customerName: 'บริษัท ซ้ำ จำกัด',
    });
    expect(dupRes.success).toBe(false);
    expect(dupRes.errors?.[0]).toContain('มีในระบบแล้ว');

    // Update customer
    const updateRes = repository.updateCustomer(createRes.customer!.customerId, {
      customerName: 'บริษัท ทดสอบใหม่ ปรับปรุง จำกัด',
    });
    expect(updateRes.success).toBe(true);
    expect(updateRes.customer?.customerName).toBe('บริษัท ทดสอบใหม่ ปรับปรุง จำกัด');

    // Deactivate customer
    const deactivateRes = repository.setCustomerActive(createRes.customer!.customerId, false);
    expect(deactivateRes.success).toBe(true);
    expect(deactivateRes.customer?.active).toBe(false);

    // List active vs all
    const activeCusts = repository.listCustomers(false);
    const allCusts = repository.listCustomers(true);
    expect(activeCusts.find((c) => c.customerCode === 'CUST-NEW-001')).toBeUndefined();
    expect(allCusts.find((c) => c.customerCode === 'CUST-NEW-001')).toBeDefined();
  });

  it('2. Can list, create, update, and deactivate product', () => {
    const initialProducts = repository.listProducts(true);
    expect(initialProducts.length).toBeGreaterThanOrEqual(10);

    // Create product
    const createRes = repository.createProduct({
      productCode: 'PROD-NEW-001',
      productName: 'เค้กช็อกโกแลต 500g',
      defaultUnit: 'กล่อง',
    });
    expect(createRes.success).toBe(true);
    expect(createRes.product?.productCode).toBe('PROD-NEW-001');

    // Duplicate code validation
    const dupRes = repository.createProduct({
      productCode: 'prod-new-001',
      productName: 'เค้กซ้ำ 500g',
      defaultUnit: 'กล่อง',
    });
    expect(dupRes.success).toBe(false);
    expect(dupRes.errors?.[0]).toContain('มีในระบบแล้ว');

    // Update product
    const updateRes = repository.updateProduct(createRes.product!.productId, {
      productName: 'เค้กช็อกโกแลตหน้านิ่ม 500g',
      defaultUnit: 'ปอนด์',
    });
    expect(updateRes.success).toBe(true);
    expect(updateRes.product?.productName).toBe('เค้กช็อกโกแลตหน้านิ่ม 500g');
    expect(updateRes.product?.defaultUnit).toBe('ปอนด์');

    // Deactivate product
    const deactivateRes = repository.setProductActive(createRes.product!.productId, false);
    expect(deactivateRes.success).toBe(true);
    expect(deactivateRes.product?.active).toBe(false);

    // List active vs all
    const activeProds = repository.listProducts(false);
    const allProds = repository.listProducts(true);
    expect(activeProds.find((p) => p.productCode === 'PROD-NEW-001')).toBeUndefined();
    expect(allProds.find((p) => p.productCode === 'PROD-NEW-001')).toBeDefined();
  });

  it('3. Create PO Modal uses Customer and Product Master Data dropdowns', async () => {
    // Add custom active customer and product
    repository.createCustomer({
      customerCode: 'CUST-DEMO',
      customerName: 'บริษัท เดโมมาสเตอร์ จำกัด',
    });
    repository.createProduct({
      productCode: 'PROD-DEMO',
      productName: 'วานิลลาคุกกี้ 150g',
      defaultUnit: 'ถุง',
    });

    render(<CreatePoModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />);

    // Customer dropdown should include master data customer
    const customerSelect = screen.getByLabelText(/ชื่อลูกค้า \*/i);
    expect(customerSelect).toBeInTheDocument();
    expect(screen.getByText(/CUST-DEMO - บริษัท เดโมมาสเตอร์ จำกัด/i)).toBeInTheDocument();

    // Select master product and verify auto-fill
    const masterProductSelect = screen.getByLabelText(/เลือกสินค้าจากข้อมูลหลัก/i);
    expect(masterProductSelect).toBeInTheDocument();

    fireEvent.change(masterProductSelect, { target: { value: repository.listProducts().find(p => p.productCode === 'PROD-DEMO')?.productId } });

    await waitFor(() => {
      const productNameInput = screen.getByLabelText(/ชื่อสินค้า \*/i) as HTMLInputElement;
      const unitInput = screen.getByLabelText(/หน่วย \*/i) as HTMLInputElement;
      expect(productNameInput.value).toBe('วานิลลาคุกกี้ 150g');
      expect(unitInput.value).toBe('ถุง');
    });
  });

  it('4. MasterDataPage UI allows toggling tabs and adding new customer', async () => {
    render(<MasterDataPage />);

    expect(screen.getByText(/ข้อมูลหลัก \(Master Data\)/i)).toBeInTheDocument();
    expect(screen.getByText(/ลูกค้า \(5\)/i)).toBeInTheDocument();

    // Switch to Products tab
    fireEvent.click(screen.getByText(/สินค้า \(10\)/i));
    expect(screen.getByText(/หน่วยเริ่มต้น/i)).toBeInTheDocument();

    // Switch back to Customers tab
    fireEvent.click(screen.getByText(/ลูกค้า \(5\)/i));
    expect(screen.getByText(/เพิ่มลูกค้า/i)).toBeInTheDocument();
  });

  it('5. Export/Import and Reset include customers and products', () => {
    const snap = repository.getSnapshot();
    expect(snap.entities.customers).toBeDefined();
    expect(snap.entities.products).toBeDefined();
    expect(snap.entities.customers.length).toBe(SEED_CUSTOMERS.length);
    expect(snap.entities.products.length).toBe(SEED_PRODUCTS.length);

    // Modify data
    repository.createCustomer({ customerCode: 'CUST-TEMP', customerName: 'Temp Customer' });
    expect(repository.listCustomers(true).length).toBe(SEED_CUSTOMERS.length + 1);

    // Reset restores seed master data
    repository.reset();
    expect(repository.listCustomers(true).length).toBe(SEED_CUSTOMERS.length);
    expect(repository.listProducts(true).length).toBe(SEED_PRODUCTS.length);
  });
});
