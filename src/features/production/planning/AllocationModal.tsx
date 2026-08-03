import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AlertCircle, Package, Tag, Building2, FileText, Info, BarChart3 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Textarea } from '@/components/common/Textarea';
import { Badge } from '@/components/common/Badge';
import { PlanningQueueFgItem } from '@/services/repositories/PlannerRepository';
import { WipPrepItem } from '@/domain/types';

export interface DragTarget {
  productionDate: string;
  roomId: string;
  roomName: string;
}

export interface AllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCell: DragTarget | null;
  fgItem: PlanningQueueFgItem | null;
  wipPrepItem: WipPrepItem | null;
  estimatedYieldPerBatch?: number; // จาก ProductMaster (ถ้ามี)
  onConfirmFg: (input: {
    plannedQty: number;
    plannedUnit: string;
    fgOutputQty: number;
    fgOutputUnit: string;
    note?: string;
    printCustomerTag?: string;
    printNote?: string;
    highlightOnPlan?: boolean;
  }) => void;
  onConfirmWipPrep: (input: {
    plannedQty: number;
    plannedUnit: string;
    note?: string;
    printCustomerTag?: string;
    printNote?: string;
    highlightOnPlan?: boolean;
  }) => void;
}

const PRESET_UNITS = [
  { value: 'ชุด', label: 'ชุด' },
  { value: 'กก.', label: 'กก.' },
  { value: 'หม้อ', label: 'หม้อ' },
  { value: 'ถาด', label: 'ถาด' },
  { value: 'กล่อง', label: 'กล่อง' },
  { value: 'ชิ้น', label: 'ชิ้น' },
  { value: 'ถุง', label: 'ถุง' },
  { value: 'OTHER', label: 'อื่น ๆ (ระบุ)' },
];

