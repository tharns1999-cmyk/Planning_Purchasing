import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  Building2,
  Calendar,
  Package,
  Flame,
  X,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { CreatePoModal } from './CreatePoModal';
import { PoDetailModal } from './PoDetailModal';
import { plannerRepository } from '@/services/plannerService';
import { SalesOrderWithLinesDetail } from '@/services/repositories/PlannerRepository';
import { Priority, DueStatus } from '@/domain/types';
import {
  calculateActivePlannedQtyForLine,
  calculateRemainingQty,
  getDueStatus,
} from '@/domain/calculations';
import { formatThaiDate } from '@/utils/thaiDate';
import { pageTransitionVariants, getMotionVariants } from '@/motion/tokens';

export const OrdersPage: React.FC = () => {
  const reducedMotion = useReducedMotion() ?? false;
  const [ordersDetail, setOrdersDetail] = useState<SalesOrderWithLinesDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Expanded PO cards state
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<SalesOrderWithLinesDetail | null>(null);

  // Notice toast state
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);


  const loadOrdersData = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      plannerRepository.initialize();
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
  const handleCreatePoSuccess = () => {
    loadOrdersData();
    setNoticeMessage('สร้าง PO สำเร็จ');
    setTimeout(() => {
      setNoticeMessage(null);
    }, 4000);
  };

  // Toggle card expansion
  const toggleExpand = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Calculate snapshot data for line status & remaining qty calculations
  const snapshotPlans = useMemo(() => {
    try {
      return plannerRepository.getSnapshot().entities.weeklyPlans;
    } catch {
      return [];
    }
  }, []);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return ordersDetail.filter((d) => {
      // 1. Search Query filter
      const matchesSearch =
        query === '' ||
        d.order.orderNo.toLowerCase().includes(query) ||
        d.order.customerName.toLowerCase().includes(query) ||
        d.lines.some(
          (l) => l.skuCode.toLowerCase().includes(query) || l.skuName.toLowerCase().includes(query)
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

      return true;
    });
  }, [ordersDetail, searchQuery, priorityFilter, statusFilter]);

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

        if (l.priority === Priority.URGENT && remaining > 0) {
          urgentLinesCount++;
        }
        if (activePlanned === 0) {
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
      <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-[500px] flex items-center justify-center">
        <LoadingState message="กำลังโหลดข้อมูลใบสั่งซื้อ..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <ErrorState title="เกิดข้อผิดพลาด" message={error} onRetry={loadOrdersData} />
      </div>
    );
  }

  const activeVariants = getMotionVariants(pageTransitionVariants, reducedMotion);

  // Helper to render Due Status Badge
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
    <motion.div
      className="p-6 md:p-8 max-w-7xl mx-auto space-y-6"
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
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between shadow-sm"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
            ใบสั่งซื้อ (Sales Orders)
          </h1>
          <p className="text-sm text-slate-500 mt-1 leading-normal">
            จัดการ PO และรายการสินค้าที่ต้องนำไปวางแผนการผลิตรายสัปดาห์
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4 text-slate-500" />}
            onClick={loadOrdersData}
          >
            รีเฟรช
          </Button>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setPriorityFilter('ALL');
            setStatusFilter('ALL');
          }}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5 cursor-pointer hover:border-sky-400 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{metrics.totalPos}</div>
            <div className="text-xs text-slate-500 font-medium">จำนวน PO ทั้งหมด</div>
            <span className="text-[10px] text-sky-600 font-semibold block mt-0.5">แสดงทั้งหมด</span>
          </div>
        </div>

        <div
          onClick={() => {
            setPriorityFilter('ALL');
            setStatusFilter('ALL');
          }}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{metrics.totalLinesCount}</div>
            <div className="text-xs text-slate-500 font-medium">จำนวนรายการสินค้า</div>
            <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">รวมทุกรายการ</span>
          </div>
        </div>

        <div
          onClick={() => {
            setPriorityFilter('URGENT');
            setStatusFilter('ALL');
          }}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5 cursor-pointer hover:border-rose-400 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600 tracking-tight">{metrics.urgentLinesCount}</div>
            <div className="text-xs text-slate-500 font-medium">รายการสินค้าด่วน</div>
            <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">กรองเฉพาะรายการด่วน →</span>
          </div>
        </div>

        <div
          onClick={() => {
            setPriorityFilter('ALL');
            setStatusFilter('UNPLANNED');
          }}
          className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600 tracking-tight">{metrics.unplannedLinesCount}</div>
            <div className="text-xs text-slate-500 font-medium">รายการยังไม่วางแผน</div>
            <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">กรองยังไม่วางแผน →</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        {/* Search Input */}
        <div className="flex-1 max-w-md">
          <Input
            placeholder="ค้นหา PO/ลูกค้า/สินค้า"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Filters & Active Indicator */}
        <div className="flex flex-wrap items-center gap-3">
          {(searchQuery !== '' || priorityFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg">
                กำลังดู: {priorityFilter === 'URGENT' ? 'รายการด่วน' : statusFilter === 'UNPLANNED' ? 'ยังไม่วางแผน' : 'ผลการกรอง'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setPriorityFilter('ALL');
                  setStatusFilter('ALL');
                }}
                leftIcon={<X className="w-3.5 h-3.5" />}
              >
                ล้างตัวกรอง
              </Button>

            </div>
          )}

          <div className="w-40">
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

          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              leftIcon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
              options={[
                { value: 'ALL', label: 'สถานะ: ทั้งหมด' },
                { value: 'UNPLANNED', label: 'ยังไม่วางแผน' },
                { value: 'PARTIAL', label: 'วางแผนบางส่วน' },
                { value: 'FULLY', label: 'วางแผนครบแล้ว' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* PO Grouped List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title="ไม่พบรายการใบสั่งซื้อ"
          message="ไม่พบข้อมูล PO ที่ตรงกับคำค้นหาหรือตัวกรองที่เลือกไว้"
          icon={<FileText className="w-6 h-6" />}
          actionLabel="ล้างตัวกรอง"
          onAction={() => {
            setSearchQuery('');
            setPriorityFilter('ALL');
            setStatusFilter('ALL');
          }}
        />
      ) : (




        <div className="space-y-4">
          {filteredOrders.map((detail) => {
            const { order, lines, totalLines, totalOrderedQty, totalRemainingQty } = detail;
            const isExpanded = expandedOrderIds.has(order.id);
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

                  {/* Summary Totals & Expand Button */}
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
                        toggleExpand(order.id);
                      }}
                      className="flex items-center gap-1 text-sky-600 hover:text-sky-800 font-medium text-xs py-1 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 transition-colors"
                    >
                      <span>{isExpanded ? 'ซ่อน' : 'แสดงตาราง'}</span>
                      <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: reducedMotion ? 0 : 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.span>
                    </button>
                  </div>
                </div>


                {/* Expanded Product Lines Table */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.25 }}
                      className="border-t border-slate-200/80 bg-slate-50/40 p-4 md:p-5"
                    >
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                              <th className="py-2.5 px-3">รหัสสินค้า</th>
                              <th className="py-2.5 px-3">ชื่อสินค้า</th>
                              <th className="py-2.5 px-3 text-right">จำนวนสั่งซื้อ</th>
                              <th className="py-2.5 px-3 text-right">วางแผนแล้ว</th>
                              <th className="py-2.5 px-3 text-right">จำนวนคงเหลือ</th>
                              <th className="py-2.5 px-3">หน่วย</th>
                              <th className="py-2.5 px-3">กำหนดส่ง</th>
                              <th className="py-2.5 px-3 text-center">ความด่วน</th>
                              <th className="py-2.5 px-3 text-center">สถานะส่ง</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-slate-800">
                            {lines.map((line) => {
                              const activePlannedQty = calculateActivePlannedQtyForLine(
                                line.id,
                                snapshotPlans
                              );
                              const remainingQty = calculateRemainingQty(
                                line.orderedQty,
                                line.cancelledQty,
                                activePlannedQty
                              );
                              const dueStatus = getDueStatus(
                                line.dueDate,
                                remainingQty
                              );

                              return (
                                <tr key={line.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                                    {line.skuCode}
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                                    {line.skuName}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                                    {line.orderedQty.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600">
                                    {activePlannedQty.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-amber-600">
                                    {remainingQty.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500">{line.unit}</td>
                                  <td className="py-2.5 px-3 font-medium text-slate-700">
                                    {formatThaiDate(line.dueDate)}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {line.priority === Priority.URGENT ? (
                                      <Badge variant="rose" label="ด่วน" />
                                    ) : (
                                      <Badge variant="slate" label="ปกติ" />
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {renderDueStatusBadge(dueStatus)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
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
    </motion.div>
  );
};

