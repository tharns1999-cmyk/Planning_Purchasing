import React, { useMemo } from 'react';
import { FileText, Flame, AlertTriangle, Calendar, Building2, Clock, AlertOctagon } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/common/Badge';
import { plannerRepository } from '@/services/plannerService';
import { DueStatus, Priority } from '@/domain/types';
import { buildOverviewReadModel, OverviewLineItemRow, OverviewShortfallRow } from '@/domain/readModels';
import { formatThaiDate } from '@/utils/thaiDate';

export type OverviewKpiType = 'ACTIVE_POS' | 'PRODUCED_ACTUAL' | 'REMAINING_TARGET' | 'COMPLETION_RATE' | 'UNPLANNED' | 'URGENT' | 'DUE_SOON' | 'OVERDUE' | 'SHORTFALL';

export interface OverviewDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpiType: OverviewKpiType | null;
  referenceDate?: string;
}

export const OverviewDrilldownModal: React.FC<OverviewDrilldownModalProps> = ({
  isOpen,
  onClose,
  kpiType,
  referenceDate,
}) => {
  const { title, icon, items, shortfallItems } = useMemo(() => {
    if (!kpiType || !isOpen) return { title: '', icon: null, items: [], shortfallItems: [] };

    try {
      plannerRepository.initialize();
      const snapshot = plannerRepository.getSnapshot();
      const refDate = referenceDate || new Date().toISOString().slice(0, 10);
      const metrics = buildOverviewReadModel(snapshot, refDate);

      if (kpiType === 'ACTIVE_POS') {
        return {
          title: `รายการใบสั่งซื้อทั้งหมดในระบบ (${metrics.allLines.length} รายการ)`,
          icon: <FileText className="w-5 h-5 text-sky-600" />,
          items: metrics.allLines,
          shortfallItems: [],
        };
      }

      if (kpiType === 'PRODUCED_ACTUAL') {
        return {
          title: `รายการที่ผลิตสำเร็จแล้ว (รวม ${metrics.totalActualProducedBoxQty.toLocaleString()} กล่อง)`,
          icon: <FileText className="w-5 h-5 text-emerald-600" />,
          items: metrics.allLines,
          shortfallItems: [],
        };
      }

      if (kpiType === 'REMAINING_TARGET') {
        return {
          title: `รายการยอดค้างผลิตคงเหลือ (รวม ${metrics.totalRemainingBoxQty.toLocaleString()} กล่อง)`,
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          items: metrics.unplannedLines,
          shortfallItems: [],
        };
      }

      if (kpiType === 'COMPLETION_RATE') {
        return {
          title: `อัตราความสำเร็จการผลิตภาพรวม (${metrics.completionRatePct}% - จากยอดกล่องผลิตจริง)`,
          icon: <FileText className="w-5 h-5 text-emerald-600" />,
          items: metrics.allLines,
          shortfallItems: [],
        };
      }

      if (kpiType === 'UNPLANNED') {
        return {
          title: `รายการสินค้าที่ยังไม่วางแผน / ค้างวางแผน (${metrics.unplannedLines.length} รายการ)`,
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          items: metrics.unplannedLines,
          shortfallItems: [],
        };
      }

      if (kpiType === 'URGENT') {
        return {
          title: `รายการสินค้าสั่งซื้อด่วนพิเศษ (Urgent - ${metrics.urgentLines.length} รายการ)`,
          icon: <Flame className="w-5 h-5 text-rose-600" />,
          items: metrics.urgentLines,
          shortfallItems: [],
        };
      }

      if (kpiType === 'DUE_SOON') {
        return {
          title: `รายการสินค้าใกล้ถึงกำหนดส่ง (${metrics.dueSoonLines.length} รายการ)`,
          icon: <Clock className="w-5 h-5 text-amber-600" />,
          items: metrics.dueSoonLines,
          shortfallItems: [],
        };
      }

      if (kpiType === 'OVERDUE') {
        return {
          title: `รายการสินค้าเกินกำหนดส่ง (${metrics.overdueLines.length} รายการ)`,
          icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
          items: metrics.overdueLines,
          shortfallItems: [],
        };
      }

      if (kpiType === 'SHORTFALL') {
        return {
          title: `ประวัติรายการบันทึกผลผลิตไม่ครบ (${metrics.shortfallRows.length} รายการ)`,
          icon: <AlertOctagon className="w-5 h-5 text-purple-600" />,
          items: [],
          shortfallItems: metrics.shortfallRows,
        };
      }

      return { title: 'รายละเอียดรายการ', icon: null, items: metrics.allLines, shortfallItems: [] };
    } catch {
      return { title: 'รายละเอียดรายการ', icon: null, items: [], shortfallItems: [] };
    }
  }, [kpiType, isOpen, referenceDate]);

  const renderDueStatusBadge = (status: DueStatus) => {
    switch (status) {
      case DueStatus.OVERDUE:
        return <Badge variant="rose" label="เกินกำหนดส่ง" />;
      case DueStatus.DUE_SOON:
        return <Badge variant="amber" label="ใกล้ถึงกำหนด" />;
      case DueStatus.PLANNED_COMPLETE:
        return <Badge variant="emerald" label="วางแผนครบแล้ว" />;
      case DueStatus.UPCOMING:
      default:
        return <Badge variant="sky" label="ตามแผนปกติ" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
      }
      maxWidth="5xl"
    >
      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        {kpiType === 'SHORTFALL' ? (
          shortfallItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">ไม่พบประวัติรายการบันทึกผลผลิตไม่ครบ</div>
          ) : (
            <div className="space-y-3">
              {shortfallItems.map((sf: OverviewShortfallRow) => (
                <div
                  key={sf.allocationId}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{sf.displayName}</div>
                      <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        ผลิตวันที่ {formatThaiDate(sf.productionDate)}
                      </div>
                    </div>
                    <Badge variant="rose" label="CLOSED SHORTFALL" />
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-white p-2.5 rounded-lg border border-slate-200 text-center font-medium">
                    <div>
                      <div className="text-slate-400 text-[11px]">เป้าหมาย</div>
                      <div className="font-bold text-slate-800 text-sm">{sf.plannedQty.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[11px]">ผลิตได้จริง</div>
                      <div className="font-bold text-emerald-600 text-sm">{sf.totalGoodQty.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[11px]">ขาดอีก</div>
                      <div className="font-bold text-rose-600 text-sm">{sf.shortfallQty.toLocaleString()}</div>
                    </div>
                  </div>

                  {sf.shortfallReason && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg text-xs leading-normal">
                      <span className="font-semibold">สาเหตุ: </span>
                      {sf.shortfallReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">ไม่พบข้อมูลตามตัวกรองที่เลือก</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3.5">PO</th>
                  <th className="py-3 px-3.5">ลูกค้า</th>
                  <th className="py-3 px-3.5">สินค้า</th>
                  <th className="py-3 px-3.5 text-right">จำนวนสั่ง</th>
                  <th className="py-3 px-3.5 text-right">วางแผนแล้ว</th>
                  <th className="py-3 px-3.5 text-right">จำนวนคงเหลือ</th>
                  <th className="py-3 px-3.5">Due Date</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {items.map((item: OverviewLineItemRow) => (
                  <tr key={item.salesOrderLineId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3.5 font-bold text-slate-900">{item.poNumber}</td>
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {item.customerName}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900">{item.productName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{item.productCode}</div>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-semibold text-slate-900">
                      {item.orderedQty.toLocaleString()} {item.unit}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-semibold text-emerald-600">
                      {item.activePlannedQty.toLocaleString()} {item.unit}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-amber-600">
                      {item.remainingQty.toLocaleString()} {item.unit}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-700">
                      <div className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatThaiDate(item.dueDate)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {item.priority === Priority.URGENT && <Badge variant="rose" label="ด่วน" />}
                        {renderDueStatusBadge(item.dueStatus)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};
