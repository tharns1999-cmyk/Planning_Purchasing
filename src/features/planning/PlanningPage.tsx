import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  RefreshCw,
  CheckCircle2,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { PlanningQueuePanel } from './PlanningQueuePanel';
import { AllocationModal, DragTarget } from './AllocationModal';
import { EditAllocationModal } from './EditAllocationModal';
import { ConfirmRemoveModal } from './ConfirmRemoveModal';
import { BoardNoteModal } from './BoardNoteModal';
import { plannerRepository } from '@/services/plannerService';
import {
  PlanningBoardDataDetail,
  PlanningQueueDataDetail,
  PlanningQueueFgItem,
} from '@/services/repositories/PlannerRepository';
import { PlanStatus, WipPrepItem, SourceType, PlanAllocation, WeeklyPlan, BoardNote } from '@/domain/types';
import { FIXED_ROOMS } from '@/domain/constants';
import { getProductionWeek, parseDateOnly, formatDateISO } from '@/domain/calculations';
import { formatThaiDate } from '@/utils/thaiDate';
import { pageTransitionVariants, getMotionVariants } from '@/motion/tokens';

const THAI_DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function formatThaiDayAndDate(isoDateStr: string): { dayName: string; formattedDate: string } {
  const d = parseDateOnly(isoDateStr);
  const dayName = THAI_DAY_NAMES[d.getDay()] || '';
  const formattedDate = formatThaiDate(isoDateStr);
  return { dayName, formattedDate };
}

