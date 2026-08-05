import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  LayoutDashboard,
  FileText,
  CheckCircle2,
  Clock,
  PieChart,
  Filter,
  Search,
  Building2,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { plannerRepository } from '@/services/plannerService';
import { SalesOrder, CustomerMaster, ProductionStatus } from '@/domain/types';
import { formatThaiDate } from '@/utils/thaiDate';
import { pageTransitionVariants, getMotionVariants } from '@/motion/tokens';

// eslint-disable-next-line react-refresh/only-export-components
export function parseCompletedQtyToProgress(completedQty: number | string | undefined, orderedQty: number): number {
  if (orderedQty <= 0) return 0;
  if (completedQty === undefined || completedQty === null) return 0;

  if (typeof completedQty === 'number') {
    if (!Number.isFinite(completedQty) || completedQty <= 0) return 0;
    return Math.min(100, Math.round((completedQty / orderedQty) * 100));
  }

  const str = String(completedQty).trim().toLowerCase();
  if (str === '' || str === '0') return 0;

  // Check for completion keyword symbols/text
  if (
    str.includes('✅') ||
    str.includes('ครบ') ||
    str.includes('done') ||
    str.includes('complete') ||
    str.includes('completed') ||
    str.includes('finish')
  ) {
    return 100;
  }

  // Parse numeric prefix/string
  const num = parseFloat(str);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.min(100, Math.round((num / orderedQty) * 100));
}

