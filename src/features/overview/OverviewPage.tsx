import React, { useEffect, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  FileText,
  AlertTriangle,
  Flame,
  AlertOctagon,
  RefreshCw,
  ShoppingBag,
  CheckCircle2,
  Clock,
  PackageCheck,
  Building2,
  Calendar,
} from 'lucide-react';

import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { plannerRepository } from '@/services/plannerService';
import { DashboardSummaryDetail } from '@/services/repositories/PlannerRepository';
import { DueStatus } from '@/domain/types';
import { pageTransitionVariants, getMotionVariants } from '@/motion/tokens';
import { OverviewDrilldownModal, OverviewKpiType } from './OverviewDrilldownModal';
import { buildOverviewReadModel, OverviewMetricsSummary } from '@/domain/readModels';

export interface OverviewPageProps {
  referenceDate?: string;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ referenceDate }) => {
  const reducedMotion = useReducedMotion() ?? false;
  const [summary, setSummary] = useState<DashboardSummaryDetail | null>(null);
  const [overviewModel, setOverviewModel] = useState<OverviewMetricsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [drilldownKpi, setDrilldownKpi] = useState<OverviewKpiType | null>(null);


  const loadDashboardData = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      plannerRepository.initialize();
      const summaryData = plannerRepository.getDashboardSummary(referenceDate);
      const snapshot = plannerRepository.getSnapshot();
      const readModel = buildOverviewReadModel(snapshot, referenceDate);
      setSummary(summaryData);
      setOverviewModel(readModel);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
      setError('ไม่สามารถโหลดข้อมูลภาพรวมระบบได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  }, [referenceDate]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <LoadingState message="กำลังโหลดข้อมูลภาพรวมการผลิต..." />
      </div>
    );
  }

  if (error || !summary || !overviewModel) {
    return (
      <div className="w-full">
        <ErrorState
          title="เกิดข้อผิดพลาดในการโหลดภาพรวม"
          message={error || 'ไม่พบข้อมูลสรุปภาพรวม'}
          onRetry={loadDashboardData}
        />
      </div>
    );
  }

  const activeVariants = getMotionVariants(pageTransitionVariants, reducedMotion);

  // Helper for rendering DueStatus badge
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

  // Percentages for Sales Order status bar
  const totalLines = summary.totalPoLineCount || 1;
  const fullyPlannedPct = Math.round((summary.fullyPlannedLineCount / totalLines) * 100);
  const partiallyPlannedPct = Math.round((summary.partiallyPlannedLineCount / totalLines) * 100);
  const unplannedPct = Math.max(0, 100 - fullyPlannedPct - partiallyPlannedPct);

  return (
    <motion.div
      className="w-full space-y-4"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={activeVariants}
    >
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
            ภาพรวมการผลิตรายสัปดาห์
          </h1>
          <p className="text-sm text-slate-500 mt-1 leading-normal">
            สรุปสถานะใบสั่งซื้อ แผนการผลิตประจำสัปดาห์ และรายการแจ้งเตือนเร่งด่วน (กดที่ Card เพื่อดูรายละเอียด)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4 text-slate-500" />}
            onClick={loadDashboardData}
          >
            รีเฟรชข้อมูล
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid (6 Metric Cards - Clickable & 100% Single Source of Truth) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Active POs */}
        <div
          onClick={() => setDrilldownKpi('ACTIVE_POS')}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between transition-all hover:border-sky-400 hover:shadow-md cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 leading-normal">PO ที่ใช้งาน</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{overviewModel.allLines.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">รายการสั่งซื้อในระบบ</div>
            <span className="text-[10px] text-sky-600 font-semibold block mt-1">กดเพื่อดูรายละเอียด →</span>
          </div>
        </div>

        {/* Card 2: Unplanned Lines */}
        <div
          onClick={() => setDrilldownKpi('UNPLANNED')}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between transition-all hover:border-amber-400 hover:shadow-md cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 leading-normal">ยังไม่วางแผน</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600 tracking-tight">{overviewModel.unplannedLines.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">รายการค้างจัดแผน</div>
            <span className="text-[10px] text-amber-600 font-semibold block mt-1">กดเพื่อดูรายละเอียด →</span>
          </div>
        </div>

        {/* Card 3: Urgent Orders */}
        <div
          onClick={() => setDrilldownKpi('URGENT')}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between transition-all hover:border-rose-400 hover:shadow-md cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 leading-normal">PO เร่งด่วน</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600 tracking-tight">{overviewModel.urgentLines.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">รายการต้องเร่งวางแผน</div>
            <span className="text-[10px] text-rose-600 font-semibold block mt-1">กดเพื่อดูรายละเอียด →</span>
          </div>
        </div>

        {/* Card 4: Due Soon Items */}
        <div
          onClick={() => setDrilldownKpi('DUE_SOON')}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between transition-all hover:border-amber-400 hover:shadow-md cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 leading-normal">ใกล้กำหนดส่ง</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600 tracking-tight">{overviewModel.dueSoonLines.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">ส่งภายใน 3 วัน</div>
            <span className="text-[10px] text-amber-600 font-semibold block mt-1">กดเพื่อดูรายละเอียด →</span>
          </div>
        </div>

        {/* Card 5: Overdue Items */}
        <div
          onClick={() => setDrilldownKpi('OVERDUE')}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between transition-all hover:border-rose-400 hover:shadow-md cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 leading-normal">เกินกำหนดส่ง</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600 tracking-tight">{overviewModel.overdueLines.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">เกินกำหนดส่งแล้ว</div>
            <span className="text-[10px] text-rose-600 font-semibold block mt-1">กดเพื่อดูรายละเอียด →</span>
          </div>
        </div>

        {/* Card 6: Shortfall Items */}
        <div
          onClick={() => setDrilldownKpi('SHORTFALL')}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between transition-all hover:border-purple-400 hover:shadow-md cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 leading-normal">ผลิตไม่ครบ</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600 tracking-tight">{overviewModel.shortfallRows.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">ปิดงานแบบขาดเหลือ</div>
            <span className="text-[10px] text-purple-600 font-semibold block mt-1">กดเพื่อดูรายละเอียด →</span>
          </div>
        </div>
      </div>



      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sales Order Progress & Urgent FG Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Sales Order Status Breakdown */}
          <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 text-sky-700 rounded-lg">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    ภาพรวมความคืบหน้าใบสั่งซื้อ
                  </h2>
                  <p className="text-xs text-slate-500 leading-normal">
                    สถานะการวางแผนลงตารางของรายการสินค้าทั้งหมดในระบบ ({summary.totalPoLineCount} รายการ)
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                แผนจัดพิมพ์แล้ว {summary.publishedPlanCount} แผน
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-2 mb-4">
              <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${fullyPlannedPct}%` }}
                  title={`วางแผนครบแล้ว ${summary.fullyPlannedLineCount} รายการ (${fullyPlannedPct}%)`}
                />
                <div
                  className="bg-amber-400 transition-all duration-500"
                  style={{ width: `${partiallyPlannedPct}%` }}
                  title={`วางแผนบางส่วน ${summary.partiallyPlannedLineCount} รายการ (${partiallyPlannedPct}%)`}
                />
                <div
                  className="bg-slate-300 transition-all duration-500"
                  style={{ width: `${unplannedPct}%` }}
                  title={`ยังไม่วางแผน ${summary.unplannedLineCount} รายการ (${unplannedPct}%)`}
                />
              </div>

              {/* Legend Badges */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800">วางแผนครบแล้ว</div>
                    <div className="text-slate-500">{summary.fullyPlannedLineCount} รายการ ({fullyPlannedPct}%)</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800">วางแผนบางส่วน</div>
                    <div className="text-slate-500">{summary.partiallyPlannedLineCount} รายการ ({partiallyPlannedPct}%)</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-100/70 border border-slate-200">
                  <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-800">ยังไม่วางแผน</div>
                    <div className="text-slate-500">{summary.unplannedLineCount} รายการ ({unplannedPct}%)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Urgent FG Items Table */}
          <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    รายการ FG เร่งด่วน (Urgent Items)
                  </h2>
                  <p className="text-xs text-slate-500 leading-normal">
                    รายการสินค้าสำเร็จรูปด่วนพิเศษที่ต้องการจัดลงแผนโดยเร็วที่สุด
                  </p>
                </div>
              </div>
              <Badge variant="rose" label={`ด่วน ${summary.urgentFgLines.length} รายการ`} />
            </div>

            {summary.urgentFgLines.length === 0 ? (
              <EmptyState
                title="ไม่มีรายการ FG เร่งด่วน"
                message="ขณะนี้ไม่มีรายการสินค้าสั่งซื้อเร่งด่วนที่ค้างวางแผนในระบบ"
                icon={<PackageCheck className="w-6 h-6" />}
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-3">ใบสั่งซื้อ / ลูกค้า</th>
                      <th className="py-2.5 px-3">สินค้า</th>
                      <th className="py-2.5 px-3 text-right">จำนวนค้างวางแผน</th>
                      <th className="py-2.5 px-3">กำหนดส่ง</th>
                      <th className="py-2.5 px-3 text-center">ความสำคัญ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {summary.urgentFgLines.map((item) => (
                      <tr key={item.salesOrderLineId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{item.poNumber}</div>
                          <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {item.customerName}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{item.productName}</div>
                          <div className="text-slate-500 font-mono text-[11px]">{item.productCode}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          <span className="text-slate-900 font-bold">{item.remainingQty.toLocaleString()}</span>{' '}
                          <span className="text-slate-500">{item.unit}</span>
                          <div className="text-[11px] text-slate-400">สั่งซื้อ {item.orderedQty.toLocaleString()}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.dueDate}</span>
                          </div>
                          <div className="mt-0.5">{renderDueStatusBadge(item.dueStatus)}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant="rose" label="ด่วนมาก" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Section 3 Recent Production Shortfalls */}
        <div className="space-y-6">
          <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-2xs h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    รายการผลิตไม่ครบล่าสุด
                  </h2>
                  <p className="text-xs text-slate-500 leading-normal">
                    ประวัติรายการปิดงานแบบ Shortfall ที่ต้องติดตาม
                  </p>
                </div>
              </div>
            </div>

            {summary.recentShortfalls.length === 0 ? (
              <EmptyState
                title="ไม่มีรายการผลิตไม่ครบ"
                message="ขณะนี้ยังไม่มีประวัติการปิดงานผลิตไม่ครบในระบบ"
                icon={<CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                className="flex-1"
              />
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
                {summary.recentShortfalls.map((sf) => (
                  <div
                    key={sf.allocationId}
                    className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2 text-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{sf.displayName}</div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          ผลิตวันที่ {sf.productionDate}
                        </div>
                      </div>
                      <Badge variant="rose" label="CLOSED SHORTFALL" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded-lg border border-slate-200/80 text-center">
                      <div>
                        <div className="text-slate-400 text-[10px]">เป้าหมาย</div>
                        <div className="font-bold text-slate-800">{sf.plannedQty.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px]">ผลิตได้จริง</div>
                        <div className="font-bold text-emerald-600">{sf.totalGoodQty.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px]">ขาดอีก</div>
                        <div className="font-bold text-rose-600">{sf.shortfallQty.toLocaleString()}</div>
                      </div>
                    </div>

                    {sf.shortfallReason && (
                      <div className="p-2 bg-rose-50/80 border border-rose-200/70 text-rose-900 rounded-lg text-xs leading-normal">
                        <span className="font-semibold">สาเหตุ: </span>
                        {sf.shortfallReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>



      {/* KPI Drilldown Modal */}
      <OverviewDrilldownModal
        isOpen={Boolean(drilldownKpi)}
        onClose={() => setDrilldownKpi(null)}
        kpiType={drilldownKpi}
        referenceDate={referenceDate}
      />
    </motion.div>
  );
};

