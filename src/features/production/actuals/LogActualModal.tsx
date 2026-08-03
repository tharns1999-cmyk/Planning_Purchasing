import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AlertCircle, Package, Tag, FileText, Calendar, CheckSquare, History, User } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Badge } from '@/components/common/Badge';
import { ActualEntryType, SourceType, ProductionActualEntry } from '@/domain/types';
import { ProductionActualAllocationItemDetail } from '@/services/repositories/PlannerRepository';
import { plannerRepository } from '@/services/plannerService';
import { formatThaiDate } from '@/utils/thaiDate';

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
    boxQty?: number;
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

  const [goodQty, setGoodQty] = useState<string>('0');
  const [wasteQty, setWasteQty] = useState<string>('0');
  const [boxQty, setBoxQty] = useState<string>('0');
  const [recordedBy, setRecordedBy] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [pastEntries, setPastEntries] = useState<ProductionActualEntry[]>([]);

  useEffect(() => {
    if (isOpen && itemDetail) {
      setGoodQty('0');
      setWasteQty('0');
      setBoxQty('0');
      setRecordedBy('');
      setErrorBanner(null);

      // Load past recorded actual entries for history view
      try {
        const history = plannerRepository.listProductionActuals(itemDetail.allocation.allocationId);
        setPastEntries(history);
      } catch {
        setPastEntries([]);
      }
    }
  }, [isOpen, itemDetail]);

  if (!isOpen || !itemDetail) {
    return null;
  }

  const { allocation, actualSummary, displayName, room, productionDate, sourceType } = itemDetail;
  const isWip = sourceType === SourceType.WIP;
  const unitText = isWip ? 'กก.' : (allocation.plannedUnit || allocation.unit || 'ชิ้น');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    const goodNum = parseFloat(goodQty) || 0;
    const wasteNum = parseFloat(wasteQty) || 0;
    const boxNum = parseFloat(boxQty) || 0;

    if (goodNum < 0 || wasteNum < 0 || boxNum < 0) {
      setErrorBanner('จำนวนผลิตทุกช่องต้องเป็นตัวเลขมากกว่าหรือเท่ากับ 0 (ห้ามติดลบ)');
      return;
    }

    const sumQty = goodNum + wasteNum + boxNum;
    if (sumQty <= 0) {
      setErrorBanner('กรุณาระบุจำนวนผลิตอย่างน้อย 1 ช่อง (ต้องมากกว่า 0)');
      return;
    }

    onConfirmSave({
      allocationId: allocation.allocationId,
      entryType: ActualEntryType.FINAL,
      goodQty: goodNum,
      wasteQty: wasteNum,
      reworkQty: 0,
      shortfallQty: 0,
      boxQty: !isWip && boxNum > 0 ? boxNum : undefined,
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
        บันทึกผลการผลิต
      </Button>
    </>
  );

  const isAlreadyRecorded = pastEntries.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAlreadyRecorded ? 'ประวัติ / บันทึกผลการผลิตจริง' : 'บันทึกผลการผลิตจริง'}
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
              <strong>แผนผลิต:</strong> {allocation.plannedQty} {allocation.plannedUnit || allocation.unit} {allocation.fgOutputQty ? `(~${allocation.fgOutputQty} ${allocation.fgOutputUnit || allocation.unit})` : ''} | <strong>ผลิตจริงแล้ว:</strong> {actualSummary.totalGoodQty} {unitText}
            </span>
          </div>

          {/* Reconciliation Info Box for FG items */}
          {sourceType === SourceType.FG && allocation.fgOutputQty !== undefined && (
            <div className="mt-2 pt-2 border-t border-slate-200/80 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-700 font-medium">
                <span>ค่าประมาณ FG: <strong>~{allocation.fgOutputQty} {allocation.fgOutputUnit || allocation.unit}</strong></span>
                <span>สะสมผลิตจริง: <strong>{actualSummary.totalGoodQty} {unitText}</strong></span>
                <span>ส่วนต่าง: <strong className={actualSummary.totalGoodQty - allocation.fgOutputQty < 0 ? 'text-amber-600' : 'text-emerald-600'}>{actualSummary.totalGoodQty - allocation.fgOutputQty > 0 ? `+${actualSummary.totalGoodQty - allocation.fgOutputQty}` : actualSummary.totalGoodQty - allocation.fgOutputQty} {unitText}</strong></span>
              </div>
              {actualSummary.totalGoodQty > 0 && actualSummary.totalGoodQty < allocation.fgOutputQty && (
                <div className="p-1.5 bg-amber-50 border border-amber-200/60 rounded text-amber-800 flex items-center gap-1 font-medium text-[10.5px]">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>ผลิตจริงน้อยกว่าค่าประมาณ — ยอดคงเหลือ PO จะปรับเพิ่มอัตโนมัติใน Queue</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recorded History List (If exists) */}
        {pastEntries.length > 0 && (
          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-indigo-900 flex items-center gap-1.5 border-b border-indigo-100 pb-1.5">
              <History className="w-4 h-4 text-indigo-600" />
              <span>ประวัติการบันทึกผลผลิตจริง ({pastEntries.length} ครั้ง)</span>
            </div>
            <div className="divide-y divide-indigo-100/80 max-h-36 overflow-y-auto">
              {pastEntries.map((entry, idx) => (
                <div key={entry.actualEntryId || idx} className="py-1.5 flex items-center justify-between text-[11px] text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-900">ครั้งที่ {idx + 1}:</span>{' '}
                    ผลิตได้ <strong className="text-emerald-700">{entry.goodQty}</strong> {unitText}
                    {entry.wasteQty > 0 && <span className="text-rose-600 ml-1.5">(เสีย {entry.wasteQty})</span>}
                    {entry.boxQty ? <span className="text-sky-700 font-semibold ml-1.5">[{entry.boxQty} กล่อง]</span> : null}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    {entry.recordedBy && (
                      <span className="flex items-center gap-0.5 text-slate-600 font-medium">
                        <User className="w-3 h-3 text-slate-400" />
                        {entry.recordedBy}
                      </span>
                    )}
                    <span>{formatThaiDate(entry.recordedAt.slice(0, 10))}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <div className="space-y-3 pt-1">
          <div className="font-bold text-xs text-slate-900 border-b border-slate-100 pb-1">
            {isAlreadyRecorded ? '+ บันทึกยอดผลิตเพิ่มเติม' : 'กรอกยอดการผลิตจริง'}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Input 1: Good Quantity */}
            <Input
              label={isWip ? 'จำนวนที่ผลิต WIP ได้ (กก.) *' : `จำนวนของดี (${unitText}) *`}
              type="number"
              min="0"
              placeholder="0"
              value={goodQty}
              onChange={(e) => setGoodQty(e.target.value)}
            />

            {/* Input 2: Waste Quantity */}
            <Input
              label={isWip ? 'จำนวนของเสีย (กก.)' : `จำนวนของเสีย (${unitText})`}
              type="number"
              min="0"
              placeholder="0"
              value={wasteQty}
              onChange={(e) => setWasteQty(e.target.value)}
            />

            {/* Input 3: Box Qty (FG only) */}
            {!isWip && (
              <Input
                label="จำนวนกล่อง (กล่อง)"
                type="number"
                min="0"
                placeholder="0"
                value={boxQty}
                onChange={(e) => setBoxQty(e.target.value)}
                helperText="บันทึกจำนวนกล่องเพื่อปรับปรุงยอดคงเหลือในใบสั่งซื้อ (PO)"
              />
            )}

            {/* Input 4: Recorded By */}
            <Input
              label="ผู้บันทึก"
              placeholder="ชื่อผู้บันทึกข้อมูล (ระบุหรือไม่ก็ได้)"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
