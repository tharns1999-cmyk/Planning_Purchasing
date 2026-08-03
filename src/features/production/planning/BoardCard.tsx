import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { PlanAllocation, SourceType } from '@/domain/types';
import { Badge } from '@/components/common/Badge';

export interface BoardCardProps {
  allocation: PlanAllocation;
  displayName: string;
  shortName?: string;
  poNumber?: string;
  customerName?: string;
  isDraftStatus: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

export const BoardCard: React.FC<BoardCardProps> = ({
  allocation,
  displayName,
  shortName,
  customerName,
  isDraftStatus,
  onDragStart,
  onEdit,
  onRemove,
}) => {
  const isFg = allocation.sourceType === SourceType.FG;

  // Title: shortName (bold) or fallback to displayName/productName
  const cardTitle = shortName && shortName.trim() ? shortName.trim() : displayName;

  // Quantity display (e.g., "20 ชุด")
  const qtyDisplay = `${allocation.plannedQty} ${allocation.plannedUnit || allocation.unit || ''}`;

  // Combined note text (from note or printNote)
  const noteText = allocation.note || allocation.printNote;

  return (
    <div
      draggable={isDraftStatus}
      onDragStart={onDragStart}
      className={`p-2.5 rounded-lg text-left shadow-2xs space-y-1.5 hover:border-slate-300 transition-all group relative border ${
        isDraftStatus ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-default'
      } ${
        allocation.highlightOnPlan ? 'bg-amber-100/90 border-amber-300 highlight-on-plan' : 'bg-white border-slate-200'
      }`}
    >
      {/* Top Row: Title (Left) + Quantity (Right) + Action Buttons */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex-1 min-w-0 pr-1" title={displayName}>
          <span className="font-bold text-slate-900 text-xs sm:text-sm leading-tight truncate block">
            {cardTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Planned Qty on Top Row (Right aligned) */}
          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            {qtyDisplay}
          </span>

          {/* Source Type Badge */}
          {isFg ? (
            <Badge variant="sky" label="FG" />
          ) : allocation.sourceType === SourceType.WIP ? (
            <Badge variant="indigo" label="WIP" />
          ) : (
            <Badge variant="amber" label="PREP" />
          )}

          {/* Edit / Remove Action Buttons (DRAFT only) */}
          {isDraftStatus && (
            <div className="flex items-center gap-0.5 ml-0.5">
              {onEdit && (
                <button
                  type="button"
                  aria-label="แก้ไขรายการวางแผน"
                  title="แก้ไขรายการวางแผน"
                  onClick={onEdit}
                  className={
                    "p-1 rounded transition-colors cursor-pointer " +
                    "text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                  }
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {onRemove && (
                <button
                  type="button"
                  aria-label="ลบรายการวางแผน"
                  title="ลบรายการวางแผน"
                  onClick={onRemove}
                  className={
                    "p-1 rounded transition-colors cursor-pointer " +
                    "text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub Row: Customer Name Badge */}
      {customerName && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-full">
            {customerName}
          </span>
        </div>
      )}

      {/* Optional Print Customer Tag */}
      {allocation.printCustomerTag && (
        <div className="text-[10px] text-sky-700 font-semibold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 inline-block">
          {allocation.printCustomerTag}
        </div>
      )}

      {/* Bottom Notes: Bold Red Text */}
      {noteText && (
        <div className="text-xs text-red-600 font-bold pt-0.5 leading-snug break-words">
          หมายเหตุ: {noteText}
        </div>
      )}
    </div>
  );
};
