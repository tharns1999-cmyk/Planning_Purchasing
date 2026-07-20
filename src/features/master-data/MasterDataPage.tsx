import React, { useState, useEffect, useCallback } from 'react';
import { Database, Plus, Edit2, CheckCircle, XCircle, Users, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { plannerRepository } from '@/services/plannerService';
import { CustomerMaster, ProductMaster } from '@/domain/types';

export const MasterDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'PRODUCTS'>('CUSTOMERS');
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);

  // Customer Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerMaster | null>(null);
  const [customerCodeInput, setCustomerCodeInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductMaster | null>(null);
  const [productCodeInput, setProductCodeInput] = useState('');
  const [productNameInput, setProductNameInput] = useState('');
  const [defaultUnitInput, setDefaultUnitInput] = useState('ชิ้น');
  const [productError, setProductError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    try {
      plannerRepository.initialize();
      const custs = plannerRepository.listCustomers(true);
      const prods = plannerRepository.listProducts(true);
      setCustomers(custs);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Customer Modal Handlers
  const handleOpenCreateCustomer = () => {
    setEditingCustomer(null);
    setCustomerCodeInput('');
    setCustomerNameInput('');
    setCustomerError(null);
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (cust: CustomerMaster) => {
    setEditingCustomer(cust);
    setCustomerCodeInput(cust.customerCode);
    setCustomerNameInput(cust.customerName);
    setCustomerError(null);
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = () => {
    setCustomerError(null);
    if (!customerCodeInput.trim()) {
      setCustomerError('กรุณากรอกรหัสลูกค้า');
      return;
    }
    if (!customerNameInput.trim()) {
      setCustomerError('กรุณากรอกชื่อลูกค้า');
      return;
    }

    if (editingCustomer) {
      const res = plannerRepository.updateCustomer(editingCustomer.customerId, {
        customerCode: customerCodeInput,
        customerName: customerNameInput,
      });
      if (res.success) {
        setIsCustomerModalOpen(false);
        loadData();
      } else {
        setCustomerError(res.errors?.[0] || 'เกิดข้อผิดพลาดในการแก้ไขลูกค้า');
      }
    } else {
      const res = plannerRepository.createCustomer({
        customerCode: customerCodeInput,
        customerName: customerNameInput,
      });
      if (res.success) {
        setIsCustomerModalOpen(false);
        loadData();
      } else {
        setCustomerError(res.errors?.[0] || 'เกิดข้อผิดพลาดในการเพิ่มลูกค้า');
      }
    }
  };

  const handleToggleCustomerActive = (cust: CustomerMaster) => {
    plannerRepository.setCustomerActive(cust.customerId, !cust.active);
    loadData();
  };

  // Product Modal Handlers
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProductCodeInput('');
    setProductNameInput('');
    setDefaultUnitInput('ชิ้น');
    setProductError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: ProductMaster) => {
    setEditingProduct(prod);
    setProductCodeInput(prod.productCode);
    setProductNameInput(prod.productName);
    setDefaultUnitInput(prod.defaultUnit);
    setProductError(null);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = () => {
    setProductError(null);
    if (!productCodeInput.trim()) {
      setProductError('กรุณากรอกรหัสสินค้า');
      return;
    }
    if (!productNameInput.trim()) {
      setProductError('กรุณากรอกชื่อสินค้า');
      return;
    }
    if (!defaultUnitInput.trim()) {
      setProductError('กรุณากรอกหน่วยเริ่มต้น');
      return;
    }

    if (editingProduct) {
      const res = plannerRepository.updateProduct(editingProduct.productId, {
        productCode: productCodeInput,
        productName: productNameInput,
        defaultUnit: defaultUnitInput,
      });
      if (res.success) {
        setIsProductModalOpen(false);
        loadData();
      } else {
        setProductError(res.errors?.[0] || 'เกิดข้อผิดพลาดในการแก้ไขสินค้า');
      }
    } else {
      const res = plannerRepository.createProduct({
        productCode: productCodeInput,
        productName: productNameInput,
        defaultUnit: defaultUnitInput,
      });
      if (res.success) {
        setIsProductModalOpen(false);
        loadData();
      } else {
        setProductError(res.errors?.[0] || 'เกิดข้อผิดพลาดในการเพิ่มสินค้า');
      }
    }
  };

  const handleToggleProductActive = (prod: ProductMaster) => {
    plannerRepository.setProductActive(prod.productId, !prod.active);
    loadData();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-sky-600" />
            <span>ข้อมูลหลัก (Master Data)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            จัดการข้อมูลมาสเตอร์สำหรับรายชื่อลูกค้าและสินค้าสำหรับใช้ในใบสั่งซื้อและการวางแผน
          </p>
        </div>

        {activeTab === 'CUSTOMERS' ? (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateCustomer}
          >
            เพิ่มลูกค้า
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateProduct}
          >
            เพิ่มสินค้า
          </Button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'CUSTOMERS'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ลูกค้า ({customers.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PRODUCTS')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'PRODUCTS'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>สินค้า ({products.length})</span>
        </button>
      </div>

      {/* Tab 1: Customers Table */}
      {activeTab === 'CUSTOMERS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {customers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">ยังไม่มีข้อมูลลูกค้าในระบบ</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4 w-36">รหัสลูกค้า</th>
                    <th className="py-3 px-4">ชื่อลูกค้า</th>
                    <th className="py-3 px-4 w-32 text-center">สถานะ</th>
                    <th className="py-3 px-4 w-44 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((cust) => (
                    <tr key={cust.customerId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{cust.customerCode}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{cust.customerName}</td>
                      <td className="py-3 px-4 text-center">
                        {cust.active ? (
                          <Badge variant="emerald" label="ใช้งานอยู่" />
                        ) : (
                          <Badge variant="slate" label="ปิดใช้งาน" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenEditCustomer(cust)}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          variant={cust.active ? 'danger' : 'secondary'}
                          size="sm"
                          leftIcon={cust.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          onClick={() => handleToggleCustomerActive(cust)}
                        >
                          {cust.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Products Table */}
      {activeTab === 'PRODUCTS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {products.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">ยังไม่มีข้อมูลสินค้าในระบบ</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-3 px-4 w-36">รหัสสินค้า</th>
                    <th className="py-3 px-4">ชื่อสินค้า</th>
                    <th className="py-3 px-4 w-28 text-center">หน่วยเริ่มต้น</th>
                    <th className="py-3 px-4 w-32 text-center">สถานะ</th>
                    <th className="py-3 px-4 w-44 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((prod) => (
                    <tr key={prod.productId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{prod.productCode}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{prod.productName}</td>
                      <td className="py-3 px-4 text-center font-medium text-slate-600">{prod.defaultUnit}</td>
                      <td className="py-3 px-4 text-center">
                        {prod.active ? (
                          <Badge variant="emerald" label="ใช้งานอยู่" />
                        ) : (
                          <Badge variant="slate" label="ปิดใช้งาน" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenEditProduct(prod)}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          variant={prod.active ? 'danger' : 'secondary'}
                          size="sm"
                          leftIcon={prod.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          onClick={() => handleToggleProductActive(prod)}
                        >
                          {prod.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Customer Create/Edit Modal */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title={editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCustomerModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="primary" onClick={handleSaveCustomer}>
              บันทึก
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {customerError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{customerError}</span>
            </div>
          )}
          <Input
            label="รหัสลูกค้า *"
            placeholder="เช่น CUST-006"
            value={customerCodeInput}
            onChange={(e) => setCustomerCodeInput(e.target.value)}
          />
          <Input
            label="ชื่อลูกค้า *"
            placeholder="เช่น บริษัท อิ่มอร่อย จำกัด"
            value={customerNameInput}
            onChange={(e) => setCustomerNameInput(e.target.value)}
          />
        </div>
      </Modal>

      {/* Product Create/Edit Modal */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}
        maxWidth="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsProductModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="primary" onClick={handleSaveProduct}>
              บันทึก
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {productError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{productError}</span>
            </div>
          )}
          <Input
            label="รหัสสินค้า *"
            placeholder="เช่น PROD-BAK-005"
            value={productCodeInput}
            onChange={(e) => setProductCodeInput(e.target.value)}
          />
          <Input
            label="ชื่อสินค้า *"
            placeholder="เช่น ขนมปังเนยสด 200g"
            value={productNameInput}
            onChange={(e) => setProductNameInput(e.target.value)}
          />
          <Input
            label="หน่วยเริ่มต้น *"
            placeholder="เช่น ชิ้น, กล่อง, ถุง"
            value={defaultUnitInput}
            onChange={(e) => setDefaultUnitInput(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
