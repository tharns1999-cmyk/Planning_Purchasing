// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Edit2, Plus, Trash2, AlertCircle, Calendar, Lock } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Autocomplete, AutocompleteOption } from '@/components/common/Autocomplete';
import { Priority, CustomerMaster, ProductMaster } from '@/domain/types';
import { plannerRepository } from '@/services/plannerService';
import { SalesOrderWithLinesDetail, UpdateSalesOrderLineItemInput } from '@/services/repositories/PlannerRepository';

export interface EditPoModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderDetail: SalesOrderWithLinesDetail | null;
  onSuccess: () => void;
}

interface EditableLineState {
  id?: string;
  tempKey: string;
  skuCode: string;
  skuName: string;
  orderedQty: string;
  unit: string;
  dueDate: string;
  priority: Priority;
  notes: string;
  packaging: string;
  boxQty: string;
  isAllocated: boolean;
}

export const EditPoModal: React.FC<EditPoModalProps> = ({
  isOpen,
  onClose,
  orderDetail,
  onSuccess,
}) => {
  const [poNumberInput, setPoNumberInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [orderDateInput, setOrderDateInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [headerPriority, setHeaderPriority] = useState<Priority>(Priority.NORMAL);

  const [lines, setLines] = useState<EditableLineState[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Master Data lookup
  const [customers, setCustomers] = useState<CustomerMaster[]>([]);
  const [products, setProducts] = useState<ProductMaster[]>([]);

  useEffect(() => {
    if (isOpen) {
      plannerRepository.initialize();
      setCustomers(plannerRepository.listCustomers(true));
      setProducts(plannerRepository.listProducts(true));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && orderDetail) {
      setErrorBanner(null);
      const { order, lines: existingLines } = orderDetail;

      setPoNumberInput(order.orderNo);
      setCustomerNameInput(order.customerName);
      setOrderDateInput(order.orderDate);
      setNoteInput(order.note || '');
      setHeaderPriority(
        existingLines.some((l) => l?.priority === Priority.URGENT) ? Priority.URGENT : Priority.NORMAL
      );

      // Match customerId if available
      const matchedCust = customers.find((c) => c.customerName === order.customerName);
      setSelectedCustomerId(matchedCust?.customerId || null);

      // Transform existing lines
      const editable = existingLines.map((l) => ({
        id: l.id,
        tempKey: l.id,
        skuCode: l.skuCode || '',
        skuName: l?.skuName,
        orderedQty: String(l?.orderedQty),
        unit: l?.unit,
        dueDate: l?.dueDate,
        priority: l?.priority,
        notes: l?.notes || '',
        packaging: l?.packaging || '',
        boxQty: l?.boxQty ? String(l?.boxQty) : '',
        isAllocated: plannerRepository.isLineAllocated(l.id),
      }));

      setLines(editable);
    }
  }, [isOpen, orderDetail, customers]);

  const customerOptions = useMemo<AutocompleteOption[]>(() => {
    return customers.map((c) => ({
      value: c.customerId,
      label: `${c.customerCode} - ${c.customerName}`,
      subLabel: c.customerName,
      data: c,
    }));
  }, [customers]);

  const availableProducts = useMemo(() => {
    if (!selectedCustomerId) return products;
    return products.filter((p) => p.customerId === selectedCustomerId && p.active);
  }, [products, selectedCustomerId]);

  const productOptions = useMemo<AutocompleteOption[]>(() => {
    return availableProducts.map((p) => ({
      value: p.productId,
      label: `${p.productCode} - ${p.productName}`,
      subLabel: `หน่วย: ${p.defaultUnit}`,
      data: p,
    }));
  }, [availableProducts]);

  const handleAddLine = async () => {
    const defaultDueDate = orderDateInput || new Date().toISOString().split('T')[0];
    const newLine: EditableLineState = {
      tempKey: `new_${Date.now()}_${Math.random()}`,
      skuCode: '',
      skuName: '',
      orderedQty: '100',
      unit: 'ชิ้น',
      dueDate: defaultDueDate || '',
      priority: headerPriority,
      notes: '',
      packaging: '',
      boxQty: '',
      isAllocated: false,
    };
    setLines((prev) => [...prev, newLine]);
  };

  const handleRemoveLine = (index: number) => {
    const line = lines[index];
    if (line?.isAllocated) {
      setErrorBanner(`ไม่สามารถลบรายการ '${line.skuName}' ได้ เนื่องจากถูกวางแผนลงบอร์ดแล้ว`);
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLine = (index: number, field: keyof EditableLineState, value: EditableLineState[keyof EditableLineState]) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value as any };
      return next;
    });
  };

  const handleSelectProduct = (index: number, prod: ProductMaster) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        skuCode: prod.productCode,
        skuName: prod.productName,
        unit: prod.defaultUnit || (next[index] ? next[index].unit : ''),
      };
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!orderDetail) return;

    if (!poNumberInput.trim()) {
      setErrorBanner('กรุณากรอกเลขที่ PO');
      return;
    }

    if (!customerNameInput.trim()) {
      setErrorBanner('กรุณากรอกชื่อลูกค้า');
      return;
    }

    if (lines.length === 0) {
      setErrorBanner('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    // Validate lines
    const lineInputs: UpdateSalesOrderLineItemInput[] = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l?.skuName.trim()) {
        setErrorBanner(`รายการที่ ${i + 1}: กรุณาระบุชื่อสินค้า`);
        return;
      }
      const qty = parseFloat(l?.orderedQty);
      if (!Number.isFinite(qty) || qty <= 0) {
        setErrorBanner(`รายการที่ ${i + 1}: จำนวนสั่งซื้อต้องเป็นตัวเลขที่มากกว่า 0`);
        return;
      }
      if (!l?.unit.trim()) {
        setErrorBanner(`รายการที่ ${i + 1}: กรุณาระบุหน่วย`);
        return;
      }
      if (!l?.dueDate) {
        setErrorBanner(`รายการที่ ${i + 1}: กรุณาระบุกำหนดส่ง`);
        return;
      }

      lineInputs.push({
        id: l.id,
        productCode: l.skuCode,
        productName: l?.skuName,
        orderedQty: qty,
        unit: l?.unit,
        dueDate: l?.dueDate,
        priority: l?.priority,
        notes: l?.notes,
        packaging: l?.packaging,
        boxQty: l?.boxQty ? parseFloat(l?.boxQty) : undefined,
      });
    }

    setIsSubmitting(true);
    try {
      const res = plannerRepository.updateSalesOrder(
        orderDetail.order.id,
        {
          poNumber: poNumberInput,
          customerName: customerNameInput,
          receivedDate: orderDateInput,
          priority: headerPriority,
          note: noteInput,
        },
        lineInputs
      );

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorBanner(res.errors?.[0] || 'เกิดข้อผิดพลาดในการแก้ไข PO');
      }
    } catch (err) {
      console.error('Failed to update Sales Order:', err);
      setErrorBanner('เกิดข้อผิดพลาดไม่คาดคิดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !orderDetail) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-sky-600" />
          <span>แก้ไขใบสั่งซื้อ PO: {orderDetail.order.orderNo}</span>
        </div>
      }
      maxWidth="5xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            บันทึกการแก้ไข PO
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {errorBanner && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* PO Header Fields */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
            ข้อมูลส่วนหัว PO (Header)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Input
              label="เลขที่ PO *"
              value={poNumberInput}
              onChange={(e) => setPoNumberInput(e.target.value)}
            />

            <Autocomplete
              label="ชื่อลูกค้า *"
              placeholder="เลือกลูกค้า..."
              value={customerNameInput}
              options={customerOptions}
              onChange={(val) => setCustomerNameInput(val)}
              onSelectOption={(opt) => {
                setCustomerNameInput(opt.data.customerName);
                setSelectedCustomerId(opt.value);
              }}
            />

            <Input
              label="วันที่รับ PO *"
              type="date"
              value={orderDateInput}
              onChange={(e) => setOrderDateInput(e.target.value)}
              leftIcon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
            />

            <Select
              label="ความสำคัญหลัก"
              value={headerPriority}
              onChange={(e) => setHeaderPriority(e.target.value as Priority)}
              options={[
                { value: Priority.NORMAL, label: 'ปกติ' },
                { value: Priority.URGENT, label: 'ด่วนพิเศษ' },
              ]}
            />
          </div>

          <Input
            label="หมายเหตุ PO"
            placeholder="หมายเหตุเพิ่มเติม"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
          />
        </div>

        {/* PO Lines Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              รายการสินค้า ({lines.length} รายการ)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleAddLine}
            >
              + เพิ่มรายการสินค้า
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div
                key={line.tempKey}
                className={`p-3.5 rounded-xl border space-y-3 ${
                  line?.isAllocated
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">รายการที่ #{index + 1}</span>
                    {line?.isAllocated && (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-600" />
                        ถูกวางแผนลงบอร์ดแล้ว (ห้ามลบ)
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={line?.isAllocated}
                    onClick={() => handleRemoveLine(index)}
                    className={`text-xs font-semibold px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                      line?.isAllocated
                        ? 'text-slate-400 bg-slate-100 cursor-not-allowed'
                        : 'text-rose-600 hover:bg-rose-50 cursor-pointer'
                    }`}
                    title={line?.isAllocated ? 'ไม่สามารถลบได้เนื่องจากถูกจัดลงแผนแล้ว' : 'ลบรายการนี้'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบรายการ</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <Autocomplete
                      label="เลือกสินค้าจาก Master / พิมพ์ชื่อ *"
                      placeholder="เลือกสินค้า..."
                      value={line.skuName}
                      options={productOptions}
                      onChange={(val) => handleUpdateLine(index, 'skuName', val)}
                      onSelectOption={(opt) => handleSelectProduct(index, opt.data)}
                    />
                  </div>

                  <Input
                    label="รหัสสินค้า (SKU)"
                    value={line.skuCode}
                    onChange={(e) => handleUpdateLine(index, 'skuCode', e.target.value)}
                  />

                  <Input
                    label="จำนวนสั่งซื้อ *"
                    type="number"
                    min="1"
                    value={line.orderedQty}
                    onChange={(e) => handleUpdateLine(index, 'orderedQty', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <Input
                    label="หน่วย *"
                    value={line.unit}
                    onChange={(e) => handleUpdateLine(index, 'unit', e.target.value)}
                  />

                  <Input
                    label="บรรจุภัณฑ์ (Packaging)"
                    placeholder="เช่น ถุง, กล่อง"
                    value={line.packaging}
                    onChange={(e) => handleUpdateLine(index, 'packaging', e.target.value)}
                  />

                  <Input
                    label="จำนวนกล่อง (Box Qty)"
                    type="number"
                    placeholder="เช่น 10"
                    value={line.boxQty}
                    onChange={(e) => handleUpdateLine(index, 'boxQty', e.target.value)}
                  />

                  <Input
                    label="กำหนดส่ง *"
                    type="date"
                    value={line.dueDate}
                    onChange={(e) => handleUpdateLine(index, 'dueDate', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <Select
                    label="ความสำคัญ"
                    value={line.priority}
                    onChange={(e) => handleUpdateLine(index, 'priority', e.target.value as Priority)}
                    options={[
                      { value: Priority.NORMAL, label: 'ปกติ' },
                      { value: Priority.URGENT, label: 'ด่วน' },
                    ]}
                  />

                  <Input
                    label="หมายเหตุรายการ"
                    placeholder="หมายเหตุเพิ่มเติมสำหรับสินค้านี้"
                    value={line.notes}
                    onChange={(e) => handleUpdateLine(index, 'notes', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};
