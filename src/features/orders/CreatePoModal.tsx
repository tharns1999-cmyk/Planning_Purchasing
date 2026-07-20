import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Plus, Trash2, FileText, Package, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select, SelectOption } from '@/components/common/Select';
import { Textarea } from '@/components/common/Textarea';
import { plannerRepository } from '@/services/plannerService';
import { Priority } from '@/domain/types';
import {
  CreateSalesOrderHeaderInput,
  CreateSalesOrderLineInput,
} from '@/services/repositories/PlannerRepository';

export interface CreatePoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface UIProductLine {
  productName: string;
  orderedQty: number;
  unit: string;
  dueDate: string;
}

const DEFAULT_LINE: UIProductLine = {
  productName: '',
  orderedQty: 100,
  unit: 'ชิ้น',
  dueDate: new Date().toISOString().slice(0, 10),
};



export const CreatePoModal: React.FC<CreatePoModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const reducedMotion = useReducedMotion() ?? false;

  const [header, setHeader] = useState<CreateSalesOrderHeaderInput>({
    poNumber: '',
    customerName: '',
    receivedDate: new Date().toISOString().slice(0, 10),
    priority: Priority.NORMAL,
    note: '',
  });

  const [lines, setLines] = useState<UIProductLine[]>([{ ...DEFAULT_LINE }]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Dynamic customer & product options derived from repository Master Data
  const { customerOptions, productOptions, isMasterDataEmpty } = useMemo(() => {
    try {
      plannerRepository.initialize();
      const customers = plannerRepository.listCustomers(false);
      const products = plannerRepository.listProducts(false);

      const custOpts: SelectOption[] = [
        { value: '', label: 'เลือกลูกค้า' },
        ...customers.map((c) => ({ value: c.customerName, label: `${c.customerCode} - ${c.customerName}` })),
      ];

      const prodOpts: SelectOption[] = [
        { value: '', label: 'เลือกสินค้าจากข้อมูลหลัก' },
        ...products.map((p) => ({ value: p.productId, label: `${p.productCode} - ${p.productName}` })),
      ];

      const isEmpty = customers.length === 0 || products.length === 0;

      return { customerOptions: custOpts, productOptions: prodOpts, isMasterDataEmpty: isEmpty };
    } catch {
      return {
        customerOptions: [{ value: '', label: 'เลือกลูกค้า' }],
        productOptions: [{ value: '', label: 'เลือกสินค้าจากข้อมูลหลัก' }],
        isMasterDataEmpty: true,
      };
    }
  }, []);

  // Reset form state on open
  React.useEffect(() => {
    if (isOpen) {
      setHeader({
        poNumber: '',
        customerName: '',
        receivedDate: new Date().toISOString().slice(0, 10),
        priority: Priority.NORMAL,
        note: '',
      });
      setLines([{ ...DEFAULT_LINE }]);
      setErrorBanner(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleAddLine = () => {
    setLines((prev) => [...prev, { ...DEFAULT_LINE }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectProduct = (index: number, productId: string) => {
    if (!productId) return;
    try {
      const products = plannerRepository.listProducts(true);
      const found = products.find((p) => p.productId === productId);
      if (found) {
        setLines((prev) => {
          const updated = [...prev];
          const target = { ...updated[index]! };
          target.productName = found.productName;
          target.unit = found.defaultUnit;
          updated[index] = target;
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to select master product:', err);
    }
  };

  const handleLineChange = (
    index: number,
    field: keyof UIProductLine,
    value: string | number
  ) => {
    setLines((prev) => {
      const updated = [...prev];
      const target = { ...updated[index]! };
      if (field === 'orderedQty') {
        target.orderedQty = typeof value === 'number' ? value : parseFloat(value) || 0;
      } else {
        (target as Record<string, unknown>)[field] = value;
      }
      updated[index] = target;
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    // Form Validations in Thai
    if (!header.poNumber || header.poNumber.trim() === '') {
      setErrorBanner('กรุณากรอกเลขที่ PO');
      return;
    }

    if (!header.customerName || header.customerName.trim() === '') {
      setErrorBanner('กรุณาเลือกลูกค้า');
      return;
    }

    if (!header.receivedDate || header.receivedDate.trim() === '') {
      setErrorBanner('กรุณาระบุวันที่รับ PO');
      return;
    }

    if (lines.length === 0) {
      setErrorBanner('ต้องมีรายการสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (!line.productName || line.productName.trim() === '') {
        setErrorBanner(`กรุณากรอกชื่อสินค้าในรายการที่ ${i + 1}`);
        return;
      }
      if (!Number.isFinite(line.orderedQty) || line.orderedQty <= 0) {
        setErrorBanner(`จำนวนสินค้าในรายการที่ ${i + 1} ต้องมากกว่า 0`);
        return;
      }
      if (!line.unit || line.unit.trim() === '') {
        setErrorBanner(`กรุณากรอกหน่วยสินค้าในรายการที่ ${i + 1}`);
        return;
      }
      if (!line.dueDate || line.dueDate.trim() === '') {
        setErrorBanner(`กรุณาระบุวันที่ต้องส่งในรายการที่ ${i + 1}`);
        return;
      }
    }

    setIsSubmitting(true);

    const mappedLines: CreateSalesOrderLineInput[] = lines.map((l) => ({
      productCode: '',
      productName: l.productName,
      orderedQty: l.orderedQty,
      unit: l.unit,
      dueDate: l.dueDate,
      priority: header.priority,
      note: undefined,
    }));

    try {
      const result = plannerRepository.createSalesOrderWithLines(header, mappedLines);

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        const firstError = result.errors?.[0] || 'เกิดข้อผิดพลาดในการสร้าง PO';
        if (firstError.includes('already exists')) {
          setErrorBanner('เลขที่ PO นี้มีอยู่แล้วในระบบ');
        } else {
          setErrorBanner(firstError);
        }
      }
    } catch (err) {
      console.error('Create PO failed:', err);
      setErrorBanner('เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalFooter = (
    <>
      <Button variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
        ยกเลิก
      </Button>
      <Button variant="primary" size="md" onClick={handleSubmit} isLoading={isSubmitting}>
        บันทึก PO
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="สร้างใบสั่งซื้อใหม่ (Create PO)"
      maxWidth="4xl"
      footer={modalFooter}
      reducedMotion={reducedMotion}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Master Data Empty Warning Banner */}
        {isMasterDataEmpty && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>ยังไม่มีข้อมูลหลัก กรุณาเพิ่มข้อมูลลูกค้าหรือสินค้าก่อน</span>
          </div>
        )}

        {/* Error Banner */}
        <AnimatePresence>
          {errorBanner && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2.5 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorBanner}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* Left Column: PO Header */}
          <div className="md:col-span-5 p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5 text-slate-900 font-bold text-xs">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>ข้อมูลใบสั่งซื้อ (PO Header)</span>
            </div>

            <Input
              label="เลขที่ PO *"
              placeholder="เช่น PO-2026-004"
              value={header.poNumber}
              onChange={(e) => setHeader({ ...header, poNumber: e.target.value })}
            />

            <Select
              label="ชื่อลูกค้า *"
              value={header.customerName}
              onChange={(e) => setHeader({ ...header, customerName: e.target.value })}
              options={customerOptions}
            />

            <div className="grid grid-cols-2 gap-2.5">
              <Input
                label="วันที่รับ PO *"
                type="date"
                value={header.receivedDate}
                onChange={(e) => setHeader({ ...header, receivedDate: e.target.value })}
              />

              <Select
                label="ความเร่งด่วน"
                value={header.priority}
                onChange={(e) => setHeader({ ...header, priority: e.target.value as Priority })}
                options={[
                  { value: Priority.NORMAL, label: 'ปกติ' },
                  { value: Priority.URGENT, label: 'ด่วน' },
                ]}
              />
            </div>

            <Textarea
              label="หมายเหตุ"
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
              rows={2}
              value={header.note || ''}
              onChange={(e) => setHeader({ ...header, note: e.target.value })}
            />
          </div>

          {/* Right Column: Product Lines List */}
          <div className="md:col-span-7 p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Package className="w-4 h-4 text-sky-600" />
                <span>รายการสินค้า ({lines.length} รายการ)</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleAddLine}
              >
                เพิ่มรายการสินค้า
              </Button>
            </div>

            {/* Product Lines Card List */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {lines.map((line, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: reducedMotion ? 0 : 0.15 }}
                  className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2.5 shadow-2xs relative"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-semibold text-slate-800 text-xs">
                      รายการที่ {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      disabled={lines.length <= 1}
                      title="ลบรายการสินค้า"
                      className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Select
                    label="เลือกสินค้าจากข้อมูลหลัก"
                    value=""
                    onChange={(e) => handleSelectProduct(idx, e.target.value)}
                    options={productOptions}
                  />

                  <Input
                    label="ชื่อสินค้า *"
                    placeholder="เช่น พายไก่ไข่เค็ม 120g"
                    value={line.productName}
                    onChange={(e) => handleLineChange(idx, 'productName', e.target.value)}
                  />

                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Input
                        label="จำนวน *"
                        type="number"
                        min="1"
                        value={line.orderedQty || ''}
                        onChange={(e) => handleLineChange(idx, 'orderedQty', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        label="หน่วย *"
                        placeholder="เช่น ชิ้น"
                        value={line.unit}
                        onChange={(e) => handleLineChange(idx, 'unit', e.target.value)}
                      />
                    </div>
                    <div className="col-span-5">
                      <Input
                        label="วันที่ต้องส่ง *"
                        type="date"
                        value={line.dueDate}
                        onChange={(e) => handleLineChange(idx, 'dueDate', e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

