import React, { useMemo } from 'react';
import { FileText, Building2, Calendar, Layers, Clock } from 'lucide-react';
import { Modal } from '@/components/common/Modal';

import { Badge } from '@/components/common/Badge';
import { plannerRepository } from '@/services/plannerService';
import { SalesOrderWithLinesDetail } from '@/services/repositories/PlannerRepository';
import { Priority, DueStatus, SourceType } from '@/domain/types';
import { calculateActivePlannedQtyForLine, calculateRemainingQty, getDueStatus, getActivePlanRevision } from '@/domain/calculations';
import { formatThaiDate } from '@/utils/thaiDate';

export interface PoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderDetail: SalesOrderWithLinesDetail | null;
}

export const PoDetailModal: React.FC<PoDetailModalProps> = ({ isOpen, onClose, orderDetail }) => {
  const { order, lines } = orderDetail || { order: null, lines: [] };

  // Calculate snapshot & active plan for allocation details
  const activePlan = useMemo(() => {
    if (!isOpen) return null;
    try {
      plannerRepository.initialize();
      const plans = plannerRepository.getSnapshot().entities.weeklyPlans;
      return getActivePlanRevision(plans);
    } catch {
      return null;
    }
  }, [isOpen]);

  if (!order) return null;

  // Total summary calculations
  const totalOrderedQty = lines.reduce((sum, l) => sum + l.orderedQty, 0);
  const totalPlannedFgQty = lines.reduce((sum, l) => {
    const plans = plannerRepository.getSnapshot().entities.weeklyPlans;
    return sum + calculateActivePlannedQtyForLine(l.id, plans);
  }, 0);
  const totalRemainingQty = Math.max(0, totalOrderedQty - totalPlannedFgQty);

  let poStatusBadge = <Badge variant="emerald" label="วางแผนครบแล้ว" />;
  if (totalRemainingQty === totalOrderedQty) {
    poStatusBadge = <Badge variant="slate" label="ยังไม่วางแผน" />;
  } else if (totalRemainingQty > 0) {
    poStatusBadge = <Badge variant="amber" label="วางแผนบางส่วน" />;
  }

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
          <FileText className="w-5 h-5 text-sky-600" />
          <span>รายละเอียดใบสั่งซื้อ PO: {order.orderNo}</span>
        </div>
      }
      maxWidth="5xl"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Header Summary Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-slate-900">{order.orderNo}</span>
                {poStatusBadge}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-600 mt-1 flex-wrap font-medium">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  ลูกค้า: <strong className="text-slate-900">{order.customerName}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  วันที่รับ PO: <strong className="text-slate-900">{formatThaiDate(order.orderDate)}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">ความเร่งด่วน:</span>
              {lines.some((l) => l.priority === Priority.URGENT) ? (
                <Badge variant="rose" label="ด่วนพิเศษ" />
              ) : (
                <Badge variant="slate" label="ปกติ" />
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-lg border border-slate-200 text-center text-xs">
            <div>
              <div className="text-slate-500 font-medium">ยอดสั่งซื้อรวม</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{totalOrderedQty.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-slate-500 font-medium">วางแผนลงตารางแล้ว</div>
              <div className="text-base font-bold text-emerald-600 mt-0.5">{totalPlannedFgQty.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-slate-500 font-medium">ยอดคงเหลือค้างจัดแผน</div>
              <div className={`text-base font-bold mt-0.5 ${totalRemainingQty > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {totalRemainingQty.toLocaleString()}
              </div>
            </div>
          </div>

          {order.note && (
            <div className="p-2.5 bg-amber-50/70 border border-amber-200 text-amber-900 rounded-lg text-xs">
              <span className="font-semibold">หมายเหตุ PO: </span>
              {order.note}
            </div>
          )}
        </div>

        {/* Product Lines Table */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Layers className="w-4 h-4 text-sky-600" />
            <span>รายการสินค้าใน PO ({lines.length} รายการ)</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3">รหัสสินค้า</th>
                  <th className="py-2.5 px-3">ชื่อสินค้า</th>
                  <th className="py-2.5 px-3 text-right">สั่งซื้อ</th>
                  <th className="py-2.5 px-3 text-right text-emerald-700">สินค้าครบ</th>
                  <th className="py-2.5 px-3 text-right text-rose-600">สินค้าขาด</th>
                  <th className="py-2.5 px-3">กำหนดส่ง</th>
                  <th className="py-2.5 px-3 text-center">ความด่วน</th>
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {lines.map((line) => {
                  const snap = plannerRepository.getSnapshot();
                  const plans = snap.entities.weeklyPlans;
                  const activePlannedQty = calculateActivePlannedQtyForLine(line.id, plans);
                  const remainingQty = calculateRemainingQty(line.orderedQty, line.cancelledQty, activePlannedQty);
                  const dueStatus = getDueStatus(line.dueDate, remainingQty);

                  // Calculate actual goodQty from ProductionActualEntries
                  const lineAllocationsAll = snap.entities.planAllocations.filter(
                    (a) => a.salesOrderLineId === line.id && a.sourceType === SourceType.FG
                  );
                  const lineAllocIds = new Set(lineAllocationsAll.map((a) => a.allocationId));
                  const actualEntries = (snap.entities.productionActualEntries || []).filter((e) =>
                    lineAllocIds.has(e.allocationId)
                  );
                  const totalActualGoodQty = actualEntries.reduce((sum, e) => sum + e.goodQty, 0);
                  const totalActualShortageQty = Math.max(0, line.orderedQty - line.cancelledQty - totalActualGoodQty);

                  const displayCompleted = line.completedQty !== undefined ? String(line.completedQty) : totalActualGoodQty.toLocaleString();
                  const displayShortage = line.shortageQty !== undefined ? String(line.shortageQty) : totalActualShortageQty.toLocaleString();

                  // Find allocations for this line in active plan (strictly filtered by this PO's line ID & FG source type)
                  const lineAllocations = activePlan && line.id
                    ? activePlan.allocations.filter(
                        (a) => a.salesOrderLineId === line.id && a.sourceType === SourceType.FG
                      )
                    : [];

                  return (
                    <React.Fragment key={line.id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{line.skuCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{line.skuName}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {line.orderedQty.toLocaleString()} {line.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700 bg-emerald-50/40">
                          {displayCompleted}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600 bg-rose-50/30">
                          {displayShortage}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">{formatThaiDate(line.dueDate)}</td>
                        <td className="py-2.5 px-3 text-center">
                          {line.priority === Priority.URGENT ? <Badge variant="rose" label="ด่วน" /> : <Badge variant="slate" label="ปกติ" />}
                        </td>
                        <td className="py-2.5 px-3 text-center">{renderDueStatusBadge(dueStatus)}</td>
                      </tr>

                      {/* Render Allocation details if planned */}
                      {lineAllocations.length > 0 && (
                        <tr className="bg-sky-50/40 border-b border-sky-100">
                          <td colSpan={8} className="p-3">
                            <div className="space-y-1.5">
                              <div className="text-[11px] font-bold text-sky-900 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-sky-600" />
                                รายการจัดลงตารางผลิต (Revision: R{activePlan?.revisionNumber}):
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {lineAllocations.map((alloc) => (
                                  <div
                                    key={alloc.allocationId}
                                    className="p-2 bg-white rounded-md border border-sky-200/80 text-[11px] flex items-center justify-between shadow-2xs"
                                  >
                                    <div>
                                      <span className="font-bold text-slate-800">วันที่ผลิต: {alloc.productionDate}</span>
                                      <span className="ml-2 font-semibold text-sky-700">({alloc.roomId})</span>
                                    </div>
                                    <div className="font-semibold text-emerald-700">
                                      FG Output: {alloc.fgOutputQty?.toLocaleString()} {alloc.fgOutputUnit || line.unit}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
