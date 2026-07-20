import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AlertCircle, Package, Tag, Building2, FileText, Info, Calendar } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Textarea } from '@/components/common/Textarea';
import { Badge } from '@/components/common/Badge';
import { PlanAllocation, SourceType, WeeklyPlan } from '@/domain/types';
import { FIXED_ROOMS } from '@/domain/constants';
import { plannerRepository } from '@/services/plannerService';

export interface EditAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  allocation: PlanAllocation | null;
  activePlan: WeeklyPlan | null;
  onConfirmSave: (input: {
    allocationId: string;
    plannedQty: number;
    plannedUnit: string;
    productionDate: string;
    roomId: string;
    fgOutputQty?: number;
    fgOutputUnit?: string;
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

export const EditAllocationModal: React.FC<EditAllocationModalProps> = ({
  isOpen,
  onClose,
  allocation,
  activePlan,
  onConfirmSave,
}) => {
  const reducedMotion = useReducedMotion() ?? false;

  const [plannedQty, setPlannedQty] = useState<string>('');
  const [plannedUnitSelect, setPlannedUnitSelect] = useState<string>('ชุด');
  const [customPlannedUnit, setCustomPlannedUnit] = useState<string>('');
  const [fgOutputQty, setFgOutputQty] = useState<string>('');
  const [productionDate, setProductionDate] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('R1');
  const [note, setNote] = useState<string>('');
  const [printCustomerTag, setPrintCustomerTag] = useState<string>('');
  const [printNote, setPrintNote] = useState<string>('');
  const [highlightOnPlan, setHighlightOnPlan] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Item details lookup state
  const [fgDetails, setFgDetails] = useState<{
    productName: string;
    poNumber: string;
    customerName: string;
    orderedQty: number;
    remainingQty: number;
    unit: string;
  } | null>(null);

  const [wipDetails, setWipDetails] = useState<{
    itemName: string;
    itemType: SourceType;
    defaultUnit: string;
    relatedProduct?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && allocation) {
      setErrorBanner(null);
      setPlannedQty(String(allocation.plannedQty));
      setProductionDate(allocation.productionDate);
      setRoomId(allocation.roomId);
      setNote(allocation.note || '');
      setPrintCustomerTag(allocation.printCustomerTag || '');
      setPrintNote(allocation.printNote || '');
      setHighlightOnPlan(Boolean(allocation.highlightOnPlan));

      const unitVal = allocation.plannedUnit || allocation.unit || 'ชุด';
      const isPreset = PRESET_UNITS.some((u) => u.value === unitVal);
      if (isPreset) {
        setPlannedUnitSelect(unitVal);
        setCustomPlannedUnit('');
      } else {
        setPlannedUnitSelect('OTHER');
        setCustomPlannedUnit(unitVal);
      }

      if (allocation.sourceType === SourceType.FG && allocation.salesOrderLineId) {
        setFgOutputQty(String(allocation.fgOutputQty ?? allocation.plannedQty));

        try {
          const snap = plannerRepository.getSnapshot();
          const line = snap.entities.salesOrderLines.find((l) => l.id === allocation.salesOrderLineId);
          const order = snap.entities.salesOrders.find((o) => o.id === allocation.salesOrderId);
          if (line) {
            const activePlanned = snap.entities.weeklyPlans
              .filter((p) => p.status === 'DRAFT' || p.status === 'PUBLISHED')
              .flatMap((p) => p.allocations)
              .filter((a) => a.salesOrderLineId === line.id && a.fgOutputQty !== undefined)
              .reduce((sum, a) => sum + a.fgOutputQty!, 0);

            const remaining = Math.max(0, line.orderedQty - line.cancelledQty - activePlanned);

            setFgDetails({
              productName: line.skuName,
              poNumber: order?.orderNo || '',
              customerName: order?.customerName || '',
              orderedQty: line.orderedQty,
              remainingQty: remaining,
              unit: line.unit,
            });
          }
        } catch (err) {
          console.error('Failed to lookup FG details:', err);
        }
      } else if (allocation.wipPrepItemId) {
        setFgOutputQty('');
        setFgDetails(null);

        try {
          const snap = plannerRepository.getSnapshot();
          const item = snap.entities.wipPrepItems.find((i) => i.itemId === allocation.wipPrepItemId);
          if (item) {
            setWipDetails({
              itemName: item.itemName,
              itemType: item.itemType,
              defaultUnit: item.defaultUnit,
              relatedProduct: item.relatedProduct,
            });
          }
        } catch (err) {
          console.error('Failed to lookup WIP details:', err);
        }
      }
    }
  }, [isOpen, allocation]);

  const effectivePlannedUnit =
    plannedUnitSelect === 'OTHER' ? customPlannedUnit.trim() : plannedUnitSelect;

  const parsedPlannedQty = parseFloat(plannedQty);
  const parsedFgOutputQty = parseFloat(fgOutputQty);

  const ratioText = React.useMemo(() => {
    if (
      fgDetails &&
      Number.isFinite(parsedPlannedQty) &&
      parsedPlannedQty > 0 &&
      Number.isFinite(parsedFgOutputQty) &&
      parsedFgOutputQty > 0
    ) {
      const ratio = Math.round((parsedFgOutputQty / parsedPlannedQty) * 100) / 100;
      return `ประมาณ 1 ${effectivePlannedUnit || 'หน่วย'} = ${ratio} ${fgDetails.unit}`;
    }
    return null;
  }, [fgDetails, parsedPlannedQty, parsedFgOutputQty, effectivePlannedUnit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!allocation || !activePlan) return;

    const qtyNum = parseFloat(plannedQty);

    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setErrorBanner('กรุณาระบุจำนวนที่วางแผนผลิต');
      return;
    }

    if (!effectivePlannedUnit) {
      setErrorBanner('กรุณาระบุหน่วยแผนผลิต');
      return;
    }

    if (!productionDate || productionDate < activePlan.weekStart || productionDate > activePlan.weekEnd) {
      setErrorBanner(`วันที่ผลิตต้องอยู่ในสัปดาห์ (${activePlan.weekStart} ถึง ${activePlan.weekEnd})`);
      return;
    }

    if (!['R1', 'R2', 'R3', 'R4'].includes(roomId)) {
      setErrorBanner('กรุณาเลือกห้องผลิต R1–R4');
      return;
    }

    if (allocation.sourceType === SourceType.FG) {
      const fgNum = parseFloat(fgOutputQty);

      if (!Number.isFinite(fgNum) || fgNum <= 0) {
        setErrorBanner('กรุณาระบุจำนวน FG ที่คาดว่าจะได้');
        return;
      }

      if (fgDetails) {
        const currentAllocFg = allocation.fgOutputQty ?? 0;
        const maxAllowed = fgDetails.remainingQty + currentAllocFg;

        if (fgNum > maxAllowed) {
          setErrorBanner(`จำนวน FG ต้องไม่เกินจำนวนคงเหลือรวมจำนวนเดิม (${maxAllowed} ${fgDetails.unit})`);
          return;
        }
      }

      onConfirmSave({
        allocationId: allocation.allocationId,
        plannedQty: qtyNum,
        plannedUnit: effectivePlannedUnit,
        productionDate,
        roomId,
        fgOutputQty: fgNum,
        fgOutputUnit: fgDetails?.unit || allocation.fgOutputUnit || allocation.unit,
        note: note.trim() || undefined,
        printCustomerTag: printCustomerTag.trim() || undefined,
        printNote: printNote.trim() || undefined,
        highlightOnPlan,
      });
      onClose();
    } else {
      onConfirmSave({
        allocationId: allocation.allocationId,
        plannedQty: qtyNum,
        plannedUnit: effectivePlannedUnit,
        productionDate,
        roomId,
        note: note.trim() || undefined,
        printCustomerTag: printCustomerTag.trim() || undefined,
        printNote: printNote.trim() || undefined,
        highlightOnPlan,
      });
      onClose();
    }
  };

  if (!isOpen || !allocation) {
    return null;
  }

  const modalFooter = (
    <>
      <Button variant="secondary" size="md" onClick={onClose}>
        ยกเลิก
      </Button>
      <Button variant="primary" size="md" onClick={handleSubmit}>
        บันทึกการแก้ไข
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="แก้ไขรายการวางแผนผลิต"
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

        {/* Reference Header */}
        {fgDetails && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Package className="w-4 h-4 text-sky-600" />
                {fgDetails.productName}
              </div>
              <Badge variant="sky" label="FG" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <strong>PO:</strong> {fgDetails.poNumber}
              </span>
              <span className="flex items-center gap-1 truncate">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <strong>ลูกค้า:</strong> {fgDetails.customerName}
              </span>
            </div>
          </div>
        )}

        {wipDetails && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-sky-600" />
                {wipDetails.itemName}
              </div>
              <Badge
                variant={wipDetails.itemType === SourceType.WIP ? 'sky' : 'amber'}
                label={wipDetails.itemType === SourceType.WIP ? 'WIP' : 'PREP'}
              />
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-3 pt-1">
          {/* Planned Qty and Unit */}
          <div className="grid grid-cols-12 gap-3 items-start">
            <div className="col-span-6">
              <Input
                label="จำนวนที่วางแผนผลิต *"
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

          {plannedUnitSelect === 'OTHER' && (
            <Input
              label="ระบุหน่วยแผนผลิตอื่น ๆ *"
              placeholder="เช่น หม้ออบ, ลัง"
              value={customPlannedUnit}
              onChange={(e) => setCustomPlannedUnit(e.target.value)}
            />
          )}

          {/* FG Output Qty (FG only) */}
          {allocation.sourceType === SourceType.FG && (
            <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl space-y-2">
              <div className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-7">
                  <Input
                    label="คาดว่าจะได้ FG *"
                    type="number"
                    min="1"
                    placeholder="เช่น 60"
                    value={fgOutputQty}
                    onChange={(e) => setFgOutputQty(e.target.value)}
                    helperText="ใช้หัก PO remaining"
                  />
                </div>
                <div className="col-span-5">
                  <Input
                    label="หน่วย FG"
                    value={fgDetails?.unit || allocation.fgOutputUnit || allocation.unit}
                    readOnly
                    disabled
                    className="bg-slate-100 font-semibold"
                  />
                </div>
              </div>

              {ratioText && (
                <div className="text-xs font-semibold text-sky-800 flex items-center gap-1.5 pt-1">
                  <Info className="w-3.5 h-3.5 text-sky-600" />
                  <span>{ratioText}</span>
                </div>
              )}
            </div>
          )}

          {/* Date & Room Selection */}
          <div className="grid grid-cols-12 gap-3 items-start">
            <div className="col-span-6">
              <Input
                label="วันที่ผลิต *"
                type="date"
                min={activePlan?.weekStart}
                max={activePlan?.weekEnd}
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                leftIcon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
              />
            </div>
            <div className="col-span-6">
              <Select
                label="ห้องผลิต *"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                options={FIXED_ROOMS.map((r) => ({
                  value: r.id,
                  label: `${r.id} - ${r.name}`,
                }))}
              />
            </div>
          </div>

          {/* Note Input */}
          <Textarea
            label="หมายเหตุ"
            placeholder="หมายเหตุการวางผลิต"
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