export const PlanningPage: React.FC = () => {
  const reducedMotion = useReducedMotion() ?? false;

  // Current production week state (default reference week: 2026-07-20)
  const [currentWeek, setCurrentWeek] = useState(() => getProductionWeek('2026-07-20'));
  const [boardData, setBoardData] = useState<PlanningBoardDataDetail | null>(null);
  const [queueData, setQueueData] = useState<PlanningQueueDataDetail | null>(null);
  const [weekPlans, setWeekPlans] = useState<WeeklyPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Drag & Drop Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const [draggedFgItem, setDraggedFgItem] = useState<PlanningQueueFgItem | null>(null);
  const [draggedWipPrepItem, setDraggedWipPrepItem] = useState<WipPrepItem | null>(null);

  // Edit Allocation Modal State
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [selectedAllocForEdit, setSelectedAllocForEdit] = useState<PlanAllocation | null>(null);

  // Confirm Remove Modal State
  const [removeModalOpen, setRemoveModalOpen] = useState<boolean>(false);
  const [selectedAllocForRemove, setSelectedAllocForRemove] = useState<PlanAllocation | null>(null);
  const [removeDisplayName, setRemoveDisplayName] = useState<string>('');

  // Board Note Modal State
  const [boardNoteModalOpen, setBoardNoteModalOpen] = useState<boolean>(false);
  const [selectedNoteTarget, setSelectedNoteTarget] = useState<{ productionDate: string; roomId: string } | null>(null);
  const [editingBoardNote, setEditingBoardNote] = useState<BoardNote | null>(null);

  const loadPageData = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      plannerRepository.initialize();
      const bData = plannerRepository.getPlanningBoardData(currentWeek.weekStart);
      const qData = plannerRepository.getPlanningQueueData(currentWeek.weekStart);
      const wPlans = plannerRepository.listWeekPlans(currentWeek.weekStart);

      setBoardData(bData);
      setQueueData(qData);
      setWeekPlans(wPlans.sort((a, b) => a.revisionNumber.localeCompare(b.revisionNumber)));

      // Always sync selectedPlanId with activePlan if available, otherwise null
      if (bData.activePlan) {
        setSelectedPlanId(bData.activePlan.id);
      } else {
        setSelectedPlanId(null);
      }
    } catch (err) {
      console.error('Failed to load Planning Board data:', err);
      setError('ไม่สามารถโหลดข้อมูลกระดานวางแผนการผลิตได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  }, [currentWeek.weekStart]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Active non-cancelled plans for the revision selector dropdown (deduplicated by revisionNumber)
  const activeWeekPlans = useMemo(() => {
    const nonCancelled = weekPlans.filter((p) => p.status !== PlanStatus.CANCELLED);
    const seenRevs = new Set<string>();
    const result: WeeklyPlan[] = [];
    for (const p of nonCancelled) {
      if (!seenRevs.has(p.revisionNumber)) {
        seenRevs.add(p.revisionNumber);
        result.push(p);
      }
    }
    return result.sort((a, b) => a.revisionNumber.localeCompare(b.revisionNumber));
  }, [weekPlans]);

  // Selected plan currently being viewed on board
  const selectedPlan = useMemo(() => {
    const active = boardData?.activePlan ?? null;
    if (!active) {
      return null;
    }
    if (selectedPlanId) {
      const found = weekPlans.find((p) => p.id === selectedPlanId && p.status !== PlanStatus.CANCELLED);
      if (found) return found;
    }
    return active;
  }, [selectedPlanId, weekPlans, boardData]);

  const isDraftStatus = selectedPlan?.status === PlanStatus.DRAFT;

  // Currently displayed board notes for selected plan
  const currentPlanBoardNotes = useMemo(() => {
    if (!selectedPlan) return [];
    return plannerRepository.listBoardNotes(selectedPlan.id);
  }, [selectedPlan]);

  // Week Navigation Handlers
  const handlePreviousWeek = () => {
    const d = parseDateOnly(currentWeek.weekStart);
    d.setDate(d.getDate() - 7);
    setSelectedPlanId(null);
    setCurrentWeek(getProductionWeek(formatDateISO(d)));
  };

  const handleThisWeek = () => {
    setSelectedPlanId(null);
    setCurrentWeek(getProductionWeek('2026-07-20'));
  };

  const handleNextWeek = () => {
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

  // Toast notice helper
  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => {
      setNoticeMessage(null);
    }, 4000);
  };

  // Plan Lifecycle Actions
  const handleCreateDraft = () => {
    try {
      const result = plannerRepository.createDraftPlan(currentWeek.weekStart);
      if (result.success && result.plan) {
        showNotice(`สร้างแผนฉบับร่าง (${result.plan.revisionNumber}) สำเร็จ`);
        setSelectedPlanId(result.plan.id);
        loadPageData();
      } else {
        setError(result.errors?.[0] || 'ไม่สามารถสร้างแผนฉบับร่างได้');
      }
    } catch (err) {
      console.error('Failed to create draft plan:', err);
      setError('เกิดข้อผิดพลาดในการสร้างแผนฉบับร่าง');
    }
  };

  const handlePublishPlan = (planId: string) => {
    try {
      const result = plannerRepository.publishPlan(planId);
      if (result.success && result.plan) {
        showNotice(`ประกาศใช้แผนการผลิต (${result.plan.revisionNumber}) เรียบร้อยแล้ว`);
        setSelectedPlanId(result.plan.id);
        loadPageData();
      } else {
        setError(result.errors?.[0] || 'ไม่สามารถประกาศใช้แผนได้');
      }
    } catch (err) {
      console.error('Failed to publish plan:', err);
      setError('เกิดข้อผิดพลาดในการประกาศใช้แผน');
    }
  };

  const handleCancelDraft = (planId: string) => {
    try {
      const result = plannerRepository.cancelDraftPlan(planId);
      if (result.success) {
        showNotice('ยกเลิกแผนฉบับร่างเรียบร้อยแล้ว');
        loadPageData();
      } else {
        setError(result.errors?.[0] || 'ไม่สามารถยกเลิกฉบับร่างได้');
      }
    } catch (err) {
      console.error('Failed to cancel draft plan:', err);
      setError('เกิดข้อผิดพลาดในการยกเลิกแผนฉบับร่าง');
    }
  };

  // Plan Revision Actions
  const handleCreateRevision = (publishedPlanId: string) => {
    try {
      const result = plannerRepository.createPlanRevision(publishedPlanId);
      if (result.success && result.plan) {
        showNotice(`สร้างฉบับแก้ไข (${result.plan.revisionNumber}) สำเร็จ`);
        setSelectedPlanId(result.plan.id);
        loadPageData();
      } else {
        setError(result.errors?.[0] || 'ไม่สามารถสร้างฉบับแก้ไขได้');
      }
    } catch (err) {
      console.error('Failed to create plan revision:', err);
      setError('เกิดข้อผิดพลาดในการสร้างฉบับแก้ไข');
    }
  };

  const handlePublishRevision = (draftPlanId: string) => {
    try {
      const result = plannerRepository.publishPlanRevision(draftPlanId);
      if (result.success && result.plan) {
        showNotice(`ประกาศใช้ฉบับแก้ไข (${result.plan.revisionNumber}) เรียบร้อยแล้ว`);
        setSelectedPlanId(result.plan.id);
        loadPageData();
      } else {
        setError(result.errors?.[0] || 'ไม่สามารถประกาศใช้ฉบับแก้ไขได้');
      }
    } catch (err) {
      console.error('Failed to publish plan revision:', err);
      setError('เกิดข้อผิดพลาดในการประกาศใช้ฉบับแก้ไข');
    }
  };

  const handleCancelRevision = (draftPlan: WeeklyPlan) => {
    try {
      const result = plannerRepository.cancelPlanRevision(draftPlan.id);
      if (result.success) {
        showNotice(`ยกเลิกฉบับร่าง (${draftPlan.revisionNumber}) เรียบร้อยแล้ว`);
        if (draftPlan.sourcePlanId) {
          setSelectedPlanId(draftPlan.sourcePlanId);
        }
        loadPageData();
      } else {
        setError(result.errors?.[0] || 'ไม่สามารถยกเลิกฉบับร่างได้');
      }
    } catch (err) {
      console.error('Failed to cancel plan revision:', err);
      setError('เกิดข้อผิดพลาดในการยกเลิกฉบับร่าง');
    }
  };

  // Drag & Drop Board Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/json') || e.dataTransfer.types.includes('text/plain')) {
      e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === 'copy' ? 'copy' : 'move';
    }
  };

  const handleDropCell = (
    e: React.DragEvent,
    dayIso: string,
    roomId: string,
    roomName: string
  ) => {
    e.preventDefault();
    if (!selectedPlan || selectedPlan.status !== PlanStatus.DRAFT) {
      showNotice('ต้องเลือกแผนที่เป็นฉบับร่าง (DRAFT) ก่อนจึงจะสามารถวางรายการผลิตในตารางได้');
      return;
    }

    try {
      const dataStr = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const parsed = JSON.parse(dataStr);

      if (parsed.type === 'MOVE_ALLOCATION') {
        if (!selectedPlan || selectedPlan.status !== PlanStatus.DRAFT) {
          showNotice('ต้องเลือกแผนที่เป็นฉบับร่าง (DRAFT) ก่อนจึงจะสามารถย้ายรายการผลิตได้');
          return;
        }

        // Drop in exact same cell -> do nothing
        if (parsed.currentProductionDate === dayIso && parsed.currentRoomId === roomId) {
          return;
        }

        const res = plannerRepository.updateAllocation(parsed.allocationId, {
          productionDate: dayIso,
          roomId,
        });

        if (res.success) {
          showNotice('ย้ายรายการวางแผนเรียบร้อยแล้ว');
          loadPageData();
        } else {
          setError(res.errors?.[0] || 'ไม่สามารถย้ายรายการวางแผนได้');
        }
        return;
      }

      setDragTarget({ productionDate: dayIso, roomId, roomName });

      if (parsed.type === 'FG') {
        setDraggedFgItem(parsed.item);
        setDraggedWipPrepItem(null);
        setModalOpen(true);
      } else if (parsed.type === 'WIP_PREP') {
        setDraggedWipPrepItem(parsed.item);
        setDraggedFgItem(null);
        setModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to parse dropped item:', err);
    }
  };

  // Drag Start Handler for Moving Allocation Card
  const handleDragStartAllocation = (e: React.DragEvent, alloc: PlanAllocation) => {
    if (!isDraftStatus) {
      e.preventDefault();
      return;
    }
    const payload = {
      type: 'MOVE_ALLOCATION',
      allocationId: alloc.allocationId,
      currentProductionDate: alloc.productionDate,
      currentRoomId: alloc.roomId,
    };
    const jsonStr = JSON.stringify(payload);
    e.dataTransfer.setData('application/json', jsonStr);
    e.dataTransfer.setData('text/plain', jsonStr);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Confirm FG Allocation
  const handleConfirmFg = (input: {
    plannedQty: number;
    plannedUnit: string;
    fgOutputQty: number;
    fgOutputUnit: string;
    note?: string;
    printCustomerTag?: string;
    printNote?: string;
    highlightOnPlan?: boolean;
  }) => {
    if (!selectedPlan || selectedPlan.status !== PlanStatus.DRAFT || !draggedFgItem || !dragTarget) return;

    const res = plannerRepository.createFgAllocation({
      planId: selectedPlan.id,
      salesOrderId: draggedFgItem.salesOrderId,
      salesOrderLineId: draggedFgItem.salesOrderLineId,
      productionDate: dragTarget.productionDate,
      roomId: dragTarget.roomId,
      plannedQty: input.plannedQty,
      unit: input.fgOutputUnit,
      plannedUnit: input.plannedUnit,
      fgOutputQty: input.fgOutputQty,
      fgOutputUnit: input.fgOutputUnit,
      note: input.note,
      printCustomerTag: input.printCustomerTag,
      printNote: input.printNote,
      highlightOnPlan: input.highlightOnPlan,
    });

    if (res.success) {
      showNotice(`วางแผนผลิต ${draggedFgItem.productName} เรียบร้อยแล้ว`);
      loadPageData();
    } else {
      setError(res.errors?.[0] || 'ไม่สามารถบันทึกรายการวางแผนได้');
    }
  };

  // Confirm WIP/PREP Allocation
  const handleConfirmWipPrep = (input: {
    plannedQty: number;
    plannedUnit: string;
    note?: string;
    printCustomerTag?: string;
    printNote?: string;
    highlightOnPlan?: boolean;
  }) => {
    if (!selectedPlan || selectedPlan.status !== PlanStatus.DRAFT || !draggedWipPrepItem || !dragTarget) return;

    const res = plannerRepository.createWipPrepAllocation({
      planId: selectedPlan.id,
      wipPrepItemId: draggedWipPrepItem.itemId,
      productionDate: dragTarget.productionDate,
      roomId: dragTarget.roomId,
      plannedQty: input.plannedQty,
      unit: input.plannedUnit,
      plannedUnit: input.plannedUnit,
      note: input.note,
      printCustomerTag: input.printCustomerTag,
      printNote: input.printNote,
      highlightOnPlan: input.highlightOnPlan,
    });

    if (res.success) {
      showNotice(`วางแผนผลิต ${draggedWipPrepItem.itemName} เรียบร้อยแล้ว`);
      loadPageData();
    } else {
      setError(res.errors?.[0] || 'ไม่สามารถบันทึกรายการวางแผนได้');
    }
  };

  // Edit Allocation Handlers
  const handleOpenEditModal = (alloc: PlanAllocation) => {
    if (!selectedPlan || selectedPlan.status !== PlanStatus.DRAFT) {
      showNotice('แก้ไขรายการวางแผนได้เฉพาะในแผนฉบับร่าง (DRAFT) เท่านั้น');
      return;
    }
    setSelectedAllocForEdit(alloc);
    setEditModalOpen(true);
  };

  const handleConfirmEditSave = (input: {
    allocationId: string;
    plannedQty: number;
    plannedUnit: string;
    productionDate: string;
    roomId: string;
    fgOutputQty?: number;
    fgOutputUnit?: string;
    note?: string;
    printCustomerTag?: string;
    printNote?: string;
    highlightOnPlan?: boolean;
  }) => {
    const result = plannerRepository.updateAllocation(input.allocationId, {
      plannedQty: input.plannedQty,
      plannedUnit: input.plannedUnit,
      productionDate: input.productionDate,
      roomId: input.roomId,
      fgOutputQty: input.fgOutputQty,
      fgOutputUnit: input.fgOutputUnit,
      note: input.note,
      printCustomerTag: input.printCustomerTag,
      printNote: input.printNote,
      highlightOnPlan: input.highlightOnPlan,
    });

    if (result.success) {
      showNotice('แก้ไขรายการวางแผนเรียบร้อยแล้ว');
      loadPageData();
    } else {
      setError(result.errors?.[0] || 'ไม่สามารถแก้ไขรายการวางแผนได้');
    }
  };

  // Board Note Handlers
  const handleOpenAddBoardNote = (productionDate: string, roomId: string) => {
    if (!selectedPlan || selectedPlan.status !== PlanStatus.DRAFT) return;
    setSelectedNoteTarget({ productionDate, roomId });
    setEditingBoardNote(null);
    setBoardNoteModalOpen(true);
  };

  const handleOpenEditBoardNote = (note: BoardNote) => {
    if (!selectedPlan || selectedPlan.status !== PlanStatus.DRAFT) return;
    setSelectedNoteTarget({ productionDate: note.productionDate, roomId: note.roomId });
    setEditingBoardNote(note);
    setBoardNoteModalOpen(true);
  };

  const handleSaveBoardNote = (input: { noteText: string; highlightOnPlan: boolean }) => {
    if (!selectedPlan || selectedPlan.status !== PlanStatus.DRAFT) return;

    if (editingBoardNote) {
      const res = plannerRepository.updateBoardNote(editingBoardNote.noteId, input);
      if (res.success) {
        showNotice('แก้ไขหมายเหตุเรียบร้อยแล้ว');
        loadPageData();
      } else {
        setError(res.errors?.[0] || 'ไม่สามารถแก้ไขหมายเหตุได้');
      }
    } else if (selectedNoteTarget) {
      const res = plannerRepository.createBoardNote({
        planId: selectedPlan.id,
        productionDate: selectedNoteTarget.productionDate,
        roomId: selectedNoteTarget.roomId,
        noteText: input.noteText,
        highlightOnPlan: input.highlightOnPlan,
      });
      if (res.success) {
        showNotice('เพิ่มหมายเหตุเรียบร้อยแล้ว');
        loadPageData();
      } else {
        setError(res.errors?.[0] || 'ไม่สามารถสร้างหมายเหตุได้');
      }
    }
  };

  const handleRemoveBoardNote = (noteId: string) => {
    if (!selectedPlan || selectedPlan.status !== PlanStatus.DRAFT) return;
    const res = plannerRepository.removeBoardNote(noteId);
    if (res.success) {
      showNotice('ลบหมายเหตุเรียบร้อยแล้ว');
      loadPageData();
    } else {
      setError(res.errors?.[0] || 'ไม่สามารถลบหมายเหตุได้');
    }
  };

  // Remove Allocation Handlers
  const handleOpenRemoveModal = (alloc: PlanAllocation, displayName: string) => {
    if (!selectedPlan || selectedPlan.status !== PlanStatus.DRAFT) {
      showNotice('ลบรายการวางแผนได้เฉพาะในแผนฉบับร่าง (DRAFT) เท่านั้น');
      return;
    }
    setSelectedAllocForRemove(alloc);
    setRemoveDisplayName(displayName);
    setRemoveModalOpen(true);
  };

  const handleConfirmRemove = () => {
    if (!selectedAllocForRemove) return;

    const result = plannerRepository.removeAllocation(selectedAllocForRemove.allocationId);
    if (result.success) {
      showNotice('ลบรายการวางแผนเรียบร้อยแล้ว');
      loadPageData();
    } else {
      setError(result.errors?.[0] || 'ไม่สามารถลบรายการวางแผนได้');
    }
  };

  // Lookup helper for allocation display details
  const getSnapshotDetails = (alloc: PlanAllocation) => {
    try {
      const snap = plannerRepository.getSnapshot();
      if (alloc.sourceType === SourceType.FG && alloc.salesOrderLineId) {
        const line = snap.entities.salesOrderLines.find((l) => l.id === alloc.salesOrderLineId);
        const order = snap.entities.salesOrders.find((o) => o.id === alloc.salesOrderId);
        return {
          displayName: line?.skuName || 'สินค้า FG',
          poNumber: order?.orderNo || '',
        };
      } else if (alloc.wipPrepItemId) {
        const item = snap.entities.wipPrepItems.find((i) => i.itemId === alloc.wipPrepItemId);
        return {
          displayName: item?.itemName || 'WIP งานแปรรูป',
          poNumber: '',
        };
      }
    } catch {
      // Fallback
    }
    return { displayName: 'รายการผลิต', poNumber: '' };
  };

  const activeVariants = getMotionVariants(pageTransitionVariants, reducedMotion);

  // Status badge helper
  const renderStatusBadge = (status: PlanStatus) => {
    switch (status) {
      case PlanStatus.DRAFT:
        return <Badge variant="amber" label="ฉบับร่าง" />;
      case PlanStatus.PUBLISHED:
        return <Badge variant="emerald" label="ประกาศใช้แล้ว" />;
      case PlanStatus.SUPERSEDED:
        return <Badge variant="sky" label="ถูกแทนที่แล้ว" />;
      case PlanStatus.CANCELLED:
        return <Badge variant="rose" label="ยกเลิกแล้ว" />;
      default:
        return <Badge variant="slate" label="ไม่มีแผน" />;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <LoadingState message="กำลังโหลดกระดานวางแผนการผลิต..." />
      </div>
    );
  }

  if (error && !boardData) {
    return (
      <div className="w-full">
        <ErrorState title="เกิดข้อผิดพลาดในการโหลด" message={error} onRetry={loadPageData} />
      </div>
    );
  }

  const hasDraftInWeek = weekPlans.some((p) => p.status === PlanStatus.DRAFT);

  return (
    <motion.div
      className="w-full space-y-3.5"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={activeVariants}
    >
      {/* Notice Banner */}
      <AnimatePresence>
        {noticeMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between shadow-sm"
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

      {/* Header Page Title & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
            วางแผนการผลิต (Weekly Planning Board)
          </h1>
          <p className="text-sm text-slate-500 mt-1 leading-normal">
            จัดวางตารางการผลิตรายสัปดาห์ จำแนกตามสายการผลิต (ห้องผลิต R1–R4)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4 text-slate-500" />}
            onClick={loadPageData}
          >
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Week Navigation Toolbar & Controls */}
      <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Week Title & Date Range */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-50 text-sky-700 rounded-lg shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">ประจำสัปดาห์</div>
            <div className="text-base font-bold text-slate-900 tracking-tight">
              {formatThaiDate(currentWeek.weekStart)} – {formatThaiDate(currentWeek.weekEnd)}
            </div>
          </div>
        </div>

        {/* Navigation Buttons & Date Picker */}
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
              title="เลือกวันที่ (ระบบจะแปลงเป็นวันจันทร์สัปดาห์นั้น)"
            />
          </div>
        </div>
      </div>

      {/* Revision Selector & Lifecycle Actions Bar */}
      <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Revision Selector & Status Badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-slate-500">ฉบับแผน:</span>
          <div className="w-36">
            <Select
              aria-label="เลือกฉบับแผน"
              title="เลือกฉบับแผน"
              disabled={!boardData?.activePlan || activeWeekPlans.length === 0}
              value={selectedPlan?.id || ''}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              options={
                boardData?.activePlan && activeWeekPlans.length > 0
                  ? activeWeekPlans.map((p) => ({
                      value: p.id,
                      label: p.revisionNumber,
                    }))
                  : [{ value: '', label: 'ยังไม่มีฉบับแผน' }]
              }
            />
          </div>

          {selectedPlan ? renderStatusBadge(selectedPlan.status) : <Badge variant="slate" label="ไม่มีแผน" />}
        </div>

        {/* Right: Lifecycle & Revision Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Case 1: No active plan for week */}
          {!boardData?.activePlan && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleCreateDraft}
            >
              สร้างแผนฉบับร่าง
            </Button>
          )}

          {/* Case 2: Selected plan is PUBLISHED and no DRAFT exists for week */}
          {boardData?.activePlan?.status === PlanStatus.PUBLISHED && selectedPlan?.status === PlanStatus.PUBLISHED && !hasDraftInWeek && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleCreateRevision(selectedPlan.id)}
            >
              สร้างฉบับแก้ไข
            </Button>
          )}

          {/* Case 3: Selected plan is DRAFT (Revision derived from sourcePlanId) */}
          {selectedPlan?.status === PlanStatus.DRAFT && selectedPlan.sourcePlanId && (
            <>
              <Button
                variant="outline"
                size="md"
                leftIcon={<X className="w-4 h-4 text-rose-600" />}
                onClick={() => handleCancelRevision(selectedPlan)}
              >
                ยกเลิกฉบับร่าง
              </Button>
              <Button
                variant="primary"
                size="md"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                leftIcon={<Check className="w-4 h-4" />}
                onClick={() => handlePublishRevision(selectedPlan.id)}
              >
                ประกาศใช้ฉบับแก้ไข
              </Button>
            </>
          )}

          {/* Case 4: Selected plan is DRAFT (Initial R00 without sourcePlanId) */}
          {selectedPlan?.status === PlanStatus.DRAFT && !selectedPlan.sourcePlanId && (
            <>
              <Button
                variant="outline"
                size="md"
                leftIcon={<X className="w-4 h-4 text-rose-600" />}
                onClick={() => handleCancelDraft(selectedPlan.id)}
              >
                ยกเลิกฉบับร่าง
              </Button>
              <Button
                variant="primary"
                size="md"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                leftIcon={<Check className="w-4 h-4" />}
                onClick={() => handlePublishPlan(selectedPlan.id)}
              >
                ประกาศใช้แผน
              </Button>
            </>
          )}

          {/* Read-Only Status Info for Superseded or Cancelled view */}
          {selectedPlan?.status === PlanStatus.SUPERSEDED && (
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              แผนถูกแทนที่แล้ว (Read-only)
            </span>
          )}
          {selectedPlan?.status === PlanStatus.CANCELLED && boardData?.activePlan && (
            <span className="text-xs font-medium text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
              แผนถูกยกเลิกแล้ว (Read-only)
            </span>
          )}
        </div>
      </div>

      {/* 2-Column Responsive Flex Layout: Queue Panel (Balanced ~290px width) + Expanded Board Grid */}
      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        {/* Left Column: Planning Queue Panel (Balanced width 280–300px) */}
        <div className="w-full lg:w-[290px] lg:shrink-0">
          <PlanningQueuePanel
            fgItems={queueData?.fgItems || []}
            wipPrepItems={queueData?.wipPrepItems || []}
            reducedMotion={reducedMotion}
            onRefresh={loadPageData}
          />
        </div>

        {/* Right Column: Board Grid Table (takes remaining width) */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-3 px-3 w-32 border-r border-slate-200 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span className="text-xs sm:text-sm font-bold">วันที่ / ห้องผลิต</span>
                    </div>
                  </th>
                  {FIXED_ROOMS.map((room) => (
                    <th key={room.id} className="py-3 px-2 text-center border-r border-slate-200 last:border-r-0 w-1/4">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">{room.id} - {room.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal truncate max-w-[200px] mx-auto">{room.description}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(boardData?.days || []).map((dayIso) => {
                  const { dayName, formattedDate } = formatThaiDayAndDate(dayIso);
                  return (
                    <tr key={dayIso} className="hover:bg-slate-50/50 transition-colors">
                      {/* Day Column */}
                      <td className="py-3.5 px-3 font-semibold text-slate-900 border-r border-slate-200 bg-slate-50/30">
                        <div className="text-xs sm:text-sm font-bold text-slate-900">{dayName}</div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">{formattedDate}</div>
                      </td>

                      {/* 4 Room Columns (Droppable Cells) */}
                      {FIXED_ROOMS.map((room) => {
                        const cellAllocations = (selectedPlan?.allocations || [])
                          .filter((a) => a.productionDate === dayIso && a.roomId === room.id)
                          .sort((a, b) => {
                            if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
                              return a.displayOrder - b.displayOrder;
                            }
                            return a.createdAt.localeCompare(b.createdAt);
                          });

                        const cellNotes = currentPlanBoardNotes
                          .filter((n) => n.productionDate === dayIso && n.roomId === room.id)
                          .sort((a, b) => {
                            if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
                              return a.displayOrder - b.displayOrder;
                            }
                            return a.createdAt.localeCompare(b.createdAt);
                          });

                        return (
                          <td
                            key={room.id}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropCell(e, dayIso, room.id, room.name)}
                            className="py-3.5 px-2 text-center border-r border-slate-200 last:border-r-0 bg-white align-top min-w-[140px]"
                          >
                            {/* Draft action button to add manual note */}
                            {isDraftStatus && (
                              <div className="flex items-center justify-end mb-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddBoardNote(dayIso, room.id)}
                                  className="text-[10px] font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-1.5 py-0.5 rounded border border-sky-200 transition-colors cursor-pointer flex items-center gap-0.5"
                                  title="เพิ่มหมายเหตุบนแผน"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ หมายเหตุ</span>
                                </button>
                              </div>
                            )}

                            {cellAllocations.length === 0 && cellNotes.length === 0 ? (
                              <div className="min-h-[70px] flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50/40 p-2 text-slate-400 text-[11px] transition-colors hover:border-sky-300 hover:bg-sky-50/30">
                                ลากมาวางที่นี่
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {/* Render Manual Board Notes first */}
                                {cellNotes.map((note) => (
                                  <div
                                    key={note.noteId}
                                    className={`p-2 rounded-lg text-left shadow-2xs space-y-1 hover:border-slate-300 transition-all group relative border ${
                                      note.highlightOnPlan ? 'bg-amber-100/90 border-amber-300 highlight-on-plan' : 'bg-amber-50/70 border-amber-200'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="text-xs font-semibold text-slate-800 leading-snug break-words">
                                        {note.noteText}
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <Badge variant="amber" label="หมายเหตุ" />

                                        {isDraftStatus && (
                                          <div className="flex items-center gap-0.5 ml-1">
                                            <button
                                              type="button"
                                              aria-label="แก้ไขหมายเหตุ"
                                              title="แก้ไขหมายเหตุ"
                                              onClick={() => handleOpenEditBoardNote(note)}
                                              className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                                            >
                                              <Pencil className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              aria-label="ลบหมายเหตุ"
                                              title="ลบหมายเหตุ"
                                              onClick={() => handleRemoveBoardNote(note.noteId)}
                                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {/* Render Allocation Cards */}
                                {cellAllocations.map((alloc) => {
                                  const { displayName, poNumber } = getSnapshotDetails(alloc);
                                  const isFg = alloc.sourceType === SourceType.FG;

                                  return (
                                    <div
                                      key={alloc.allocationId}
                                      draggable={isDraftStatus}
                                      onDragStart={(e) => handleDragStartAllocation(e, alloc)}
                                      className={`p-2.5 rounded-lg text-left shadow-2xs space-y-1 hover:border-slate-300 transition-all group relative border ${
                                        isDraftStatus ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-default'
                                      } ${
                                        alloc.highlightOnPlan ? 'bg-amber-100/90 border-amber-300 highlight-on-plan' : 'bg-white border-slate-200'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-1">
                                        <span className="font-bold text-slate-900 text-xs sm:text-sm leading-tight line-clamp-1">
                                          {displayName}
                                        </span>
                                        <div className="flex items-center gap-1 shrink-0">
                                          {isFg ? (
                                            <Badge variant="sky" label="FG" />
                                          ) : alloc.sourceType === SourceType.WIP ? (
                                            <Badge variant="indigo" label="WIP" />
                                          ) : (
                                            <Badge variant="amber" label="PREP" />
                                          )}

                                          {/* Edit / Remove Action Buttons (DRAFT only) */}
                                          {isDraftStatus && (
                                            <div className="flex items-center gap-0.5 ml-1">
                                              <button
                                                type="button"
                                                aria-label="แก้ไขรายการวางแผน"
                                                title="แก้ไขรายการวางแผน"
                                                onClick={() => handleOpenEditModal(alloc)}
                                                className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors cursor-pointer"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                aria-label="ลบรายการวางแผน"
                                                title="ลบรายการวางแผน"
                                                onClick={() => handleOpenRemoveModal(alloc, displayName)}
                                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {isFg ? (
                                        <>
                                          <div className="text-xs text-slate-700 font-medium">
                                            ผลิต: <strong className="font-bold text-slate-900">{alloc.plannedQty} {alloc.plannedUnit || alloc.unit}</strong>
                                          </div>
                                          <div className="text-xs text-emerald-700 font-bold">
                                            ได้ FG: <strong className="font-extrabold">{alloc.fgOutputQty ?? alloc.plannedQty} {alloc.fgOutputUnit || alloc.unit}</strong>
                                          </div>
                                          {poNumber && (
                                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                              <FileText className="w-3 h-3" />
                                              {poNumber}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className="text-xs text-indigo-700 font-medium">
                                          วางแผน: <strong className="font-bold text-indigo-950">{alloc.plannedQty} {alloc.plannedUnit || alloc.unit}</strong>
                                        </div>
                                      )}

                                      {alloc.printCustomerTag && (
                                        <div className="text-[10px] text-sky-700 font-semibold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 inline-block mt-0.5">
                                          {alloc.printCustomerTag}
                                        </div>
                                      )}

                                      {alloc.printNote && (
                                        <div className="text-[10px] text-slate-600 font-medium italic mt-0.5">
                                          หมายเหตุ: {alloc.printNote}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
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

      {/* Allocation Modals */}
      <AllocationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        targetCell={dragTarget}
        fgItem={draggedFgItem}
        wipPrepItem={draggedWipPrepItem}
        onConfirmFg={handleConfirmFg}
        onConfirmWipPrep={handleConfirmWipPrep}
      />

      <EditAllocationModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        allocation={selectedAllocForEdit}
        activePlan={selectedPlan}
        onConfirmSave={handleConfirmEditSave}
      />

      <ConfirmRemoveModal
        isOpen={removeModalOpen}
        onClose={() => setRemoveModalOpen(false)}
        onConfirmRemove={handleConfirmRemove}
        itemName={removeDisplayName}
      />

      <BoardNoteModal
        isOpen={boardNoteModalOpen}
        onClose={() => setBoardNoteModalOpen(false)}
        editingNote={editingBoardNote}
        onSave={handleSaveBoardNote}
      />
    </motion.div>
  );
};