export const AllocationModal: React.FC<AllocationModalProps> = ({
  isOpen,
  onClose,
  targetCell,
  fgItem,
  wipPrepItem,
  estimatedYieldPerBatch,
  onConfirmFg,
  onConfirmWipPrep,
}) => {
  const reducedMotion = useReducedMotion() ?? false;

  // Form State
  const [plannedQty, setPlannedQty] = useState<string>('10');
  const [plannedUnitSelect, setPlannedUnitSelect] = useState<string>('ชุด');
  const [customPlannedUnit, setCustomPlannedUnit] = useState<string>('');
  const [estimatedFgQty, setEstimatedFgQty] = useState<string>('');
  const [isEstimatedFgOverridden, setIsEstimatedFgOverridden] = useState(false);
  const [note, setNote] = useState<string>('');
  const [printCustomerTag, setPrintCustomerTag] = useState<string>('');
  const [printNote, setPrintNote] = useState<string>('');
  const [highlightOnPlan, setHighlightOnPlan] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Initialize values when opening
  useEffect(() => {
    if (isOpen) {
      setErrorBanner(null);
      setNote('');
      setPrintCustomerTag('');
      setPrintNote('');
      setHighlightOnPlan(false);
      setIsEstimatedFgOverridden(false);

      if (fgItem) {
        setPlannedQty('10');
        setPlannedUnitSelect('ชุด');
        setCustomPlannedUnit('');
        // Auto-calculate estimatedFgQty from yield rate if available
        if (estimatedYieldPerBatch && estimatedYieldPerBatch > 0) {
          setEstimatedFgQty(String(Math.round(10 * estimatedYieldPerBatch)));
        } else {
          setEstimatedFgQty('');
        }
      } else if (wipPrepItem) {
        setPlannedQty('1');
        const defaultU = wipPrepItem.defaultUnit || 'หม้อ';
        const isPreset = PRESET_UNITS.some((u) => u.value === defaultU);
        if (isPreset) {
          setPlannedUnitSelect(defaultU);
          setCustomPlannedUnit('');
        } else {
          setPlannedUnitSelect('OTHER');
          setCustomPlannedUnit(defaultU);
        }
        setEstimatedFgQty('');
      }
    }
  }, [isOpen, fgItem, wipPrepItem, estimatedYieldPerBatch]);

  // Auto-calculate estimatedFgQty when plannedQty changes (if not manually overridden)
  const parsedPlannedQty = parseFloat(plannedQty);
  useEffect(() => {
    if (!isEstimatedFgOverridden && estimatedYieldPerBatch && estimatedYieldPerBatch > 0 && fgItem) {
      const qty = parseFloat(plannedQty);
      if (Number.isFinite(qty) && qty > 0) {
        setEstimatedFgQty(String(Math.round(qty * estimatedYieldPerBatch)));
      }
    }
  }, [plannedQty, estimatedYieldPerBatch, isEstimatedFgOverridden, fgItem]);

  const effectivePlannedUnit =
    plannedUnitSelect === 'OTHER' ? customPlannedUnit.trim() : plannedUnitSelect;

  const parsedEstimatedFgQty = parseFloat(estimatedFgQty);

  // Ratio calculation helper
  const ratioText = React.useMemo(() => {
    if (
      fgItem &&
      Number.isFinite(parsedPlannedQty) &&
      parsedPlannedQty > 0 &&
      Number.isFinite(parsedEstimatedFgQty) &&
      parsedEstimatedFgQty > 0
    ) {
      const ratio = Math.round((parsedEstimatedFgQty / parsedPlannedQty) * 100) / 100;
      return `ประมาณ 1 ${effectivePlannedUnit || 'หน่วย'} = ${ratio} ${fgItem.unit}`;
    }
    return null;
  }, [fgItem, parsedPlannedQty, parsedEstimatedFgQty, effectivePlannedUnit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    const qtyNum = parseFloat(plannedQty);

    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setErrorBanner('กรุณาระบุจำนวนชุดที่จะผลิต');
      return;
    }

    if (!effectivePlannedUnit) {
      setErrorBanner('กรุณาระบุหน่วยแผนผลิต');
      return;
    }

    if (fgItem) {
      // Validate estimatedFgQty is required for FG items
      if (!Number.isFinite(parsedEstimatedFgQty) || parsedEstimatedFgQty <= 0) {
        setErrorBanner('กรุณาระบุค่าประมาณ FG ที่คาดว่าจะได้');
        return;
      }

      if (parsedEstimatedFgQty > fgItem.remainingQty && fgItem.remainingQty > 0) {
        setErrorBanner(`ค่าประมาณ FG (${parsedEstimatedFgQty}) เกินยอดคงเหลือ (${fgItem.remainingQty} ${fgItem.unit})`);
        return;
      }

      onConfirmFg({
        plannedQty: qtyNum,
        plannedUnit: effectivePlannedUnit,
        fgOutputQty: parsedEstimatedFgQty,  // ← ใช้ค่าประมาณ FG (ไม่ใช่ batch qty)
        fgOutputUnit: fgItem.unit,
        note: note.trim() || undefined,
        printCustomerTag: printCustomerTag.trim() || undefined,
        printNote: printNote.trim() || undefined,
        highlightOnPlan,
      });
      onClose();
    } else if (wipPrepItem) {
      onConfirmWipPrep({
        plannedQty: qtyNum,
        plannedUnit: effectivePlannedUnit,
        note: note.trim() || undefined,
      });
      onClose();
    }
  };

  if (!isOpen || (!fgItem && !wipPrepItem) || !targetCell) {
    return null;
  }

  const modalFooter = (
    <>
      <Button variant="secondary" size="md" onClick={onClose}>
        ยกเลิก
      </Button>
      <Button variant="primary" size="md" onClick={handleSubmit}>
        บันทึกรายการ
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ระบุจำนวนวางแผนผลิต"
      maxWidth="lg"
      footer={modalFooter}
      reducedMotion={reducedMotion}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Banner */}
        <AnimatePresence>
          {errorBanner && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2 text-xs font-semibold"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorBanner}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reference Item Summary Header Box */}
        {fgItem && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Package className="w-4 h-4 text-sky-600" />
                {fgItem.productName}
              </div>
              <Badge variant="rose" label={fgItem.priority === 'URGENT' ? 'ด่วน' : 'ปกติ'} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <strong>PO:</strong> {fgItem.poNumber}
              </span>
              <span className="flex items-center gap-1 truncate">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <strong>ลูกค้า:</strong> {fgItem.customerName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-slate-200 text-center font-medium">
              <div>
                <span className="text-slate-400 block text-[11px]">จำนวนสั่งซื้อ</span>
                <span className="text-slate-800 font-bold">{fgItem.orderedQty.toLocaleString()} {fgItem.unit}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">คงเหลือวางแผน (ประมาณ)</span>
                <span className="text-amber-600 font-bold">~{fgItem.remainingQty.toLocaleString()} {fgItem.unit}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 pt-0.5">
              วางแผนใส่ <strong>{targetCell.roomName}</strong> วันที่ <strong>{targetCell.productionDate}</strong>
            </div>
          </div>
        )}

        {wipPrepItem && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-sky-600" />
                {wipPrepItem.itemName}
              </div>
              <Badge variant="sky" label="WIP (งานแปรรูป)" />
            </div>

            <div className="text-slate-600">
              หน่วยเริ่มต้น: <strong>{wipPrepItem.defaultUnit}</strong>
              {wipPrepItem.relatedProduct && (
                <span className="ml-3 text-slate-500">สินค้าอ้างอิง: {wipPrepItem.relatedProduct}</span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 pt-0.5">
              วางแผนใส่ <strong>{targetCell.roomName}</strong> วันที่ <strong>{targetCell.productionDate}</strong>
            </div>
          </div>
        )}

        {/* Inputs Form */}
        <div className="space-y-3 pt-1">
          {/* Planned Qty and Planned Unit */}
          <div className="grid grid-cols-12 gap-3 items-start">
            <div className="col-span-6">
              <Input
                label="จำนวนชุดที่จะผลิต *"
                type="number"
                min="1"
                placeholder="เช่น 10"
                value={plannedQty}
                onChange={(e) => setPlannedQty(e.target.value)}
              />
            </div>
            <div className="col-span-6">
              <Select
                label="หน่วยแผนผลิต *"
                value={plannedUnitSelect}
                onChange={(e) => setPlannedUnitSelect(e.target.value)}
                options={PRESET_UNITS}
              />
            </div>
          </div>

          {/* Custom Unit input if OTHER selected */}
          {plannedUnitSelect === 'OTHER' && (
            <Input
              label="ระบุหน่วยแผนผลิตอื่น ๆ *"
              placeholder="เช่น หม้ออบ, ลัง"
              value={customPlannedUnit}
              onChange={(e) => setCustomPlannedUnit(e.target.value)}
            />
          )}

          {/* Estimated FG Output Section (FG items only) */}
          {fgItem && (
            <div className="space-y-2 p-3 bg-sky-50/50 border border-sky-200/70 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
                <BarChart3 className="w-3.5 h-3.5 text-sky-600" />
                ค่าประมาณ FG ที่คาดว่าจะได้
              </div>

              {/* Yield Rate Info (if available) */}
              {estimatedYieldPerBatch && estimatedYieldPerBatch > 0 ? (
                <div className="p-2 bg-white rounded-md border border-sky-100 text-[11px] text-sky-700 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Info className="w-3 h-3 text-sky-500 shrink-0" />
                    <span>อัตราผลผลิต: ~{estimatedYieldPerBatch} {fgItem.unit}/ชุด (จาก Master Data)</span>
                  </div>
                  {Number.isFinite(parsedPlannedQty) && parsedPlannedQty > 0 && (
                    <div className="pl-4 text-sky-600">
                      {parsedPlannedQty} ชุด × {estimatedYieldPerBatch} = ประมาณ {Math.round(parsedPlannedQty * estimatedYieldPerBatch)} {fgItem.unit}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2 bg-amber-50 rounded-md border border-amber-100 text-[11px] text-amber-700 flex items-center gap-1">
                  <Info className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>ไม่มีอัตราผลผลิตใน Master Data — กรุณากรอกค่าประมาณด้านล่าง</span>
                </div>
              )}

              <Input
                label={`ค่าประมาณ FG (${fgItem.unit}) *`}
                type="number"
                min="1"
                placeholder={`กรุณาประมาณจำนวน ${fgItem.unit} ที่คาดว่าจะได้`}
                value={estimatedFgQty}
                onChange={(e) => {
                  setEstimatedFgQty(e.target.value);
                  setIsEstimatedFgOverridden(true);
                }}
                helperText="ใช้สำหรับหักยอดคงเหลือ PO (ค่าประมาณ)"
              />

              {ratioText && (
                <div className="text-[11px] text-sky-600 font-medium pl-1">
                  📊 {ratioText}
                </div>
              )}

              <div className="text-[10px] text-slate-400 italic flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                ยอดนี้เป็นค่าประมาณ ยอดจริงจะบันทึกในหน้าผลผลิตจริง
              </div>
            </div>
          )}

          {/* Note Input */}
          <Textarea
            label="หมายเหตุ"
            placeholder={
              fgItem
                ? 'เช่น 10 ชุด ได้ประมาณ 60 กล่อง'
                : 'หมายเหตุการวางผลิต (ถ้ามี)'
            }
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {/* Phase 3C.2 Print Metadata & Highlight Fields */}
          <Input
            label="ลูกค้า/รหัสลูกค้าบนใบแผน"
            placeholder="เช่น ITC+E"
            value={printCustomerTag}
            onChange={(e) => setPrintCustomerTag(e.target.value)}
          />

          <Textarea
            label="หมายเหตุบนใบแผน"
            placeholder="เช่น ใช้ไลน์บ่าย / รอวัตถุดิบ"
            rows={2}
            value={printNote}
            onChange={(e) => setPrintNote(e.target.value)}
          />

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={highlightOnPlan}
              onChange={(e) => setHighlightOnPlan(e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
            />
            <span>ไฮไลต์บนใบแผน</span>
          </label>
        </div>
      </form>
    </Modal>
  );
};
