import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Printer,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { plannerRepository } from '@/services/plannerService';
import { PlanningBoardDataDetail } from '@/services/repositories/PlannerRepository';
import { PlanAllocation, PlanStatus, SourceType, WeeklyPlan } from '@/domain/types';
import { FIXED_ROOMS } from '@/domain/constants';
import { getProductionWeek, parseDateOnly, formatDateISO } from '@/domain/calculations';
import { formatThaiDate } from '@/utils/thaiDate';

const THAI_DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function formatThaiDayAndDate(isoDateStr: string): { dayName: string; formattedDate: string } {
  const d = parseDateOnly(isoDateStr);
  const dayName = THAI_DAY_NAMES[d.getDay()] || '';
  const formattedDate = formatThaiDate(isoDateStr);
  return { dayName, formattedDate };
}

export const PrintPreviewPage: React.FC = () => {
  const navigate = useNavigate();

  // Reference week state (defaults to seed data week 2026-07-20)
  const [currentWeek, setCurrentWeek] = useState(() => getProductionWeek('2026-07-20'));
  const [boardData, setBoardData] = useState<PlanningBoardDataDetail | null>(() => {
    try { return plannerRepository.getPlanningBoardData(currentWeek.weekStart); } catch { return null; }
  });
  const [weekPlans, setWeekPlans] = useState<WeeklyPlan[]>(() => {
    try { return plannerRepository.listWeekPlans(currentWeek.weekStart).sort((a, b) => a.revisionNumber.localeCompare(b.revisionNumber)); } catch { return []; }
  });
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => {
    try {
      const bData = plannerRepository.getPlanningBoardData(currentWeek.weekStart);
      return bData.activePlan ? bData.activePlan.id : null;
    } catch { return null; }
  });

  // Print Mode: PLAN_ONLY vs PLAN_AND_ACTUAL
  const [printMode, setPrintMode] = useState<'PLAN_ONLY' | 'PLAN_AND_ACTUAL'>('PLAN_ONLY');

  const printableRef = React.useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      await plannerRepository.initializeAsync();
      const bData = plannerRepository.getPlanningBoardData(currentWeek.weekStart);
      const wPlans = plannerRepository.listWeekPlans(currentWeek.weekStart);

      setBoardData(bData);
      setWeekPlans(wPlans.sort((a, b) => a.revisionNumber.localeCompare(b.revisionNumber)));

      if (bData.activePlan) {
        setSelectedPlanId((prev) => prev || bData.activePlan!.id);
      } else {
        setSelectedPlanId((prev) => prev);
      }
    } catch (err) {
      console.error('Failed to load Print Preview data:', err);
    }
  }, [currentWeek.weekStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Non-cancelled plans for revision selector
  const activeWeekPlans = useMemo(() => {
    return weekPlans
      .filter((p) => p.status !== PlanStatus.CANCELLED)
      .sort((a, b) => a.revisionNumber.localeCompare(b.revisionNumber));
  }, [weekPlans]);

  // Currently selected plan for preview
  const selectedPlan = useMemo(() => {
    if (!boardData?.activePlan) return null;
    if (selectedPlanId) {
      const found = weekPlans.find((p) => p.id === selectedPlanId && p.status !== PlanStatus.CANCELLED);
      if (found) return found;
    }
    return boardData.activePlan;
  }, [selectedPlanId, weekPlans, boardData]);

  // Currently displayed board notes for selected plan
  const currentPlanBoardNotes = useMemo(() => {
    if (!selectedPlan) return [];
    return plannerRepository.listBoardNotes(selectedPlan.id);
  }, [selectedPlan]);

  // Snapshot lookup helper
  const getSnapshotDetails = (alloc: PlanAllocation) => {
    try {
      const snap = plannerRepository.getSnapshot();
      let displayName = 'N/A';
      let customerName = '';

      if (alloc.sourceType === SourceType.FG && alloc.salesOrderLineId) {
        const line = snap.entities.salesOrderLines.find((l) => l.id === alloc.salesOrderLineId);
        const order = snap.entities.salesOrders.find((o) => o.id === (line ? line.orderId : alloc.salesOrderId));
        const customers = snap.entities.customers || [];
        const rawTarget = alloc.printCustomerTag || order?.customerName || '';
        let matchedCustomer = undefined;

        if (rawTarget) {
          const clean = rawTarget.trim().toLowerCase();
          matchedCustomer = customers.find(
            (c) =>
              c.customerName.trim().toLowerCase() === clean ||
              (c.shortName && c.shortName.trim().toLowerCase() === clean) ||
              c.customerCode.trim().toLowerCase() === clean ||
              c.customerId.trim().toLowerCase() === clean
          );
          if (!matchedCustomer) {
            matchedCustomer = customers.find(
              (c) =>
                c.customerName.trim().toLowerCase().includes(clean) ||
                clean.includes(c.customerName.trim().toLowerCase()) ||
                (c.shortName && c.shortName.trim().toLowerCase().includes(clean)) ||
                (c.shortName && clean.includes(c.shortName.trim().toLowerCase()))
            );
          }
        }

        // Find matching ProductMaster to get shortName
        const product = snap.entities.products?.find(
          (p) =>
            (line?.skuCode && p.productCode === line.skuCode) ||
            (line?.skuName && (p.productName === line.skuName || p.shortName === line.skuName))
        );

        if (!matchedCustomer && product?.customerId) {
          const cleanProdCustId = String(product.customerId).trim().toLowerCase();
          matchedCustomer = customers.find(
            (c) =>
              c.customerId.toLowerCase() === cleanProdCustId ||
              c.customerCode.toLowerCase() === cleanProdCustId
          );
        }

        if (line) {
          displayName = line.skuName || product?.shortName?.trim() || 'N/A';
        }
        if (order || alloc.printCustomerTag) {
          customerName = alloc.printCustomerTag || matchedCustomer?.shortName?.trim() || matchedCustomer?.customerName?.trim() || order?.customerName || '';
        }
      } else if (alloc.wipPrepItemId) {
        const item = snap.entities.wipPrepItems.find((i) => i.itemId === alloc.wipPrepItemId);
        if (item) {
          displayName = item.shortName?.trim() || item.itemName;
        }
      }

      return { displayName, customerName };
    } catch {
      return { displayName: 'รายการผลิต', customerName: '' };
    }
  };


  // Week Navigation Handlers
  const handlePreviousWeek = async () => {
    const d = parseDateOnly(currentWeek.weekStart);
    d.setDate(d.getDate() - 7);
    setSelectedPlanId(null);
    setCurrentWeek(getProductionWeek(formatDateISO(d)));
  };

  const handleThisWeek = async () => {
    setSelectedPlanId(null);
    setCurrentWeek(getProductionWeek());
  };

  const handleNextWeek = async () => {
    const d = parseDateOnly(currentWeek.weekStart);
    d.setDate(d.getDate() + 7);
    setSelectedPlanId(null);
    setCurrentWeek(getProductionWeek(formatDateISO(d)));
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      setSelectedPlanId(null);
      setCurrentWeek(getProductionWeek(val));
    }
  };

  const handlePrint = async () => {
    if (!printableRef.current) {
      window.print();
      return;
    }

    const elem = printableRef.current;

    // A4 landscape printable area (mm) minus margins
    // A4 = 297mm x 210mm, with 4mm margin each side → 289mm x 202mm
    const A4_LANDSCAPE_WIDTH_MM = 289;
    const A4_LANDSCAPE_HEIGHT_MM = 202;

    // Convert mm to pixels at 96 DPI (1mm ≈ 3.7795px)
    const MM_TO_PX = 3.7795;
    const pageWidthPx = A4_LANDSCAPE_WIDTH_MM * MM_TO_PX;
    const pageHeightPx = A4_LANDSCAPE_HEIGHT_MM * MM_TO_PX;

    // Measure actual content size (before any zoom)
    const contentWidth = elem.scrollWidth;
    const contentHeight = elem.scrollHeight;

    // Calculate zoom factor to fit both width and height into one page
    const zoomX = pageWidthPx / contentWidth;
    const zoomY = pageHeightPx / contentHeight;
    const zoomFactor = Math.min(zoomX, zoomY, 1); // Never zoom up, only shrink

    // Apply CSS zoom (unlike transform:scale, zoom affects actual layout computation
    // so the browser print engine sees the smaller content for pagination)
    (elem.style as CSSStyleDeclaration & { zoom: string }).zoom = `${zoomFactor}`;

    // Give browser a tick to reflow with zoom before triggering print
    requestAnimationFrame(() => {
      window.print();

      // Reset zoom after print dialog closes
      (elem.style as CSSStyleDeclaration & { zoom: string }).zoom = '';
    });
  };

  const handleDownloadPng = async () => {
    if (!selectedPlan || !printableRef.current) return;
    setIsExporting(true);
    setExportError(null);

    const elem = printableRef.current;
    document.body.classList.add('is-exporting-png');

    try {
      const targetWidth = elem.scrollWidth;
      const targetHeight = elem.scrollHeight;

      const dataUrl = await toPng(elem, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        width: targetWidth,
        height: targetHeight,
        style: {
          overflow: 'visible',
          height: 'auto',
          maxHeight: 'none',
          borderRadius: '0',
          border: 'none',
          boxShadow: 'none',
        },
      });


      const link = document.createElement('a');
      link.download = `production-plan-${selectedPlan.weekStart}-${selectedPlan.revisionNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG:', err);
      setExportError('ไม่สามารถสร้างไฟล์ PNG ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      document.body.classList.remove('is-exporting-png');
      setIsExporting(false);
    }
  };

  const isDraft = selectedPlan?.status === PlanStatus.DRAFT;

  return (
    <div className="w-full space-y-4">
      {/* Top Toolbar (Screen View Only - Hidden on Print) */}
      <div className="no-print print-toolbar p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Back button & Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/planning')}
            >
              กลับไปหน้าวางแผน
            </Button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <h2 className="text-base font-bold text-slate-900 tracking-tight hidden sm:block">
              ตัวอย่างก่อนพิมพ์ (Print Preview)
            </h2>
          </div>

          {/* Center: Week & Revision Controls */}
          <div className="flex flex-wrap items-center gap-2">
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

            <div className="w-36">
              <Input
                type="date"
                value={currentWeek.weekStart}
                onChange={handleDateSelect}
                title="เลือกวันที่สัปดาห์"
              />
            </div>

            <div className="w-32">
              <Select
                aria-label="เลือกฉบับแผน"
                disabled={activeWeekPlans.length === 0}
                value={selectedPlan?.id || ''}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                options={
                  activeWeekPlans.length > 0
                    ? activeWeekPlans.map((p) => ({
                        value: p.id,
                        label: p.revisionNumber,
                      }))
                    : [{ value: '', label: 'ไม่มีแผน' }]
                }
              />
            </div>
          </div>

          {/* Right: Mode Toggle & Print / PNG Download Buttons */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setPrintMode('PLAN_ONLY')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  printMode === 'PLAN_ONLY'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เฉพาะแผน
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('PLAN_AND_ACTUAL')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  printMode === 'PLAN_AND_ACTUAL'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                แผนและผลผลิตจริง
              </button>
            </div>

            <Button
              variant="outline"
              size="md"
              disabled={isExporting}
              className="border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold"
              onClick={handleDownloadPng}
            >
              {isExporting ? 'กำลังสร้าง PNG...' : 'ดาวน์โหลด PNG'}
            </Button>

            <Button
              variant="primary"
              size="md"
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              พิมพ์
            </Button>
          </div>
        </div>

        {/* Print PDF Helper Text */}
        <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>กดปุ่ม "พิมพ์" ระบบจะย่อขนาดอัตโนมัติให้พอดี 1 หน้ากระดาษ A4 แนวนอน — สำหรับบันทึก PDF แนะนำเลือกกระดาษ A4 แนวนอนในหน้าต่างพิมพ์</span>
        </div>
      </div>

      {exportError && (
        <div className="no-print p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-lg flex items-center gap-2">
          <span>{exportError}</span>
        </div>
      )}

      {/* Printable Area Container */}
      {!selectedPlan ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-500 font-medium">
          ยังไม่มีแผนการผลิตสำหรับสัปดาห์นี้
        </div>
      ) : (
        <div className="print-preview-scroll-container overflow-x-auto pb-4">
          <div
            ref={printableRef}
            className="printable-content print-page png-export-page bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4"
          >
            {/* Draft Watermark Banner */}
            {isDraft && (
              <div className="p-2.5 bg-amber-100 border-2 border-dashed border-amber-400 text-amber-900 font-extrabold text-center text-base rounded-lg shadow-2xs tracking-widest uppercase">
                ฉบับร่าง (DRAFT)
              </div>
            )}

            {/* Printable Header */}
            <div className="border-b border-slate-300 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  แผนการผลิตประจำสัปดาห์
                </h1>
                <div className="text-xs text-slate-600 font-medium mt-1">
                  ประจำวันที่: <strong>{formatThaiDate(selectedPlan.weekStart)} – {formatThaiDate(selectedPlan.weekEnd)}</strong>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
                  ฉบับ: <strong>{selectedPlan.revisionNumber}</strong>
                </span>
                <span className="bg-sky-50 text-sky-800 px-2.5 py-1 rounded border border-sky-200">
                  สถานะ: <strong>{selectedPlan.status}</strong>
                </span>
                {printMode === 'PLAN_AND_ACTUAL' && (
                  <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded border border-emerald-200">
                    โหมด: <strong>แผนและผลผลิตจริง</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Printable Table */}
            <div>
              <table className="print-table w-full border-collapse border border-slate-300 text-xs text-left">
              <thead>
                <tr className="bg-slate-200 border-b-2 border-slate-400 text-slate-900 font-extrabold">
                  <th className="py-3 px-3 border-r border-slate-400 w-28 align-middle">
                    <div className="text-sm font-extrabold text-slate-900">วันที่ / ห้องผลิต</div>
                  </th>
                  {FIXED_ROOMS.map((room) => (
                    <th key={room.id} className="py-3 px-3 text-center border-r border-slate-400 last:border-r-0 align-middle">
                      <div className="text-sm font-extrabold text-slate-900 tracking-tight">{room.id} - {room.name}</div>
                      <div className="text-[10px] font-medium text-slate-500 mt-0.5">{room.description}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {(boardData?.days || []).map((dayIso) => {
                  const { dayName, formattedDate } = formatThaiDayAndDate(dayIso);
                  return (
                    <tr key={dayIso} className="align-top">
                      {/* Day Column */}
                      <td className="py-2 px-2 font-bold text-slate-900 border-r border-slate-300 bg-slate-50">
                        <div className="text-xs">{dayName}</div>
                        <div className="text-[11px] text-slate-500 font-normal">{formattedDate}</div>
                      </td>

                      {/* 4 Rooms Columns */}
                      {FIXED_ROOMS.map((room) => {
                        const cellAllocations = (selectedPlan.allocations || []).filter(
                          (a) => a.productionDate === dayIso && a.roomId === room.id
                        );
                        const cellNotes = currentPlanBoardNotes.filter(
                          (n) => n.productionDate === dayIso && n.roomId === room.id
                        );

                        return (

                          <td key={room.id} className="py-2 px-2 border-r border-slate-300 last:border-r-0 min-w-[130px]">
                            <div className="space-y-2">
                              {/* Board Notes */}
                              {cellNotes.map((note) => (
                                <div
                                  key={note.noteId}
                                  className={`p-1.5 rounded text-left border text-[11px] ${
                                    note.highlightOnPlan ? 'bg-amber-100/90 border-amber-300 highlight-on-plan' : 'bg-amber-50 border-amber-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-slate-900 break-words">{note.noteText}</span>
                                    <Badge variant="amber" label="หมายเหตุ" />
                                  </div>
                                </div>
                              ))}

                              {/* Allocations */}
                              {cellAllocations.map((alloc) => {
                                const { displayName, customerName } = getSnapshotDetails(alloc);
                                const isFg = alloc.sourceType === SourceType.FG;

                                // Lookup actual metrics if mode is PLAN_AND_ACTUAL
                                let actualSummary = null;
                                if (printMode === 'PLAN_AND_ACTUAL') {
                                  actualSummary = plannerRepository.getAllocationActualSummary(alloc.allocationId);
                                }

                                const printNoteText = alloc.printNote || alloc.note;
                                const rawCustomerTag = alloc.printCustomerTag || customerName;
                                let displayCustomer = rawCustomerTag;
                                if (rawCustomerTag) {
                                  const matchCust = plannerRepository.getSnapshot().entities.customers?.find(
                                    (c) => c.customerName === rawCustomerTag || c.shortName === rawCustomerTag || c.customerId === rawCustomerTag
                                  );
                                  if (matchCust?.shortName) {
                                    displayCustomer = matchCust.shortName;
                                  }
                                }

                                return (
                                  <div
                                    key={alloc.allocationId}
                                    className={`p-1.5 rounded text-left border space-y-1 ${
                                      alloc.highlightOnPlan ? 'bg-amber-100/90 border-amber-300 highlight-on-plan' : 'bg-white border-slate-300'
                                    }`}
                                  >
                                    {/* Top Header: Product Short Name on Left, Prominent Produced Qty on Top-Right */}
                                    <div className="flex items-start justify-between gap-1.5">
                                      {/* Left: Product Short Name & Customer Tag */}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-extrabold text-slate-900 text-xs leading-tight break-words">
                                          {displayName}
                                        </div>

                                        {displayCustomer && (
                                          <div className="text-[10px] sm:text-[11px] font-bold text-sky-800 bg-sky-50/90 px-1.5 py-0.5 rounded border border-sky-200 inline-block max-w-full truncate mt-1">
                                            ลูกค้า: {displayCustomer}
                                          </div>
                                        )}
                                      </div>

                                      {/* Top-Right: Produced Qty Badge / Box (Large & Prominent for PDF/PNG Export) */}
                                      <div className="shrink-0 text-right bg-slate-50 border border-slate-300/90 px-2 py-1 rounded-md shadow-2xs">
                                        <div className="text-[10px] text-slate-600 font-bold leading-none mb-0.5">
                                          {isFg ? 'ผลิต:' : 'วางแผน:'}
                                        </div>
                                        <div className="text-sm sm:text-base md:text-lg font-black text-slate-950 leading-none whitespace-nowrap">
                                          {alloc.plannedQty} <span className="text-[10px] sm:text-xs font-bold text-slate-700">{alloc.plannedUnit || alloc.unit}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Expected FG Output (for FG items) */}
                                    {isFg && (
                                      <div className="text-[10px] sm:text-[11px] text-slate-600 font-medium pt-0.5 border-t border-slate-100">
                                        ได้ FG: <strong>~{alloc.fgOutputQty ?? alloc.plannedQty}</strong> {alloc.fgOutputUnit || alloc.unit} (ประมาณ)
                                      </div>
                                    )}

                                    {/* Print Note */}
                                    {printNoteText && (
                                      <div className="text-[10px] text-slate-600 italic">
                                        หมายเหตุ: {printNoteText}
                                      </div>
                                    )}

                                    {/* Actual Summary in PLAN_AND_ACTUAL mode */}
                                    {printMode === 'PLAN_AND_ACTUAL' && actualSummary && (
                                      <div className="mt-1 pt-1 border-t border-slate-200 bg-slate-50 p-1 rounded space-y-0.5 text-[10px]">
                                        <div className="flex items-center justify-between font-bold">
                                          <span className="text-slate-600">ผลผลิตจริง:</span>
                                          <span className="text-sky-700">{actualSummary.status}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-1 text-slate-700">
                                          <div>ของดี: <strong className="text-emerald-700">{actualSummary.totalGoodQty}</strong></div>
                                          <div>ของเสีย: <strong className="text-rose-700">{actualSummary.totalWasteQty}</strong></div>
                                          <div>แก้ไข: <strong className="text-amber-700">{actualSummary.totalReworkQty}</strong></div>
                                          {actualSummary.totalShortfallQty > 0 && (
                                            <div>ขาด: <strong className="text-rose-700">{actualSummary.totalShortfallQty}</strong></div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

