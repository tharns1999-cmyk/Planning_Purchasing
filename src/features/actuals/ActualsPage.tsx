import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Package,
  Tag,
  PlusCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { LogActualModal } from './LogActualModal';
import { plannerRepository } from '@/services/plannerService';
import {
  ProductionActualWeekDataDetail,
  ProductionActualAllocationItemDetail,
} from '@/services/repositories/PlannerRepository';
import { ProductionStatus, SourceType, ActualEntryType } from '@/domain/types';
import { getProductionWeek, parseDateOnly, formatDateISO } from '@/domain/calculations';
import { formatThaiDate } from '@/utils/thaiDate';
import { pageTransitionVariants, getMotionVariants } from '@/motion/tokens';

const THAI_DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function formatThaiDayAndDate(isoDateStr: string): { dayName: string; formattedDate: string } {
  const d = parseDateOnly(isoDateStr);
  const dayName = THAI_DAY_NAMES[d.getDay()] || '';
  const formattedDate = formatThaiDate(isoDateStr);
  return { dayName, formattedDate };
}

export const ActualsPage: React.FC = () => {
  const reducedMotion = useReducedMotion() ?? false;

  // Current production week state (default reference week: 2026-07-20)
  const [currentWeek, setCurrentWeek] = useState(() => getProductionWeek('2026-07-20'));
  const [weekData, setWeekData] = useState<ProductionActualWeekDataDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Modal Log State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<ProductionActualAllocationItemDetail | null>(null);

  const loadPageData = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      plannerRepository.initialize();
      const data = plannerRepository.getProductionActualWeekData(currentWeek.weekStart);
      setWeekData(data);
    } catch (err) {
      console.error('Failed to load production actual data:', err);
      setError('ไม่สามารถโหลดข้อมูลการบันทึกผลผลิตจริงได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  }, [currentWeek.weekStart]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Week Navigation Handlers
  const handlePreviousWeek = () => {
    const d = parseDateOnly(currentWeek.weekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeek(getProductionWeek(formatDateISO(d)));
  };

  const handleThisWeek = () => {
    setCurrentWeek(getProductionWeek('2026-07-20'));
  };

  const handleNextWeek = () => {
    const d = parseDateOnly(currentWeek.weekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeek(getProductionWeek(formatDateISO(d)));
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      setCurrentWeek(getProductionWeek(val));
    }
  };

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => {
      setNoticeMessage(null);
    }, 4000);
  };

  // Open log actual modal
  const handleOpenLogModal = (item: ProductionActualAllocationItemDetail) => {
    if (
      item.actualSummary.status === ProductionStatus.COMPLETED ||
      item.actualSummary.status === ProductionStatus.CLOSED_SHORTFALL
    ) {
      showNotice('รายการนี้ได้รับการบันทึกขั้นสุดท้าย (Final) เรียบร้อยแล้ว ไม่สามารถบันทึกเพิ่มได้');
      return;
    }
    setSelectedItem(item);
    setModalOpen(true);
  };

  // Save actual entry
  const handleConfirmSaveActual = (input: {
    allocationId: string;
    entryType: ActualEntryType;
    goodQty: number;
    wasteQty: number;
    reworkQty: number;
    shortfallQty: number;
    shortfallReason?: string;
    recordedBy?: string;
  }) => {
    const res = plannerRepository.appendProductionActual({
      allocationId: input.allocationId,
      entryType: input.entryType,
      goodQty: input.goodQty,
      wasteQty: input.wasteQty,
      reworkQty: input.reworkQty,
      shortfallQty: input.shortfallQty,
      shortfallReason: input.shortfallReason,
      recordedBy: input.recordedBy,
    });

    if (res.success) {
      showNotice('บันทึกผลการผลิตจริงเรียบร้อยแล้ว');
      loadPageData();
    } else {
      setError(res.errors?.[0] || 'ไม่สามารถบันทึกผลการผลิตจริงได้');
    }
  };

  // Helper status badge mapping
  const renderStatusBadge = (status: ProductionStatus) => {
    switch (status) {
      case ProductionStatus.NOT_STARTED:
        return <Badge variant="slate" label="ยังไม่เริ่ม" />;
      case ProductionStatus.IN_PROGRESS:
        return <Badge variant="sky" label="กำลังผลิต" />;
      case ProductionStatus.COMPLETED:
        return <Badge variant="emerald" label="เสร็จสิ้น" />;
      case ProductionStatus.CLOSED_SHORTFALL:
        return <Badge variant="rose" label="ปิดงานโดยผลิตไม่ครบ" />;
      default:
        return <Badge variant="slate" label="ยังไม่เริ่ม" />;
    }
  };

  const activeVariants = getMotionVariants(pageTransitionVariants, reducedMotion);
  const activePlan = weekData?.activePublishedPlan ?? null;
  const allocations = weekData?.allocations ?? [];

  if (isLoading) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <LoadingState message="กำลังโหลดข้อมูลผลการผลิตจริง..." />
      </div>
    );
  }

  if (error && !weekData) {
    return (
      <div className="w-full">
        <ErrorState title="เกิดข้อผิดพลาดในการโหลด" message={error} onRetry={loadPageData} />
      </div>
    );
  }

  return (
    <motion.div
      className="w-full space-y-4"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={activeVariants}
    >
      {/* Toast Notice Banner */}
      <AnimatePresence>
        {noticeMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-sm font-medium leading-normal">{noticeMessage}</span>
            </div>
            <button
              onClick={() => setNoticeMessage(null)}
              className="p-1 text-emerald-600 hover:text-emerald-800 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Title & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
            ผลการผลิตจริง (Production Actuals)
          </h1>
          <p className="text-sm text-slate-500 mt-1 leading-normal">
            บันทึกและติดตามผลการผลิตจริงจากแผนการผลิตที่ประกาศใช้แล้ว (Published Plan)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4 text-slate-500" />}
            onClick={loadPageData}
          >
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Week Navigation Toolbar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Week Range Display */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-700 rounded-lg shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">ประจำสัปดาห์</div>
            <div className="text-base font-bold text-slate-900 tracking-tight">
              {formatThaiDate(currentWeek.weekStart)} – {formatThaiDate(currentWeek.weekEnd)}
            </div>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ChevronLeft className="w-4 h-4" />}
            onClick={handlePreviousWeek}
          >
            สัปดาห์ก่อนหน้า
          </Button>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Calendar className="w-3.5 h-3.5" />}
            onClick={handleThisWeek}
          >
            สัปดาห์นี้
          </Button>

          <Button
            variant="outline"
            size="sm"
            rightIcon={<ChevronRight className="w-4 h-4" />}
            onClick={handleNextWeek}
          >
            สัปดาห์ถัดไป
          </Button>

          <div className="w-40">
            <Input
              type="date"
              value={currentWeek.weekStart}
              onChange={handleDateSelect}
              title="เลือกวันที่ (ระบบจะแปลงเป็นวันจันทร์สัปดาห์นั้น)"
            />
          </div>
        </div>
      </div>

      {/* Active Published Plan Status Header */}
      {activePlan && (
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-semibold">
            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>แผนที่ประกาศใช้แล้วประจำสัปดาห์: <strong>{activePlan.revisionNumber}</strong></span>
          </div>
          <Badge variant="emerald" label="ประกาศใช้แล้ว" />
        </div>
      )}

      {/* Main Content: Empty State vs Allocations Table/List */}
      {!activePlan || allocations.length === 0 ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200/90 shadow-2xs text-center space-y-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              ยังไม่มีแผนที่ประกาศใช้สำหรับบันทึกผลผลิตจริง
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              ต้องทำการประกาศใช้แผนการผลิต (Publish Plan) ในหน้า &quot;วางแผนการผลิต&quot; ก่อนจึงจะสามารถทำการบันทึกยอดผลิตจริงได้
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-3.5 px-4">วันที่ / ห้องผลิต</th>
                  <th className="py-3.5 px-4">รายการผลิต</th>
                  <th className="py-3.5 px-4 text-center">ประเภท</th>
                  <th className="py-3.5 px-4 text-right">แผนผลิต</th>
                  <th className="py-3.5 px-4 text-right">ของดีรวม</th>
                  <th className="py-3.5 px-4 text-right">ของเสียรวม</th>
                  <th className="py-3.5 px-4 text-right">แก้ไขรวม</th>
                  <th className="py-3.5 px-4 text-right">ผลิตไม่ครบ</th>
                  <th className="py-3.5 px-4 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allocations.map((item) => {
                  const { allocation, actualSummary, displayName, room, productionDate, sourceType } = item;
                  const { dayName, formattedDate } = formatThaiDayAndDate(productionDate);
                  const isClosed =
                    actualSummary.status === ProductionStatus.COMPLETED ||
                    actualSummary.status === ProductionStatus.CLOSED_SHORTFALL;

                  return (
                    <tr key={allocation.allocationId} className="hover:bg-slate-50/50 transition-colors">
                      {/* Production Date & Room */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{dayName}</div>
                        <div className="text-[11px] text-slate-500">{formattedDate}</div>
                        <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                          {room ? `${room.id} - ${room.name}` : allocation.roomId}
                        </div>
                      </td>

                      {/* Item Display Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[200px]">
                        <div className="flex items-center gap-1.5 truncate">
                          {sourceType === SourceType.FG ? (
                            <Package className="w-4 h-4 text-sky-600 shrink-0" />
                          ) : (
                            <Tag className="w-4 h-4 text-sky-600 shrink-0" />
                          )}
                          <span className="truncate">{displayName}</span>
                        </div>
                      </td>

                      {/* Source Type Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={sourceType === SourceType.FG ? 'sky' : sourceType === SourceType.WIP ? 'indigo' : 'amber'}
                          label={sourceType}
                        />
                      </td>

                      {/* Planned Qty */}
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                        {allocation.plannedQty} {allocation.plannedUnit || allocation.unit}
                      </td>

                      {/* Actual Summary Qty Columns */}
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700 bg-emerald-50/30">
                        {actualSummary.totalGoodQty}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-rose-700 bg-rose-50/30">
                        {actualSummary.totalWasteQty}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-amber-700 bg-amber-50/30">
                        {actualSummary.totalReworkQty}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 bg-slate-50/50">
                        {actualSummary.totalShortfallQty}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(actualSummary.status)}
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isClosed}
                          leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenLogModal(item)}
                        >
                          บันทึกผลผลิตจริง
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Actual Modal */}
      <LogActualModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        itemDetail={selectedItem}
        onConfirmSave={handleConfirmSaveActual}
      />
    </motion.div>
  );
};
