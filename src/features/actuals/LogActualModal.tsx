import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AlertCircle, Package, Tag, FileText, Calendar, CheckSquare } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Select } from '@/components/common/Select';
import { Badge } from '@/components/common/Badge';
import { ActualEntryType, SourceType } from '@/domain/types';
import { ProductionActualAllocationItemDetail } from '@/services/repositories/PlannerRepository';

export interface LogActualModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemDetail: ProductionActualAllocationItemDetail | null;
  onConfirmSave: (input: {
    allocationId: string;
    entryType: ActualEntryType;
    goodQty: number;
    wasteQty: number;
    reworkQty: number;
    shortfallQty: number;
    shortfallReason?: string;
    recordedBy?: string;
  }) => void;
}

export const LogActualModal: React.FC<LogActualModalProps> = ({
  isOpen,
  onClose,
  itemDetail,
  onConfirmSave,
}) => {
  const reducedMotion = useReducedMotion() ?? false;

  const [entryType, setEntryType] = useState<ActualEntryType>(ActualEntryType.PARTIAL);
  const [goodQty, setGoodQty] = useState<string>('0');
  const [wasteQty, setWasteQty] = useState<string>('0');
  const [reworkQty, setReworkQty] = useState<string>('0');
  const [shortfallQty, setShortfallQty] = useState<string>('0');
  const [shortfallReason, setShortfallReason] = useState<string>('');
  const [recordedBy, setRecordedBy] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEntryType(ActualEntryType.PARTIAL);
      setGoodQty('0');
      setWasteQty('0');
      setReworkQty('0');
      setShortfallQty('0');
      setShortfallReason('');
      setRecordedBy('');
      setErrorBanner(null);
    }
  }, [isOpen]);

  if (!isOpen || !itemDetail) {
    return null;
  }

  const { allocation, actualSummary, displayName, room, productionDate, sourceType } = itemDetail;
  const unitText = allocation.plannedUnit || allocation.unit || 'ชิ้น';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    const goodNum = parseFloat(goodQty) || 0;
    const wasteNum = parseFloat(wasteQty) || 0;
    const reworkNum = parseFloat(reworkQty) || 0;
    const shortfallNum = parseFloat(shortfallQty) || 0;

    if (goodNum < 0 || wasteNum < 0 || reworkNum < 0 || shortfallNum < 0) {
      setErrorBanner('จำนวนผลิตทุกช่องต้องเป็นตัวเลขมากกว่าหรือเท่ากับ 0 (ห้ามติดลบ)');
      return;
    }

    const sumQty = goodNum + wasteNum + reworkNum + shortfallNum;
    if (sumQty <= 0) {
      setErrorBanner('กรุณาระบุจำนวนผลิตอย่างน้อย 1 ช่อง (ต้องมากกว่า 0)');
      return;
    }

    if (entryType === ActualEntryType.FINAL && shortfallNum > 0 && !shortfallReason.trim()) {
      setErrorBanner('กรณีเลือกประเภทบันทึกขั้นสุดท้ายและมีจำนวนผลิตไม่ครบ กรุณาระบุสาเหตุที่ผลิตไม่ครบ');
      return;
    }

    onConfirmSave({
      allocationId: allocation.allocationId,
      entryType,
      goodQty: goodNum,
      wasteQty: wasteNum,
      reworkQty: reworkNum,
      shortfallQty: shortfallNum,
      shortfallReason: shortfallReason.trim() || undefined,
      recordedBy: recordedBy.trim() || undefined,
    });
    onClose();
  };

  const modalFooter = (
    <>
      <Button variant="secondary" size="md" onClick={onClose}>
        ยกเลิก
      </Button>
      <Button variant="primary" size="md" onClick={handleSubmit}>
        บันทึกผลผลิตจริง
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="บันทึกผลการผลิตจริง"
      maxWidth="md"
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

        {/* Item Summary Header */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              {sourceType === SourceType.FG ? (
                <Package className="w-4 h-4 text-sky-600" />
              ) : (
                <Tag className="w-4 h-4 text-sky-600" />
              )}
              {displayName}
            </div>
            <Badge
              variant={sourceType === SourceType.FG ? 'sky' : sourceType === SourceType.WIP ? 'indigo' : 'amber'}
              label={sourceType}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <strong>วันที่:</strong> {productionDate}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <strong>ห้อง:</strong> {room ? `${room.id} - ${room.name}` : allocation.roomId}
            </span>
            <span className="col-span-2 flex items-center gap-1 text-sky-800 font-medium">
              <CheckSquare className="w-3.5 h-3.5 text-sky-600" />
              <strong>แผนผลิต:</strong> {allocation.plannedQty} {unitText} | <strong>สะสมเดิม:</strong> {actualSummary.totalGoodQty} {unitText}
            </span>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3 pt-1">
          {/* Entry Type Selection */}
          <Select
            label="ประเภทการบันทึก *"
            value={entryType}
            onChange={(e) => setEntryType(e.target.value as ActualEntryType)}
            options={[
              { value: ActualEntryType.PARTIAL, label: 'บันทึกบางส่วน (Partial)' },
              { value: ActualEntryType.FINAL, label: 'บันทึกขั้นสุดท้าย (Final / สรุปยอด)' },
            ]}
          />

          {/* Quantity Inputs Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`จำนวนของดี (${unitText}) *`}
              type="number"
              min="0"
              placeholder="0"
              value={goodQty}
              onChange={(e) => setGoodQty(e.target.value)}
            />
            <Input
              label={`จำนวนของเสีย (${unitText})`}
              type="number"
              min="0"
              placeholder="0"
              value={wasteQty}
              onChange={(e) => setWasteQty(e.target.value)}
            />
            <Input
              label={`จำนวนงานแก้ไข (${unitText})`}
              type="number"
              min="0"
              placeholder="0"
              value={reworkQty}
              onChange={(e) => setReworkQty(e.target.value)}
            />
            <Input
              label={`จำนวนผลิตไม่ครบ (${unitText})`}
              type="number"
              min="0"
              placeholder="0"
              value={shortfallQty}
              onChange={(e) => setShortfallQty(e.target.value)}
            />
          </div>

          {/* Shortfall Reason (Required if Final & shortfallQty > 0) */}
          {(entryType === ActualEntryType.FINAL || parseFloat(shortfallQty) > 0) && (
            <Textarea
              label={entryType === ActualEntryType.FINAL && parseFloat(shortfallQty) > 0 ? 'สาเหตุที่ผลิตไม่ครบ *' : 'สาเหตุที่ผลิตไม่ครบ'}
              placeholder="เช่น วัตถุดิบไม่พอ, เครื่องจักรขัดข้อง"
              rows={2}
              value={shortfallReason}
              onChange={(e) => setShortfallReason(e.target.value)}
            />
          )}

          {/* Recorded By (Optional) */}
          <Input
            label="ผู้บันทึก"
            placeholder="ชื่อผู้บันทึกข้อมูล (ระบุหรือไม่ก็ได้)"
            value={recordedBy}
            onChange={(e) => setRecordedBy(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};
