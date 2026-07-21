import React, { useState, useMemo } from 'react';
import {
  Truck,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  Filter,
  Building2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Badge } from '@/components/common/Badge';
import { plannerRepository } from '@/services/plannerService';
import { Priority, DueStatus, SourceType, PlanStatus } from '@/domain/types';
import {
  getProductionWeek,
  parseDateOnly,
  formatDateISO,
  calculateActivePlannedQtyForLine,
  calculateRemainingQty,
  getDueStatus,
} from '@/domain/calculations';
import { formatThaiDate } from '@/utils/thaiDate';

const THAI_DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function formatThaiDayName(isoDateStr: string): string {
  const d = parseDateOnly(isoDateStr);
  return THAI_DAY_NAMES[d.getDay()] || '';
}

export interface DeliveryCalendarItem {
  orderLineId: string;
  orderId: string;
  poNumber: string;
  customerName: string;
  productCode?: string;
  productName: string;
  orderedQty: number;
  activePlannedQty: number;
  remainingQty: number;
  unit: string;
  dueDate: string;
  priority: Priority;
  dueStatus: DueStatus;
  allocationCount: number;
}

export const CalendarPage: React.FC = () => {
  // Week Navigation State
  const [currentWeek, setCurrentWeek] = useState(() => getProductionWeek('2026-07-20'));

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | Priority>('ALL');
  const [dueStatusFilter, setDueStatusFilter] = useState<'ALL' | DueStatus>('ALL');
  const [unplannedOnly, setUnplannedOnly] = useState(false);



  // Assemble all delivery items for the current week
  const allWeekDeliveryItems = useMemo(() => {
    try {
      plannerRepository.initialize();
      const snapshot = plannerRepository.getSnapshot();

      // Find active plan for the current week
      const weekPlans = snapshot.entities.weeklyPlans.filter(
        (p) => p.weekStart === currentWeek.weekStart && p.status !== PlanStatus.CANCELLED
      );

      // Latest DRAFT or latest PUBLISHED plan
      const activeDraft = weekPlans
        .filter((p) => p.status === PlanStatus.DRAFT)
        .sort((a, b) => b.revisionNumber.localeCompare(a.revisionNumber))[0];

      const activePublished = weekPlans
        .filter((p) => p.status === PlanStatus.PUBLISHED)
        .sort((a, b) => b.revisionNumber.localeCompare(a.revisionNumber))[0];

      const activePlan = activeDraft || activePublished || null;

      const items: DeliveryCalendarItem[] = [];

      snapshot.entities.salesOrderLines.forEach((line) => {
        // Filter lines whose dueDate falls within currentWeek
        if (line.dueDate >= currentWeek.weekStart && line.dueDate <= currentWeek.weekEnd) {
          const order = snapshot.entities.salesOrders.find((o) => o.id === line.orderId);

          const activePlannedQty = calculateActivePlannedQtyForLine(
            line.id,
            snapshot.entities.weeklyPlans
          );

          const remainingQty = calculateRemainingQty(
            line.orderedQty,
            line.cancelledQty || 0,
            activePlannedQty
          );

          const dueStatus = getDueStatus(line.dueDate, remainingQty, currentWeek.weekStart);

          const weekPlanAllocations = (activePlan?.allocations || []).filter(
            (a) => a.salesOrderLineId === line.id && a.sourceType === SourceType.FG
          );

          items.push({
            orderLineId: line.id,
            orderId: line.orderId,
            poNumber: order ? order.orderNo : '',
            customerName: order ? order.customerName : '',
            productCode: line.skuCode,
            productName: line.skuName,
            orderedQty: line.orderedQty,
            activePlannedQty,
            remainingQty,
            unit: line.unit,
            dueDate: line.dueDate,
            priority: line.priority || Priority.NORMAL,
            dueStatus,
            allocationCount: weekPlanAllocations.length,
          });
        }
      });

      return items.sort((a, b) => {
        if (a.priority === Priority.URGENT && b.priority !== Priority.URGENT) return -1;
        if (a.priority !== Priority.URGENT && b.priority === Priority.URGENT) return 1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    } catch (err) {
      console.error('Failed to compute delivery calendar items:', err);
      return [];
    }
  }, [currentWeek.weekStart, currentWeek.weekEnd]);

  // Filter items based on user inputs
  const filteredDeliveryItems = useMemo(() => {
    return allWeekDeliveryItems.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchPo = item.poNumber.toLowerCase().includes(query);
        const matchCustomer = item.customerName.toLowerCase().includes(query);
        const matchProduct = item.productName.toLowerCase().includes(query);
        const matchCode = item.productCode?.toLowerCase().includes(query) || false;
        if (!matchPo && !matchCustomer && !matchProduct && !matchCode) {
          return false;
        }
      }

      // 2. Priority Filter
      if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) {
        return false;
      }

      // 3. Due Status Filter
      if (dueStatusFilter !== 'ALL' && item.dueStatus !== dueStatusFilter) {
        return false;
      }

      // 4. Unplanned Only Filter
      if (unplannedOnly && item.remainingQty <= 0) {
        return false;
      }

      return true;
    });
  }, [allWeekDeliveryItems, searchQuery, priorityFilter, dueStatusFilter, unplannedOnly]);

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

  // Generate 6 Day ISO Strings (Monday to Saturday)
  const weekDays = useMemo(() => {
    const days: string[] = [];
    const monday = parseDateOnly(currentWeek.weekStart);
    for (let i = 0; i < 6; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(formatDateISO(day));
    }
    return days;
  }, [currentWeek.weekStart]);

  // Due Status Badge Renderer
  const renderDueStatusBadge = (status: DueStatus) => {
    switch (status) {
      case DueStatus.PLANNED_COMPLETE:
        return <Badge variant="emerald" label="วางแผนครบแล้ว" />;
      case DueStatus.OVERDUE:
        return <Badge variant="rose" label="เกินกำหนด" />;
      case DueStatus.DUE_SOON:
        return <Badge variant="amber" label="ใกล้กำหนด" />;
      case DueStatus.UPCOMING:
      default:
        return <Badge variant="sky" label="ยังไม่ถึงกำหนด" />;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
            ปฏิทินส่งสินค้า (Delivery Calendar)
          </h1>
          <p className="text-sm text-slate-500 mt-1 leading-normal">
            ปฏิทินรอบการจัดส่งสินค้าและกำหนดการจ่ายสินค้าให้ลูกค้า (จำแนกตามวันกำหนดส่ง dueDate)
          </p>
        </div>
      </div>

      {/* Week Navigation Toolbar */}
      <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-700 rounded-lg shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">ประจำสัปดาห์</div>
            <div className="text-base font-bold text-slate-900 tracking-tight">
              {formatThaiDate(currentWeek.weekStart)} – {formatThaiDate(currentWeek.weekEnd)}
            </div>
          </div>
        </div>

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
            leftIcon={<Calendar className="w-3.5 h-3.5 text-slate-500" />}
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
          <div className="w-36">
            <Input
              type="date"
              value={currentWeek.weekStart}
              onChange={handleDateSelect}
              title="เลือกวันที่สัปดาห์"
            />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
          <Filter className="w-4 h-4 text-sky-600" />
          <span>ตัวกรองรายการส่งสินค้า (Filters)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
          {/* Search Input */}
          <div className="relative">
            <Input
              type="text"
              placeholder="ค้นหา PO / ลูกค้า / สินค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Priority Filter */}
          <div>
            <Select
              aria-label="ตัวกรองความสำคัญ"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as 'ALL' | Priority)}
              options={[
                { value: 'ALL', label: 'ความสำคัญ: ทั้งหมด' },
                { value: Priority.URGENT, label: 'ความสำคัญ: ด่วน' },
                { value: Priority.NORMAL, label: 'ความสำคัญ: ปกติ' },
              ]}
            />
          </div>

          {/* Due Status Filter */}
          <div>
            <Select
              aria-label="ตัวกรองสถานะกำหนดส่ง"
              value={dueStatusFilter}
              onChange={(e) => setDueStatusFilter(e.target.value as 'ALL' | DueStatus)}
              options={[
                { value: 'ALL', label: 'สถานะส่ง: ทั้งหมด' },
                { value: DueStatus.UPCOMING, label: 'ยังไม่ถึงกำหนด' },
                { value: DueStatus.DUE_SOON, label: 'ใกล้กำหนด' },
                { value: DueStatus.OVERDUE, label: 'เกินกำหนด' },
                { value: DueStatus.PLANNED_COMPLETE, label: 'วางแผนครบแล้ว' },
              ]}
            />
          </div>

          {/* Checkbox: Unplanned Only */}
          <div className="flex items-center gap-2 px-1">
            <input
              id="filter-unplanned-only"
              type="checkbox"
              checked={unplannedOnly}
              onChange={(e) => setUnplannedOnly(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
            />
            <label htmlFor="filter-unplanned-only" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
              แสดงเฉพาะรายการที่ยังวางแผนไม่ครบ
            </label>
          </div>
        </div>
      </div>

      {/* Delivery Calendar Grid View */}
      {filteredDeliveryItems.length === 0 ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200/90 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <div className="text-base font-bold text-slate-800">
            ยังไม่มีรายการส่งสินค้าในสัปดาห์นี้
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            ไม่พบรายการส่งสินค้าตามกำหนดวันส่งในสัปดาห์นี้ หรือไม่ตรงกับเงื่อนไขตัวกรองที่คุณเลือก
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-start">
          {weekDays.map((dayIso) => {
            const dayItems = filteredDeliveryItems.filter((item) => item.dueDate === dayIso);
            const dayName = formatThaiDayName(dayIso);
            const formattedDate = formatThaiDate(dayIso);

            return (
              <div key={dayIso} className="bg-slate-50/70 rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
                {/* Column Header */}
                <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{dayName}</div>
                    <div className="text-[11px] text-slate-500">{formattedDate}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    dayItems.length > 0 ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {dayItems.length} รายการ
                  </span>
                </div>

                {/* Day Items List */}
                <div className="p-2 space-y-2.5 min-h-[140px]">
                  {dayItems.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      ไม่มีกำหนดส่ง
                    </div>
                  ) : (
                    dayItems.map((item) => (
                      <div
                        key={item.orderLineId}
                        className={`p-3 rounded-lg bg-white border shadow-2xs space-y-2 transition-all hover:border-slate-300 ${
                          item.priority === Priority.URGENT ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                        }`}
                      >
                        {/* Header Badges */}
                        <div className="flex items-center justify-between gap-1">
                          {renderDueStatusBadge(item.dueStatus)}
                          {item.priority === Priority.URGENT && (
                            <Badge variant="rose" label="ด่วน" />
                          )}
                        </div>

                        {/* PO & Customer Info */}
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.poNumber}</span>
                          </div>
                          <div className="text-[11px] text-slate-700 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-semibold truncate">{item.customerName}</span>
                          </div>
                        </div>

                        {/* Product Name */}
                        <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                          {item.productName}
                        </div>

                        {/* Quantity Metrics */}
                        <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>จำนวนสั่ง:</span>
                            <strong className="text-slate-900">{item.orderedQty} {item.unit}</strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>วางแผนแล้ว (FG):</span>
                            <strong className="text-sky-700">{item.activePlannedQty} {item.unit}</strong>
                          </div>
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-slate-700">คงเหลือ:</span>
                            <span className={item.remainingQty > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                              {item.remainingQty} {item.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
