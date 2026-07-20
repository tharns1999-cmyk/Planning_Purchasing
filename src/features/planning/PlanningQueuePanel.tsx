import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  RotateCcw,
  Package,
  Layers,
  Building2,
  Calendar,
  Tag,
  FileText,
} from 'lucide-react';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import {
  PlanningQueueFgItem,
} from '@/services/repositories/PlannerRepository';
import { WipPrepItem, Priority, DueStatus, SourceType } from '@/domain/types';
import { formatThaiDate } from '@/utils/thaiDate';

export interface PlanningQueuePanelProps {
  fgItems: PlanningQueueFgItem[];
  wipPrepItems: WipPrepItem[];
  reducedMotion?: boolean;
}

export type QueueTab = 'FG' | 'WIP_PREP';

export const PlanningQueuePanel: React.FC<PlanningQueuePanelProps> = ({
  fgItems,
  wipPrepItems,
  reducedMotion = false,
}) => {
  const [activeTab, setActiveTab] = useState<QueueTab>('FG');

  // FG Filters state
  const [fgSearchQuery, setFgSearchQuery] = useState<string>('');
  const [fgPriorityFilter, setFgPriorityFilter] = useState<string>('ALL');
  const [fgDueFilter, setFgDueFilter] = useState<string>('ALL');

  // WIP Filters state
  const [wipSearchQuery, setWipSearchQuery] = useState<string>('');

  // Clear FG Filters
  const handleClearFgFilters = () => {
    setFgSearchQuery('');
    setFgPriorityFilter('ALL');
    setFgDueFilter('ALL');
  };

  // Filtered FG Items
  const filteredFgItems = useMemo(() => {
    const q = fgSearchQuery.trim().toLowerCase();

    return fgItems.filter((item) => {
      // 1. Search Query (PO / Product / Customer)
      const matchesSearch =
        q === '' ||
        item.poNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.productCode.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // 2. Priority Filter
      if (fgPriorityFilter === 'URGENT' && item.priority !== Priority.URGENT) {
        return false;
      }
      if (fgPriorityFilter === 'NORMAL' && item.priority !== Priority.NORMAL) {
        return false;
      }

      // 3. Due Filter
      if (fgDueFilter === 'OVERDUE' && item.dueStatus !== DueStatus.OVERDUE) {
        return false;
      }
      if (fgDueFilter === 'DUE_SOON' && item.dueStatus !== DueStatus.DUE_SOON) {
        return false;
      }
      if (fgDueFilter === 'UPCOMING' && item.dueStatus !== DueStatus.UPCOMING) {
        return false;
      }

      return true;
    });
  }, [fgItems, fgSearchQuery, fgPriorityFilter, fgDueFilter]);

  // Filtered WIP Items
  const filteredWipItems = useMemo(() => {
    const q = wipSearchQuery.trim().toLowerCase();

    return wipPrepItems.filter((item) => {
      if (q === '') return true;
      return (
        item.itemName.toLowerCase().includes(q) ||
        (item.itemCode && item.itemCode.toLowerCase().includes(q)) ||
        (item.relatedProduct && item.relatedProduct.toLowerCase().includes(q)) ||
        (item.note && item.note.toLowerCase().includes(q))
      );
    });
  }, [wipPrepItems, wipSearchQuery]);

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

  const isFgFiltered =
    fgSearchQuery.trim() !== '' || fgPriorityFilter !== 'ALL' || fgDueFilter !== 'ALL';

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col h-full">
      {/* Header & Tabs */}
      <div className="p-4 border-b border-slate-200/80 bg-slate-50/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Layers className="w-4 h-4 text-sky-600" />
            <span>รายการรอวางแผน (Queue)</span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('FG')}
            className={`py-1.5 px-3 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'FG'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>สินค้า FG ({fgItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WIP_PREP')}
            className={`py-1.5 px-3 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'WIP_PREP'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>WIP / งานเตรียม ({wipPrepItems.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: FG Queue */}
      {activeTab === 'FG' && (
        <div className="p-3.5 flex flex-col flex-1 space-y-3 overflow-hidden">
          {/* Filters Bar */}
          <div className="space-y-2.5">
            <Input
              placeholder="ค้นหา PO/สินค้า/ลูกค้า"
              value={fgSearchQuery}
              onChange={(e) => setFgSearchQuery(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
            />

            <div className="grid grid-cols-2 gap-2">
              <Select
                value={fgPriorityFilter}
                onChange={(e) => setFgPriorityFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'ความด่วน: ทุกระดับ' },
                  { value: 'NORMAL', label: 'ปกติ' },
                  { value: 'URGENT', label: 'ด่วน' },
                ]}
              />

              <Select
                value={fgDueFilter}
                onChange={(e) => setFgDueFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'กำหนดส่ง: ทั้งหมด' },
                  { value: 'UPCOMING', label: 'ยังไม่ถึงกำหนด' },
                  { value: 'DUE_SOON', label: 'ใกล้ถึงกำหนด' },
                  { value: 'OVERDUE', label: 'เกินกำหนด' },
                ]}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 font-medium">
                พบ <strong className="text-slate-900 font-bold">{filteredFgItems.length}</strong> รายการ
              </span>

              {isFgFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<RotateCcw className="w-3 h-3 text-slate-500" />}
                  onClick={handleClearFgFilters}
                  className="h-6 px-2 text-[11px]"
                >
                  ล้างตัวกรอง
                </Button>
              )}
            </div>
          </div>

          {/* Cards List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[580px]">
            {filteredFgItems.length === 0 ? (
              <EmptyState
                title="ไม่พบรายการ FG"
                message="ไม่มีรายการสินค้าสำเร็จรูปค้างวางแผนตรงตามตัวกรอง"
                icon={<Package className="w-5 h-5 text-slate-400" />}
                className="py-8"
              />
            ) : (
              filteredFgItems.map((item) => (
                <motion.div
                  key={item.salesOrderLineId}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.15 }}
                >
                  <div
                    draggable
                    onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'FG', item }));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 shadow-2xs hover:border-sky-400 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                  >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-xs leading-tight">
                        {item.productName}
                      </div>
                      {item.productCode && (
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {item.productCode}
                        </div>
                      )}
                    </div>
                    {item.priority === Priority.URGENT ? (
                      <Badge variant="rose" label="ด่วน" />
                    ) : (
                      <Badge variant="slate" label="ปกติ" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2 rounded-md">
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      {item.poNumber}
                    </span>
                    <span className="truncate max-w-[140px] text-slate-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      {item.customerName}
                    </span>
                  </div>

                  {/* Quantity Totals & Due Date */}
                  <div className="grid grid-cols-3 gap-1 text-center bg-white p-1.5 rounded-md border border-slate-100 text-[11px]">
                    <div>
                      <div className="text-slate-400 text-[10px]">สั่งซื้อ</div>
                      <div className="font-semibold text-slate-800">{item.orderedQty.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">วางแผนแล้ว</div>
                      <div className="font-semibold text-emerald-600">{item.plannedQty.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">คงเหลือ</div>
                      <div className="font-bold text-amber-600">{item.remainingQty.toLocaleString()} {item.unit}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      ส่ง {formatThaiDate(item.dueDate)}
                    </span>
                    {renderDueStatusBadge(item.dueStatus)}
                  </div>
                </div>
              </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: WIP / งานเตรียม Queue */}
      {activeTab === 'WIP_PREP' && (
        <div className="p-3.5 flex flex-col flex-1 space-y-3 overflow-hidden">
          {/* Search Bar */}
          <div className="space-y-2">
            <Input
              placeholder="ค้นหา WIP/งานเตรียม"
              value={wipSearchQuery}
              onChange={(e) => setWipSearchQuery(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
            />
            <div className="text-xs text-slate-500 font-medium">
              พบ <strong className="text-slate-900 font-bold">{filteredWipItems.length}</strong> รายการ
            </div>
          </div>

          {/* WIP Cards List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[580px]">
            {filteredWipItems.length === 0 ? (
              <EmptyState
                title="ไม่พบรายการ WIP / งานเตรียม"
                message="ไม่มีรายการงานระหว่างทำหรือเตรียมวัตถุดิบตรงกับคำค้นหา"
                icon={<Tag className="w-5 h-5 text-slate-400" />}
                className="py-8"
              />
            ) : (
              filteredWipItems.map((item) => (
                <motion.div
                  key={item.itemId}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.15 }}
                >
                  <div
                    draggable
                    onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'WIP_PREP', item }));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="p-3 bg-white border border-slate-200 rounded-lg space-y-2 shadow-2xs hover:border-sky-400 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-xs leading-tight">
                          {item.itemName}
                        </div>
                        {item.itemCode && (
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {item.itemCode}
                          </div>
                        )}
                      </div>
                      {item.itemType === SourceType.WIP ? (
                        <Badge variant="sky" label="WIP (งานแปรรูป)" />
                      ) : (
                        <Badge variant="amber" label="PREP (งานเตรียม)" />
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2 rounded-md">
                      <span>หน่วยเริ่มต้น: <strong>{item.defaultUnit}</strong></span>
                      {item.relatedProduct && (
                        <span className="text-slate-500 truncate max-w-[140px]">
                          สินค้า: {item.relatedProduct}
                        </span>
                      )}
                    </div>

                    {item.note && (
                      <div className="text-[11px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-100">
                        "{item.note}"
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
