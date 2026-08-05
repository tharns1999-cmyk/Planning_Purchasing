import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Edit2, FileText, Plus, Search, Filter, Building2, Calendar, Package, Flame, X, Layers, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { CreatePoModal } from './CreatePoModal';
import { PoDetailModal } from './PoDetailModal';
import { EditPoModal } from './EditPoModal';
import { plannerRepository } from '@/services/plannerService';
import { SalesOrderWithLinesDetail } from '@/services/repositories/PlannerRepository';
import { Priority, DueStatus, SalesOrder, SalesOrderLine } from '@/domain/types';
import {
  calculateActivePlannedQtyForLine,
  calculateRemainingQty,
  getDueStatus,
} from '@/domain/calculations';
import { formatThaiDate } from '@/utils/thaiDate';
import { pageTransitionVariants, getMotionVariants } from '@/motion/tokens';

export const OrdersPage: React.FC = () => {
  const reducedMotion = useReducedMotion() ?? false;
  const [ordersDetail, setOrdersDetail] = useState<SalesOrderWithLinesDetail[]>(() => {
    try {
      const orders = plannerRepository.listSalesOrders();
      if (orders && orders.length > 0) {
        return orders.map((o) => plannerRepository.getSalesOrderWithLines(o.id)!).filter(Boolean);
      }
    } catch {}
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => ordersDetail.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dueStatusFilter, setDueStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'PO' | 'LINE'>('PO');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<SalesOrderWithLinesDetail | null>(null);
  const [editingOrderDetail, setEditingOrderDetail] = useState<SalesOrderWithLinesDetail | null>(null);

  // Notice toast state
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const resetFilters = useCallback(async () => {
    setSearchQuery('');
    setPriorityFilter('ALL');
    setStatusFilter('ALL');
    setDueStatusFilter('ALL');
  }, []);

  const loadOrdersData = useCallback(async () => {
    if (!plannerRepository.isInitialized) {
      setIsLoading(true);
    }
    setError(null);
    try {
      await plannerRepository.initializeAsync();
      const orders = plannerRepository.listSalesOrders();
      const details: SalesOrderWithLinesDetail[] = orders.map((o) => {
        const detail = plannerRepository.getSalesOrderWithLines(o.id);
        return (
          detail || {
            order: o,
            lines: o.lines,
            totalLines: o.lines.length,
            totalOrderedQty: o.lines.reduce((sum, l) => sum + l.orderedQty, 0),
            totalRemainingQty: o.lines.reduce((sum, l) => sum + (l.orderedQty - l.cancelledQty), 0),
          }
        );
      });
      setOrdersDetail(details);
    } catch (err) {
      console.error('Failed to load Sales Orders:', err);
      setError('ไม่สามารถโหลดข้อมูลใบสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrdersData();
  }, [loadOrdersData]);

  // Handle PO Creation success callback
  const handleCreatePoSuccess = async () => {
    loadOrdersData();
    setNoticeMessage('สร้าง PO สำเร็จ');
    setTimeout(() => {
      setNoticeMessage(null);
    }, 4000);
  };

  // Calculate snapshot data for line status & remaining qty calculations
  const snapshotPlans = useMemo(() => {
    try {
      return plannerRepository.getSnapshot().entities.weeklyPlans;
    } catch {
      return [];
    }
  }, []);

  // Flat Order Lines list for Line-based view
  interface FlatOrderLineDetail {
    line: SalesOrderLine;
    order: SalesOrder;
    parentOrderDetail: SalesOrderWithLinesDetail;
    activePlannedQty: number;
    remainingQty: number;
    dueStatus: DueStatus;
    linePlanningStatus: 'UNPLANNED' | 'PARTIAL' | 'FULLY';
  }

  const flatLines = useMemo<FlatOrderLineDetail[]>(() => {
    const result: FlatOrderLineDetail[] = [];
    ordersDetail.forEach((d) => {
      d.lines.forEach((l) => {
        const activePlannedQty = calculateActivePlannedQtyForLine(l.id, snapshotPlans);
        const remainingQty = calculateRemainingQty(l.orderedQty, l.cancelledQty, activePlannedQty);
        const dueStatus = getDueStatus(l.dueDate, remainingQty);

        let linePlanningStatus: 'UNPLANNED' | 'PARTIAL' | 'FULLY' = 'FULLY';
        if (remainingQty === l.orderedQty - l.cancelledQty) {
          linePlanningStatus = 'UNPLANNED';
        } else if (remainingQty > 0) {
          linePlanningStatus = 'PARTIAL';
        }

        result.push({
          line: l,
          order: d.order,
          parentOrderDetail: d,
          activePlannedQty,
          remainingQty,
          dueStatus,
          linePlanningStatus,
        });
      });
    });
    return result;
  }, [ordersDetail, snapshotPlans]);

  const filteredFlatLines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return flatLines.filter((item) => {
      // 1. Search Query
      const matchesSearch =
        query === '' ||
        String(item.order.orderNo || '').toLowerCase().includes(query) ||
        String(item.order.customerName || '').toLowerCase().includes(query) ||
        String(item.line.skuCode || '').toLowerCase().includes(query) ||
        String(item.line.skuName || '').toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // 2. Priority Filter
      if (priorityFilter === 'URGENT' && item.line.priority !== Priority.URGENT) return false;
      if (priorityFilter === 'NORMAL' && item.line.priority !== Priority.NORMAL) return false;

      // 3. Status Filter
      if (statusFilter === 'UNPLANNED' && item.linePlanningStatus !== 'UNPLANNED') return false;
      if (statusFilter === 'PARTIAL' && item.linePlanningStatus !== 'PARTIAL') return false;
      if (statusFilter === 'FULLY' && item.linePlanningStatus !== 'FULLY') return false;

      // 4. Due Status Filter
      if (dueStatusFilter !== 'ALL' && item.dueStatus !== dueStatusFilter) return false;

      return true;
    });
  }, [flatLines, searchQuery, priorityFilter, statusFilter, dueStatusFilter]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return ordersDetail.filter((d) => {
      // 1. Search Query filter
      const matchesSearch =
        query === '' ||
        String(d.order.orderNo || '').toLowerCase().includes(query) ||
        String(d.order.customerName || '').toLowerCase().includes(query) ||
        d.lines.some(
          (l) => String(l.skuCode || '').toLowerCase().includes(query) || String(l.skuName || '').toLowerCase().includes(query)
        );

      if (!matchesSearch) return false;

      // 2. Priority Filter
      if (priorityFilter === 'URGENT') {
        const hasUrgentLine = d.lines.some((l) => l.priority === Priority.URGENT);
        if (!hasUrgentLine) return false;
      } else if (priorityFilter === 'NORMAL') {
        const allNormal = d.lines.every((l) => l.priority === Priority.NORMAL);
        if (!allNormal) return false;
      }

      // 3. Status Filter
      if (statusFilter === 'UNPLANNED') {
        if (d.totalRemainingQty !== d.totalOrderedQty) return false;
      } else if (statusFilter === 'PARTIAL') {
        if (d.totalRemainingQty === d.totalOrderedQty || d.totalRemainingQty === 0) return false;
      } else if (statusFilter === 'FULLY') {
        if (d.totalRemainingQty > 0) return false;
      }

      // 4. Due Status Filter
      if (dueStatusFilter !== 'ALL') {
        const hasMatchingDueStatus = d.lines.some((l) => {
          const activePlannedQty = calculateActivePlannedQtyForLine(l.id, snapshotPlans);
          const remainingQty = calculateRemainingQty(l.orderedQty, l.cancelledQty, activePlannedQty);
          const dueStatus = getDueStatus(l.dueDate, remainingQty);
          return dueStatus === dueStatusFilter;
        });
        if (!hasMatchingDueStatus) return false;
      }

      return true;
    });
  }, [ordersDetail, searchQuery, priorityFilter, statusFilter, dueStatusFilter, snapshotPlans]);

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    const totalPos = ordersDetail.length;
    const totalLinesCount = ordersDetail.reduce((sum, d) => sum + d.totalLines, 0);

    let urgentLinesCount = 0;
    let unplannedLinesCount = 0;

    ordersDetail.forEach((d) => {
      d.lines.forEach((l) => {
        const activePlanned = calculateActivePlannedQtyForLine(l.id, snapshotPlans);
        const remaining = calculateRemainingQty(l.orderedQty, l.cancelledQty, activePlanned);

        if (l.priority === Priority.URGENT) {
          urgentLinesCount++;
        }
        if (remaining > 0) {
          unplannedLinesCount++;
        }
      });
    });

    return {
      totalPos,
      totalLinesCount,
      urgentLinesCount,
      unplannedLinesCount,
    };
  }, [ordersDetail, snapshotPlans]);

  if (isLoading) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <LoadingState message="กำลังโหลดข้อมูลใบสั่งซื้อ..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <ErrorState title="เกิดข้อผิดพลาด" message={error} onRetry={loadOrdersData} />
      </div>
    );
  }

  const activeVariants = getMotionVariants(pageTransitionVariants, reducedMotion);

  const isFilterActive =
    searchQuery !== '' || priorityFilter !== 'ALL' || statusFilter !== 'ALL' || dueStatusFilter !== 'ALL';

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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
            ใบสั่งซื้อ (Sales Orders)
          </h1>
          <p className="text-sm text-slate-500 mt-1 leading-normal">
            รายการใบสั่งซื้อและสินค้าสำหรับวางแผนการผลิต
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            สร้าง PO
          </Button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setViewMode('PO');
            resetFilters();
          }}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5 cursor-pointer hover:border-sky-400 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{metrics.totalPos}</div>
            <div className="text-xs text-slate-500 font-medium">จำนวน PO ทั้งหมด</div>
            <span className="text-[10px] text-sky-600 font-semibold block mt-0.5">มุมมองตาม PO →</span>
          </div>
        </div>

        <div
          onClick={() => {
            setViewMode('LINE');
            resetFilters();
          }}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{metrics.totalLinesCount}</div>
            <div className="text-xs text-slate-500 font-medium">จำนวนรายการสินค้า</div>
            <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">มุมมองรายการสินค้า →</span>
          </div>
        </div>

        <div
          onClick={() => {
            setViewMode('LINE');
            setPriorityFilter('URGENT');
            setStatusFilter('ALL');
            setDueStatusFilter('ALL');
          }}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5 cursor-pointer hover:border-rose-400 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600 tracking-tight">{metrics.urgentLinesCount}</div>
            <div className="text-xs text-slate-500 font-medium">รายการสินค้าด่วน</div>
            <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">กรองเฉพาะสินค้าด่วน →</span>
          </div>
        </div>

        <div
          onClick={() => {
            setViewMode('LINE');
            setPriorityFilter('ALL');
            setStatusFilter('UNPLANNED');
            setDueStatusFilter('ALL');
          }}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600 tracking-tight">{metrics.unplannedLinesCount}</div>
            <div className="text-xs text-slate-500 font-medium">รายการยังไม่วางแผน</div>
            <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">กรองสินค้ายังไม่วางแผน →</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, View Mode & Filters */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
        {/* Search Input & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="ค้นหา PO/ลูกค้า/สินค้า"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('PO')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'PO'
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              มุมมองตาม PO ({metrics.totalPos})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('LINE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'LINE'
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              มุมมองรายการสินค้า ({metrics.totalLinesCount})
            </button>
          </div>
        </div>

        {/* Filters & Active Indicator */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          {isFilterActive && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg">
                กำลังดู: {
                  priorityFilter === 'URGENT'
                    ? 'รายการด่วน'
                    : statusFilter === 'UNPLANNED'
                    ? 'ยังไม่วางแผน'
                    : dueStatusFilter !== 'ALL'
                    ? 'ตามกำหนดส่ง'
                    : searchQuery !== ''
                    ? `ค้นหา "${searchQuery}"`
                    : 'ผลการกรอง'
                }
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                leftIcon={<X className="w-3.5 h-3.5" />}
              >
                ล้างตัวกรอง
              </Button>
            </div>
          )}

          <div className="w-36">
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              leftIcon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
              options={[
                { value: 'ALL', label: 'ความด่วน: ทั้งหมด' },
                { value: 'NORMAL', label: 'ความด่วน: ปกติ' },
                { value: 'URGENT', label: 'ความด่วน: ด่วน' },
              ]}
            />
          </div>

          <div className="w-44">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              leftIcon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
              options={[
                { value: 'ALL', label: 'วางแผน: ทั้งหมด' },
                { value: 'UNPLANNED', label: 'ยังไม่วางแผน' },
                { value: 'PARTIAL', label: 'วางแผนบางส่วน' },
                { value: 'FULLY', label: 'วางแผนครบแล้ว' },
              ]}
            />
          </div>

          <div className="w-40">
            <Select
              value={dueStatusFilter}
              onChange={(e) => setDueStatusFilter(e.target.value)}
              leftIcon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
              options={[
                { value: 'ALL', label: 'กำหนดส่ง: ทั้งหมด' },
                { value: DueStatus.OVERDUE, label: 'เกินกำหนดส่ง' },
                { value: DueStatus.DUE_SOON, label: 'ใกล้ถึงกำหนด' },
                { value: DueStatus.UPCOMING, label: 'ตามแผนปกติ' },
                { value: DueStatus.PLANNED_COMPLETE, label: 'วางแผนครบแล้ว' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Main Content: Line Items View vs PO Grouped View */}
      {viewMode === 'LINE' ? (
        filteredFlatLines.length === 0 ? (
          <EmptyState
            title="ไม่พบรายการสินค้าตามตัวกรองที่เลือก"
            message="ไม่พบรายการสินค้าที่ตรงกับคำค้นหาหรือตัวกรองที่เลือกไว้"
            icon={<Package className="w-6 h-6" />}
            actionLabel="ล้างตัวกรอง"
            onAction={resetFilters}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>แสดงผลตามรายการสินค้าทั้งหมด ({filteredFlatLines.length} รายการ)</span>
              <span className="text-[11px] font-normal text-slate-500">เรียงตามรายการใน PO</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">ชื่อสินค้า</th>
                    <th className="py-3 px-4">เลขที่ PO / ลูกค้า</th>
                    <th className="py-3 px-4 text-center">สั่งซื้อ</th>
                    <th className="py-3 px-4 text-center">วางแผนแล้ว</th>
                    <th className="py-3 px-4 text-center">คงเหลือ</th>
                    <th className="py-3 px-4 text-center">กำหนดส่ง</th>
                    <th className="py-3 px-4 text-center">ความด่วน</th>
                    <th className="py-3 px-4 text-center">สถานะวางแผน</th>
                    <th className="py-3 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFlatLines.map((item) => {
                    const { line, order, parentOrderDetail, activePlannedQty, remainingQty, dueStatus, linePlanningStatus } = item;

                    let lineBadge = <Badge variant="emerald" label="วางแผนครบแล้ว" />;
                    if (linePlanningStatus === 'UNPLANNED') {
                      lineBadge = <Badge variant="slate" label="ยังไม่วางแผน" />;
                    } else if (linePlanningStatus === 'PARTIAL') {
                      lineBadge = <Badge variant="amber" label="วางแผนบางส่วน" />;
                    }

                    return (
                      <tr key={line.id} className="hover:bg-sky-50/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">{line.skuName}</div>
                          {line.skuCode && (
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">{line.skuCode}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-sky-700">{order.orderNo}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{order.customerName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {line.orderedQty.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">{line.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-emerald-600">
                          {activePlannedQty.toLocaleString()} <span className="text-[11px] font-normal text-slate-400">{line.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-bold ${remainingQty > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {remainingQty.toLocaleString()}
                          </span>{' '}
                          <span className="text-[11px] text-slate-400">{line.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="font-medium text-slate-800">{formatThaiDate(line.dueDate)}</div>
                          <div className="mt-0.5 flex justify-center">
                            {dueStatus === DueStatus.OVERDUE && <Badge variant="rose" label="เกินกำหนดส่ง" />}
                            {dueStatus === DueStatus.DUE_SOON && <Badge variant="amber" label="ใกล้ถึงกำหนด" />}
                            {dueStatus === DueStatus.UPCOMING && <Badge variant="sky" label="ตามแผนปกติ" />}
                            {dueStatus === DueStatus.PLANNED_COMPLETE && <Badge variant="emerald" label="วางแผนครบแล้ว" />}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {line.priority === Priority.URGENT ? (
                            <Badge variant="rose" label="ด่วน" />
                          ) : (
                            <Badge variant="slate" label="ปกติ" />
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">{lineBadge}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrderDetail(parentOrderDetail)}
                          >
                            ดู PO
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* PO Grouped List */
        filteredOrders.length === 0 ? (
          <EmptyState
            title="ไม่พบข้อมูลตามตัวกรองที่เลือก"
            message="ไม่พบข้อมูล PO ที่ตรงกับคำค้นหาหรือตัวกรองที่เลือกไว้"
            icon={<FileText className="w-6 h-6" />}
            actionLabel="ล้างตัวกรอง"
            onAction={resetFilters}
          />
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((detail) => {
              const { order, lines, totalLines, totalOrderedQty, totalRemainingQty } = detail;
              const hasUrgent = lines.some((l) => l.priority === Priority.URGENT);

              // Determine PO Header Planning Status
              let poStatusBadge = <Badge variant="emerald" label="วางแผนครบแล้ว" />;
              if (totalRemainingQty === totalOrderedQty) {
                poStatusBadge = <Badge variant="slate" label="ยังไม่วางแผน" />;
              } else if (totalRemainingQty > 0) {
                poStatusBadge = <Badge variant="amber" label="วางแผนบางส่วน" />;
              }

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-sky-300 hover:shadow-md"
                >
                  {/* PO Header Bar */}
                  <div
                    onClick={() => setSelectedOrderDetail(detail)}
                    className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-sky-50/30 transition-colors"
                  >
                    <div className="flex items-start md:items-center gap-3.5">
                      <div className="p-2.5 bg-sky-50 text-sky-700 rounded-lg shrink-0 mt-0.5 md:mt-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-slate-900 tracking-tight hover:text-sky-600 transition-colors">
                            {order.orderNo}
                          </span>
                          {hasUrgent && <Badge variant="rose" label="ด่วน" />}
                          {poStatusBadge}
                          <span className="text-[10px] text-sky-600 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                            กดเพื่อดูรายละเอียด PO
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {order.customerName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            รับ PO: {formatThaiDate(order.orderDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Summary Totals & Edit Button */}
                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                      <div className="flex items-center gap-5 text-right text-xs">
                        <div>
                          <div className="text-slate-400 font-medium">รายการ</div>
                          <div className="font-bold text-slate-800">{totalLines} รายการ</div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-medium">จำนวนรวม</div>
                          <div className="font-bold text-slate-800">{totalOrderedQty.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 font-medium">คงเหลือ</div>
                          <div
                            className={`font-bold ${
                              totalRemainingQty > 0 ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {totalRemainingQty.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingOrderDetail(detail);
                        }}
                        className={
                          "flex items-center gap-1 font-medium text-xs py-1 px-2.5 rounded-lg border border-slate-200 transition-colors cursor-pointer " +
                          "text-sky-700 bg-slate-100 hover:text-sky-700 hover:bg-sky-50"
                        }
                        title="แก้ไข PO"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>แก้ไข PO</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Create PO Modal */}
      <CreatePoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreatePoSuccess}
      />

      {/* PO Detail Drilldown Modal */}
      <PoDetailModal
        isOpen={Boolean(selectedOrderDetail)}
        onClose={() => setSelectedOrderDetail(null)}
        orderDetail={selectedOrderDetail}
      />

      {/* Edit PO Modal */}
      <EditPoModal
        isOpen={Boolean(editingOrderDetail)}
        onClose={() => setEditingOrderDetail(null)}
        orderDetail={editingOrderDetail}
        onSuccess={() => {
          loadOrdersData();
          setNoticeMessage('แก้ไข PO เรียบร้อยแล้ว');
          setTimeout(() => setNoticeMessage(null), 4000);
        }}
      />
    </motion.div>
  );
};

