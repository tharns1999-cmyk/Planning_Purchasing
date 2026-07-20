import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Database, Plus, Edit2, CheckCircle, XCircle, Users, Package, AlertCircle, Search, Filter } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Autocomplete, AutocompleteOption } from '@/components/common/Autocomplete';
import { plannerRepository } from '@/services/plannerService';
import { CustomerMaster, ProductMaster } from '@/domain/types';

export const MasterDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'PRODUCTS'>('CUSTOMERS');
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);

  // Customer Filters & Modal State
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerMaster | null>(null);
  const [customerCodeInput, setCustomerCodeInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Product Filters & Modal State
  const [productSearch, setProductSearch] = useState('');
  const [productCustomerFilter, setProductCustomerFilter] = useState('ALL');
  const [productStatusFilter, setProductStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductMaster | null>(null);
  const [productCustomerIdInput, setProductCustomerIdInput] = useState('');
  const [productCustomerNameInput, setProductCustomerNameInput] = useState('');
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

  // Customer Map for fast lookup
  const customerMap = useMemo(() => {
    const map = new Map<string, CustomerMaster>();
    customers.forEach((c) => map.set(c.customerId, c));
    return map;
  }, [customers]);

  // Options for Product Customer Selection
  const activeCustomerOptions = useMemo<AutocompleteOption[]>(() => {
    const activeCusts = customers.filter((c) => c.active);
    // Include current editing customer if inactive
    if (editingProduct?.customerId) {
      const currentCust = customers.find((c) => c.customerId === editingProduct.customerId);
      if (currentCust && !currentCust.active && !activeCusts.some((c) => c.customerId === currentCust.customerId)) {
        activeCusts.push(currentCust);
      }
    }
    return activeCusts.map((c) => ({
      value: c.customerId,
      label: `${c.customerCode} - ${c.customerName}`,
      subLabel: c.customerName,
      data: c,
    }));
  }, [customers, editingProduct]);

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const cust = prod.customerId ? customerMap.get(prod.customerId) : null;
      const custName = cust ? cust.customerName : 'ยังไม่ผูกลูกค้า';

      // Status filter
      if (productStatusFilter === 'ACTIVE' && !prod.active) return false;
      if (productStatusFilter === 'INACTIVE' && prod.active) return false;

      // Customer filter
      if (productCustomerFilter !== 'ALL' && prod.customerId !== productCustomerFilter) {
        if (productCustomerFilter === 'UNLINKED' && prod.customerId) return false;
        if (productCustomerFilter !== 'UNLINKED' && prod.customerId !== productCustomerFilter) return false;
      }

      // Search text filter
      if (productSearch.trim()) {
        const query = productSearch.toLowerCase().trim();
        const matchesCode = prod.productCode.toLowerCase().includes(query);
        const matchesName = prod.productName.toLowerCase().includes(query);
        const matchesCust = custName.toLowerCase().includes(query);
        if (!matchesCode && !matchesName && !matchesCust) return false;
      }

      return true;
    });
  }, [products, customerMap, productStatusFilter, productCustomerFilter, productSearch]);

  // Filtered Customers List
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      if (customerSearch.trim()) {
        const query = customerSearch.toLowerCase().trim();
        const matchesCode = cust.customerCode.toLowerCase().includes(query);
        const matchesName = cust.customerName.toLowerCase().includes(query);
        if (!matchesCode && !matchesName) return false;
      }
      return true;
    });
  }, [customers, customerSearch]);

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
    setProductCustomerIdInput('');
    setProductCustomerNameInput('');
    setProductCodeInput('');
    setProductNameInput('');
    setDefaultUnitInput('ชิ้น');
    setProductError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: ProductMaster) => {
    setEditingProduct(prod);
    setProductCustomerIdInput(prod.customerId || '');
    const currentCust = prod.customerId ? customerMap.get(prod.customerId) : null;
    setProductCustomerNameInput(currentCust ? `${currentCust.customerCode} - ${currentCust.customerName}` : '');
    setProductCodeInput(prod.productCode);
    setProductNameInput(prod.productName);
    setDefaultUnitInput(prod.defaultUnit);
    setProductError(null);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = () => {
    setProductError(null);
    if (!productCustomerIdInput) {
      setProductError('กรุณาเลือกลูกค้า');
      return;
    }
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
        customerId: productCustomerIdInput,
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
        customerId: productCustomerIdInput,
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
            จัดการข้อมูลมาสเตอร์สำหรับรายชื่อลูกค้าและสินค้าผูกกับลูกค้าสำหรับใช้ในใบสั่งซื้อและการวางแผน
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

      {/* Tab 1: Customers Table & Filters */}
      {activeTab === 'CUSTOMERS' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-2xs">
            <div className="w-72">
              <Input
                placeholder="ค้นหารหัส หรือ ชื่อลูกค้า..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {filteredCustomers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">ไม่พบข้อมูลลูกค้าที่ตรงตามเงื่อนไข</div>
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
                    {filteredCustomers.map((cust) => (
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
        </div>
      )}

      {/* Tab 2: Products Table & Filters */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-2xs">
            <div className="w-64">
              <Input
                placeholder="ค้นหารหัส, ชื่อสินค้า, ลูกค้า..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="w-64">
              <Select
                value={productCustomerFilter}
                onChange={(e) => setProductCustomerFilter(e.target.value)}
                leftIcon={<Filter className="w-3.5 h-3.5" />}
                options={[
                  { value: 'ALL', label: 'ทุกลูกค้า' },
                  { value: 'UNLINKED', label: '⚠️ ยังไม่ผูกลูกค้า (Legacy)' },
                  ...customers.map((c) => ({ value: c.customerId, label: `${c.customerCode} - ${c.customerName}` })),
                ]}
              />
            </div>

            <div className="w-40">
              <Select
                value={productStatusFilter}
                onChange={(e) => setProductStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                options={[
                  { value: 'ALL', label: 'สถานะทั้งหมด' },
                  { value: 'ACTIVE', label: 'ใช้งานอยู่' },
                  { value: 'INACTIVE', label: 'ปิดใช้งาน' },
                ]}
              />
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">ไม่พบข้อมูลสินค้าที่ตรงตามเงื่อนไข</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                      <th className="py-3 px-4 w-32">รหัสสินค้า</th>
                      <th className="py-3 px-4">ชื่อสินค้า</th>
                      <th className="py-3 px-4 w-56">ลูกค้า</th>
                      <th className="py-3 px-4 w-24 text-center">หน่วยเริ่มต้น</th>
                      <th className="py-3 px-4 w-28 text-center">สถานะ</th>
                      <th className="py-3 px-4 w-44 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((prod) => {
                      const cust = prod.customerId ? customerMap.get(prod.customerId) : null;
                      return (
                        <tr key={prod.productId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">{prod.productCode}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{prod.productName}</td>
                          <td className="py-3 px-4">
                            {cust ? (
                              <span className="font-medium text-slate-800">{cust.customerName}</span>
                            ) : (
                              <span className="text-amber-700 font-medium text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                                ยังไม่ผูกลูกค้า
                              </span>
                            )}
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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

          <Autocomplete
            label="ลูกค้า *"
            placeholder="พิมพ์หรือเลือกลูกค้า..."
            value={productCustomerNameInput}
            options={activeCustomerOptions}
            onChange={(val) => {
              setProductCustomerNameInput(val);
              // Check if matching option label
              const matched = activeCustomerOptions.find((opt) => opt.label === val);
              if (matched) {
                setProductCustomerIdInput(matched.value);
              }
            }}
            onSelectOption={(opt) => {
              setProductCustomerIdInput(opt.value);
              setProductCustomerNameInput(opt.label);
            }}
            emptyText="ไม่พบลูกค้า"
          />

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