export const DashboardPage: React.FC = () => {
  const reducedMotion = useReducedMotion() ?? false;

  const [orders, setOrders] = useState<SalesOrder[]>(() => {
    try { return plannerRepository.listSalesOrders(); } catch { return []; }
  });
  const [customers, setCustomers] = useState<CustomerMaster[]>(() => {
    try { return plannerRepository.listCustomers(true); } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => orders.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!plannerRepository.isInitialized) {
      setIsLoading(true);
    }
    setError(null);
    try {
      await plannerRepository.initializeAsync();
      const listOrders = plannerRepository.listSalesOrders();
      const listCusts = plannerRepository.listCustomers(true);
      setOrders(listOrders);
      setCustomers(listCusts);
    } catch (err) {
      console.error('Failed to load Dashboard data:', err);
      setError('ไม่สามารถโหลดข้อมูลแดชบอร์ดภาพรวมการผลิตได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute PO progress percentages
  const ordersWithProgress = useMemo(() => {
    const snap = plannerRepository.getSnapshot();
    const actualEntries = snap.entities.productionActualEntries || [];
    const planAllocations = snap.entities.planAllocations || [];

    return orders.map((o) => {
      const lines = o.lines || [];
      const totalOrdered = lines.reduce((sum, l) => sum + (l.orderedQty || 0), 0);

      // Sum goodQty for all lines of this order
      let totalActualCompleted = 0;
      let lineProgressSum = 0;

      lines.forEach((line) => {
        const lineAllocations = planAllocations.filter(
          (a) => a.salesOrderLineId === line.id
        );
        const lineAllocIds = new Set(lineAllocations.map((a) => a.allocationId));
        const lineGoodQty = actualEntries
          .filter((e) => lineAllocIds.has(e.allocationId))
          .reduce((sum, e) => sum + (e.goodQty || 0), 0);

        // Check if completedQty field is explicitly saved on line
        const lineCompletedVal = line.completedQty !== undefined ? line.completedQty : lineGoodQty;
        const lineProg = parseCompletedQtyToProgress(lineCompletedVal, line.orderedQty);

        totalActualCompleted += typeof lineCompletedVal === 'number' ? lineCompletedVal : lineGoodQty;
        lineProgressSum += lineProg;
      });

      const overallProgress = lines.length > 0 ? Math.round(lineProgressSum / lines.length) : 0;

      // Determine order status
      let derivedStatus: ProductionStatus = ProductionStatus.NOT_STARTED;
      if (o.status === ProductionStatus.COMPLETED || overallProgress === 100) {
        derivedStatus = ProductionStatus.COMPLETED;
      } else if (overallProgress > 0 || totalActualCompleted > 0) {
        derivedStatus = ProductionStatus.IN_PROGRESS;
      }

      // Min/Max Due Date for PO
      const dueDates = lines.map((l) => l.dueDate).filter(Boolean);
      dueDates.sort();
      const earliestDue = dueDates[0] || o.orderDate;

      return {
        order: o,
        lines,
        totalOrdered,
        totalActualCompleted,
        overallProgress,
        status: derivedStatus,
        earliestDue,
      };
    });
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return ordersWithProgress.filter((item) => {
      const { order, status } = item;

      // Search Query
      if (
        q &&
        !String(order.orderNo || '').toLowerCase().includes(q) &&
        !String(order.customerName || '').toLowerCase().includes(q) &&
        !item.lines.some((l) => String(l.skuName || '').toLowerCase().includes(q) || String(l.skuCode || '').toLowerCase().includes(q))
      ) {
        return false;
      }

      // Customer Filter
      if (customerFilter !== 'ALL' && order.customerName !== customerFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING' && status !== ProductionStatus.NOT_STARTED) return false;
        if (statusFilter === 'IN_PROGRESS' && status !== ProductionStatus.IN_PROGRESS) return false;
        if (statusFilter === 'COMPLETED' && status !== ProductionStatus.COMPLETED) return false;
      }

      // Date Range Filter
      if (dateFrom && order.orderDate < dateFrom) return false;
      if (dateTo && order.orderDate > dateTo) return false;

      return true;
    });
  }, [ordersWithProgress, searchQuery, customerFilter, statusFilter, dateFrom, dateTo]);

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    const totalPos = ordersWithProgress.length;
    const completedPos = ordersWithProgress.filter((o) => o.status === ProductionStatus.COMPLETED).length;
    const inProgressPos = ordersWithProgress.filter((o) => o.status === ProductionStatus.IN_PROGRESS).length;
    const pendingPos = ordersWithProgress.filter((o) => o.status === ProductionStatus.NOT_STARTED).length;

    const totalFulfillmentPct =
      totalPos > 0
        ? Math.round(
            (ordersWithProgress.reduce((sum, o) => sum + o.overallProgress, 0) / (totalPos * 100)) * 100
          )
        : 0;

    return {
      totalPos,
      completedPos,
      inProgressPos,
      pendingPos,
      totalFulfillmentPct,
    };
  }, [ordersWithProgress]);

  if (isLoading) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <LoadingState message="กำลังโหลดข้อมูลสรุปภาพรวมการผลิต (Dashboard)..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <ErrorState title="เกิดข้อผิดพลาด" message={error} onRetry={loadData} />
      </div>
    );
  }

  const activeVariants = getMotionVariants(pageTransitionVariants, reducedMotion);

  const resetFilters = () => {
    setSearchQuery('');
    setCustomerFilter('ALL');
    setStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <motion.div
      className="w-full space-y-4 pb-6"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={activeVariants}
    >
      {/* Top Bar Header */}
      <div className="border-b border-slate-200/80 pb-3">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-snug flex items-center gap-2.5">
          <LayoutDashboard className="w-7 h-7 text-sky-600" />
          <span>สรุปภาพรวมการผลิต (Production Dashboard)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1 leading-normal">
          รายงานสถานะและดัชนีชี้วัดความคืบหน้าการผลิต
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total POs */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{metrics.totalPos}</div>
            <div className="text-xs text-slate-500 font-medium">Total POs (ใบสั่งซื้อทั้งหมด)</div>
          </div>
        </div>

        {/* Completed POs */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600 tracking-tight">{metrics.completedPos}</div>
            <div className="text-xs text-slate-500 font-medium">Completed (เสร็จสิ้นครบถ้วน)</div>
          </div>
        </div>

        {/* Pending / In Progress */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600 tracking-tight">
              {metrics.inProgressPos + metrics.pendingPos}
            </div>
            <div className="text-xs text-slate-500 font-medium">Pending / In Progress (กำลังดำเนินการ)</div>
          </div>
        </div>

        {/* % Fulfillment Rate */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-sky-600 tracking-tight">{metrics.totalFulfillmentPct}%</div>
            <div className="text-xs text-slate-500 font-medium">% Fulfillment Rate (อัตราการผลิตสำเร็จ)</div>
          </div>
        </div>
      </div>

      {/* Toolbar Filters Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center gap-3 justify-between">
        <div className="w-64">
          <Input
            placeholder="ค้นหา PO/ลูกค้า/สินค้า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-52">
            <Select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              leftIcon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
              options={[
                { value: 'ALL', label: 'ทุกลูกค้า' },
                ...customers.map((c) => ({ value: c.customerName, label: c.customerName })),
              ]}
            />
          </div>

          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              leftIcon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
              options={[
                { value: 'ALL', label: 'สถานะ: ทั้งหมด' },
                { value: 'PENDING', label: 'ยังไม่เริ่มผลิต' },
                { value: 'IN_PROGRESS', label: 'กำลังผลิต' },
                { value: 'COMPLETED', label: 'เสร็จสิ้นครบถ้วน' },
              ]}
            />
          </div>

          <div className="w-36">
            <Input
              type="date"
              title="ตั้งแต่วันที่"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="w-36">
            <Input
              type="date"
              title="ถึงวันที่"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {(searchQuery || customerFilter !== 'ALL' || statusFilter !== 'ALL' || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              ล้างตัวกรอง
            </Button>
          )}
        </div>
      </div>

      {/* PO Tracking Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <EmptyState
            title="ไม่พบข้อมูล PO ที่ตรงกับเงื่อนไข"
            message="ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองที่เลือกไว้"
            icon={<PieChart className="w-6 h-6" />}
            actionLabel="ล้างตัวกรอง"
            onAction={resetFilters}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3.5 px-4 w-36">เลขที่ PO</th>
                  <th className="py-3.5 px-4">ลูกค้า</th>
                  <th className="py-3.5 px-4 w-32">รับ PO วันที่</th>
                  <th className="py-3.5 px-4 w-32">กำหนดส่ง</th>
                  <th className="py-3.5 px-4 w-28 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 w-64">ความคืบหน้า (% Fulfillment)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredOrders.map((item) => {
                  const { order, overallProgress, status, earliestDue } = item;

                  let statusBadge = <Badge variant="slate" label="ยังไม่เริ่มผลิต" />;
                  if (status === ProductionStatus.COMPLETED) {
                    statusBadge = <Badge variant="emerald" label="เสร็จสิ้น" />;
                  } else if (status === ProductionStatus.IN_PROGRESS) {
                    statusBadge = <Badge variant="sky" label="กำลังผลิต" />;
                  }

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{order.orderNo}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{order.customerName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{formatThaiDate(order.orderDate)}</td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatThaiDate(earliestDue)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">{statusBadge}</td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-700">ความคืบหน้ารวม</span>
                            <span
                              className={
                                overallProgress === 100
                                  ? 'text-emerald-600'
                                  : overallProgress > 0
                                  ? 'text-sky-600'
                                  : 'text-slate-400'
                              }
                            >
                              {overallProgress}%
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                overallProgress === 100
                                  ? 'bg-emerald-500'
                                  : overallProgress > 50
                                  ? 'bg-sky-500'
                                  : 'bg-amber-400'
                              }`}
                              style={{ width: `${overallProgress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};
