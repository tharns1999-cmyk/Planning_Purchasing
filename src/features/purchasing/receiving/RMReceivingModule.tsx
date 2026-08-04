import React, { useState, useMemo } from 'react';
import {
  PackageCheck,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Info,
  Calendar,
  Scale,
  Percent,
  Pencil,
  X,
  Trash2,
  Factory,
  ChevronUp,
} from 'lucide-react';
import { TablePagination } from '@/components/ui/TablePagination';
import { AutocompleteSelect, SelectOption } from '@/components/ui/AutocompleteSelect';
import {
  calculateDefectResult,
  ReceivingRecord,
  RMItem,
  Supplier,
  DefectRule,
} from '@/services/DefectMatrixService';
import { motion, AnimatePresence } from 'framer-motion';

interface RMReceivingModuleProps {
  receivingRecords: ReceivingRecord[];
  onAddReceivingRecord: (record: ReceivingRecord) => void;
  onAddReceivingRecordsBatch?: (records: ReceivingRecord[]) => void;
  onUpdateReceivingRecord?: (record: ReceivingRecord) => void;
  onDeleteReceivingRecord?: (id: string) => void;
  onOpenIssueLogModal: (prefillData: {
    receivingRecordId: string;
    supplierId: string;
    supplierName: string;
    rmId: string;
    rmName: string;
    billNo: string;
    issueDate: string;
    problemQty: number;
  }) => void;
  suppliers?: Supplier[];
  rmItems?: RMItem[];
  defectMatrix?: Record<string, DefectRule[]>;
}

export const RMReceivingModule: React.FC<RMReceivingModuleProps> = ({
  receivingRecords,
  onAddReceivingRecord,
  onAddReceivingRecordsBatch,
  onUpdateReceivingRecord,
  onDeleteReceivingRecord,
  onOpenIssueLogModal,
  suppliers,
  rmItems,
  defectMatrix,
}) => {
  // Form State
  const [isFormOpen, setIsFormOpen] = useState<boolean>(true);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedRmId, setSelectedRmId] = useState<string>('');
  const [billNo, setBillNo] = useState<string>('');
  const [receiveDate, setReceiveDate] = useState<string>(
    new Date().toISOString().split('T')[0] || ''
  );
  const [receiveQty, setReceiveQty] = useState<string>('');
  const [defectQty, setDefectQty] = useState<string>('');
  const [remark, setRemark] = useState<string>('');

  // Pending Items State (Batch Receiving)
  const [pendingItems, setPendingItems] = useState<ReceivingRecord[]>([]);

  // Table Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<ReceivingRecord | null>(null);
  
  // Edit Form State
  const [editBillNo, setEditBillNo] = useState<string>('');
  const [editReceiveDate, setEditReceiveDate] = useState<string>('');
  const [editReceiveQty, setEditReceiveQty] = useState<string>('');
  const [editDefectQty, setEditDefectQty] = useState<string>('');
  const [editRemark, setEditRemark] = useState<string>('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [recordToDelete, setRecordToDelete] = useState<ReceivingRecord | null>(null);

  // Post-Production Modal State
  const [isPostProdModalOpen, setIsPostProdModalOpen] = useState<boolean>(false);
  const [postProdRecord, setPostProdRecord] = useState<ReceivingRecord | null>(null);
  const [postProdDefectQty, setPostProdDefectQty] = useState<string>('');
  const [postProdRemark, setPostProdRemark] = useState<string>('');
  const [postProdDate, setPostProdDate] = useState<string>('');

  // Filtered RMs based on selected Supplier
  const availableRMs = useMemo(() => {
    const items = rmItems || [];
    if (!selectedSupplierId) return items;
    return items.filter(
      (item) =>
        item.supplierId === selectedSupplierId ||
        (item.supplierIds && item.supplierIds.includes(selectedSupplierId))
    );
  }, [selectedSupplierId, rmItems]);

  // Autocomplete Select Options
  const supplierOptions: SelectOption[] = useMemo(
    () =>
      (suppliers || []).map((s) => ({
        value: s.id,
        label: s.name,
        badge: s.code,
      })),
    [suppliers]
  );

  const rmOptions: SelectOption[] = useMemo(
    () =>
      availableRMs.map((rm) => ({
        value: rm.id,
        label: rm.name,
        subtitle: rm.categoryLabel,
        badge: rm.category,
      })),
    [availableRMs]
  );

  // Selected RM Object
  const selectedRM = useMemo<RMItem | undefined>(() => {
    return (rmItems || []).find((item) => item.id === selectedRmId);
  }, [selectedRmId, rmItems]);

  // Live Auto-Calculate Defect Matrix Result
  const numReceiveQty = parseFloat(receiveQty) || 0;
  const numDefectQty = parseFloat(defectQty) || 0;

  const hasMatrixRules = useMemo(() => {
    if (!selectedRM) return true;
    if (selectedRM.category === 'Type 3') return true; // Type 3 doesn't need rules
    const rules = (defectMatrix || {})[selectedRM.category];
    return rules && rules.length > 0;
  }, [selectedRM, defectMatrix]);

  const evaluationResult = useMemo(() => {
    if (!selectedRM || numReceiveQty <= 0) {
      return {
        sampleQty: 0,
        acceptMaxDefectQty: 0,
        defectPercent: 0,
        isPass: true,
      };
    }
    return calculateDefectResult(selectedRM.category, numReceiveQty, numDefectQty, defectMatrix || {});
  }, [selectedRM, numReceiveQty, numDefectQty, defectMatrix]);

  // Add item to pending list
  const handleAddPendingItem = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplierId || !selectedRmId || !billNo || !receiveQty) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    if (!hasMatrixRules) {
      alert('ไม่สามารถบันทึกได้ เนื่องจากไม่มีเกณฑ์การสุ่มตรวจ (QC Matrix) สำหรับหมวดหมู่วัตถุดิบนี้');
      return;
    }

    const supplierObj = (suppliers || []).find((s) => s.id === selectedSupplierId);
    if (!supplierObj || !selectedRM) return;

    const newRecord: ReceivingRecord = {
      id: `REC-${Date.now().toString().slice(-8)}-${Math.floor(Math.random()*1000)}`,
      billNo: billNo.trim(),
      receiveDate,
      supplierId: supplierObj.id,
      supplierName: supplierObj.name,
      rmId: selectedRM.id,
      rmName: selectedRM.name,
      rmCategory: selectedRM.category,
      receiveQty: numReceiveQty,
      sampleQty: evaluationResult.sampleQty,
      defectQty: numDefectQty,
      defectPercent: evaluationResult.defectPercent,
      isPass: evaluationResult.isPass,
      remark: remark.trim(),
      createdAt: new Date().toISOString(),
      hasIssueLog: false,
    };

    setPendingItems(prev => [newRecord, ...prev]);

    // Reset Item Form ONLY (Keep Bill No, Date, Supplier)
    setSelectedRmId('');
    setReceiveQty('');
    setDefectQty('');
    setRemark('');
  };

  const handleRemovePendingItem = (id: string) => {
    setPendingItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmitBill = () => {
    if (pendingItems.length === 0) return;
    
    if (onAddReceivingRecordsBatch) {
      onAddReceivingRecordsBatch(pendingItems);
    } else {
      pendingItems.forEach(item => onAddReceivingRecord(item));
    }
    
    // Reset Master & Items
    setPendingItems([]);
    setBillNo('');
    setSelectedRmId('');
    setSelectedSupplierId('');
    setReceiveQty('');
    setDefectQty('');
    setRemark('');
  };

  // Edit Handlers
  const handleOpenEdit = (record: ReceivingRecord) => {
    setEditingRecord(record);
    setEditBillNo(record.billNo);
    setEditReceiveDate(record.receiveDate);
    setEditReceiveQty(record.receiveQty.toString());
    setEditDefectQty(record.defectQty.toString());
    setEditRemark(record.remark || '');
    setIsEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditModalOpen(false);
    setEditingRecord(null);
  };

  const editEvaluationResult = useMemo(() => {
    if (!editingRecord || parseFloat(editReceiveQty) <= 0) {
      return { sampleQty: 0, acceptMaxDefectQty: 0, defectPercent: 0, isPass: true };
    }
    return calculateDefectResult(
      editingRecord.rmCategory,
      parseFloat(editReceiveQty) || 0,
      parseFloat(editDefectQty) || 0,
      defectMatrix || {}
    );
  }, [editingRecord, editReceiveQty, editDefectQty, defectMatrix]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !onUpdateReceivingRecord) return;
    
    if (!editBillNo || !editReceiveQty) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    const updatedRecord: ReceivingRecord = {
      ...editingRecord,
      billNo: editBillNo.trim(),
      receiveDate: editReceiveDate,
      receiveQty: parseFloat(editReceiveQty) || 0,
      sampleQty: editEvaluationResult.sampleQty,
      defectQty: parseFloat(editDefectQty) || 0,
      defectPercent: editEvaluationResult.defectPercent,
      isPass: editEvaluationResult.isPass,
      remark: editRemark.trim(),
    };

    onUpdateReceivingRecord(updatedRecord);
    handleCloseEdit();
  };

  const confirmDelete = () => {
    if (recordToDelete && onDeleteReceivingRecord) {
      onDeleteReceivingRecord(recordToDelete.id);
      setRecordToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleOpenDelete = (record: ReceivingRecord) => {
    setRecordToDelete(record);
    setIsDeleteModalOpen(true);
  };

  // Post-Production Handlers
  const handleOpenPostProd = (record: ReceivingRecord) => {
    setPostProdRecord(record);
    setPostProdDefectQty(record.postProductionDefectQty !== undefined ? record.postProductionDefectQty.toString() : '');
    setPostProdRemark(record.postProductionRemark || '');
    setPostProdDate(record.postProductionDate || new Date().toISOString().split('T')[0] || '');
    setIsPostProdModalOpen(true);
  };

  const handleClosePostProd = () => {
    setIsPostProdModalOpen(false);
    setPostProdRecord(null);
  };

  const handleSavePostProd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postProdRecord || !onUpdateReceivingRecord) return;
    
    const updatedRecord: ReceivingRecord = {
      ...postProdRecord,
      postProductionDefectQty: parseFloat(postProdDefectQty) || 0,
      postProductionRemark: postProdRemark.trim(),
      postProductionDate: postProdDate,
    };

    onUpdateReceivingRecord(updatedRecord);
    handleClosePostProd();
  };

  // Derived filtered & paginated data
  const filteredHistory = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return (receivingRecords || []).filter((rec) => {
      if (!rec) return false;
      const matchSearch =
        String(rec.billNo || '').toLowerCase().includes(q) ||
        String(rec.supplierName || '').toLowerCase().includes(q) ||
        String(rec.rmName || '').toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PASS' && rec.isPass) ||
        (statusFilter === 'FAIL' && !rec.isPass);

      return matchSearch && matchStatus;
    });
  }, [receivingRecords, searchQuery, statusFilter]);

  // Table Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredHistory.length / pageSize);
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, currentPage, pageSize]);

  return (
    <div className="space-[#101828] space-y-8">
      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-visible relative">
        {/* Card Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-sm">
              📦
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">บันทึกการตรวจรับเข้าวัตถุดิบ (RM Receiving)</h2>
              <p className="text-xs text-slate-500">
                {isFormOpen ? 'ประเมินผลคุณภาพและคำนวณอัตโนมัติตามเกณฑ์ QC Sampling Matrix' : 'คลิกเปิดฟอร์มเพื่อบันทึกการรับเข้าใหม่'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              {isFormOpen ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  <span>พับเก็บฟอร์ม</span>
                </>
              ) : (
                <>
                  <span className="text-xs">➕</span>
                  <span>เปิดฟอร์มบันทึกรับเข้า</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Form Body (Rendered when isFormOpen is true) */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 space-y-6">
                
                {/* Master Details: Applies to all items in this bill */}
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 shadow-inner">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    ข้อมูลหลักของบิล (Master Info)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* 1. Supplier */}
                    <div className="relative">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <span className="text-xs">🏬</span>
                        1. Supplier <span className="text-rose-500">*</span>
                      </label>
                      <AutocompleteSelect
                        options={supplierOptions}
                        value={selectedSupplierId}
                        onChange={(val) => {
                          setSelectedSupplierId(val);
                          setSelectedRmId('');
                        }}
                        placeholder="-- เลือกผู้ส่งมอบ --"
                        searchPlaceholder="พิมพ์รหัส หรือ ชื่อ Supplier..."
                        required
                      />
                    </div>

                    {/* 3. Bill No */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <span className="text-xs">📄</span>
                        2. เลขที่บิล (Bill No) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={billNo}
                        onChange={(e) => setBillNo(e.target.value)}
                        placeholder="เช่น BILL-2026-001"
                        required
                        className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
                      />
                    </div>

                    {/* 4. Receive Date */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <span className="text-xs">📅</span>
                        3. วันที่รับเข้า <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={receiveDate}
                        onChange={(e) => setReceiveDate(e.target.value)}
                        required
                        className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Add Item Form (Detail) */}
                <form onSubmit={handleAddPendingItem} className="pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    เพิ่มรายการวัตถุดิบ (Add Item)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {/* RM (Filtered) */}
                    <div className="relative md:col-span-1">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <span className="text-xs">🥬</span>
                        วัตถุดิบ (RM) <span className="text-rose-500">*</span>
                      </label>
                      <AutocompleteSelect
                        options={rmOptions}
                        value={selectedRmId}
                        onChange={setSelectedRmId}
                        disabled={!selectedSupplierId}
                        placeholder={selectedSupplierId ? '-- เลือกวัตถุดิบ --' : 'เลือก Supplier ก่อน'}
                        searchPlaceholder="พิมพ์ชื่อวัตถุดิบ..."
                        required
                      />
                      
                      {!hasMatrixRules && selectedRM && (
                        <div className="absolute top-[100%] left-0 right-0 mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 shadow-lg z-50 flex gap-3 animate-in fade-in slide-in-from-top-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-semibold text-amber-900 leading-tight">ไม่มีตารางสุ่ม (QC Matrix)</h4>
                            <p className="text-xs text-amber-800 mt-0.5 leading-tight">ยังไม่มีการตั้งค่าตารางสุ่มตรวจ</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Receive Qty */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-emerald-600" />
                        รับเข้า (kg) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={receiveQty}
                        onChange={(e) => setReceiveQty(e.target.value)}
                        placeholder="เช่น 200"
                        required
                        className="w-full h-10 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
                      />
                    </div>

                    {/* Defect Qty */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-rose-600" />
                        Defect (kg) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={selectedRM?.category === 'Type 3' ? 0 : defectQty}
                        onChange={(e) => setDefectQty(e.target.value)}
                        placeholder="เช่น 1.5"
                        required={selectedRM?.category !== 'Type 3'}
                        disabled={selectedRM?.category === 'Type 3'}
                        className={`w-full h-10 px-3.5 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all ${
                          selectedRM?.category === 'Type 3'
                            ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                        }`}
                      />
                    </div>

                    {/* Remark & Add Button */}
                    <div className="flex flex-col justify-end">
                       <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        หมายเหตุ
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={remark}
                          onChange={(e) => setRemark(e.target.value)}
                          placeholder="หมายเหตุ (ถ้ามี)"
                          className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-slate-400 placeholder:text-slate-400"
                        />
                        <button
                          type="submit"
                          disabled={!hasMatrixRules || !selectedSupplierId || !billNo || !receiveQty}
                          className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shrink-0"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>เพิ่มรายการ</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Result Output */}
                  <AnimatePresence mode="popLayout">
                    {selectedRM && numReceiveQty > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mb-4"
                      >
                         {selectedRM.category === 'Type 3' ? (
                            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">✓</div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-emerald-900">PASS (ผ่านประเมิน)</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Auto Approved</span>
                                  </div>
                                  <p className="text-xs text-emerald-700 mt-0.5">วัตถุดิบสำเร็จรูป (Type 3) ได้รับยกเว้นการสุ่มตรวจ</p>
                                </div>
                              </div>
                            </div>
                          ) : evaluationResult.isPass ? (
                            <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-400/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">✓</div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-emerald-950">PASS — ผ่านเกณฑ์สุ่มตรวจ</span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-200/80 text-emerald-900">Defect: {evaluationResult.defectPercent}%</span>
                                  </div>
                                  <p className="text-xs text-emerald-800 mt-0.5 font-medium">พบของเสีย {defectQty || 0} kg อยู่ในเกณฑ์ที่ยอมรับได้ (ไม่เกิน {evaluationResult.acceptMaxDefectQty} kg)</p>
                                </div>
                              </div>
                              <div className="text-xs font-mono font-medium text-emerald-900 bg-white/90 px-3 py-1.5 rounded-lg border border-emerald-300/80 shrink-0 shadow-2xs">
                                เกณฑ์ยอมรับสูงสุด: <span className="font-bold text-emerald-700">≤ {evaluationResult.acceptMaxDefectQty} kg</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs animate-pulse">✕</div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-rose-950">FAIL — ไม่ผ่านเกณฑ์สุ่มตรวจ!</span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-200 text-rose-900">Defect: {evaluationResult.defectPercent}%</span>
                                  </div>
                                  <p className="text-xs text-rose-800 mt-0.5 font-medium">พบของเสีย {defectQty} kg ซึ่งเกินกว่าเกณฑ์ยอมรับสูงสุด ({evaluationResult.acceptMaxDefectQty} kg)</p>
                                </div>
                              </div>
                              <div className="flex flex-col sm:items-end gap-1 shrink-0">
                                <div className="text-xs font-mono font-medium text-rose-900 bg-white/90 px-3 py-1 rounded-lg border border-rose-300 shadow-2xs">
                                  เกณฑ์ยอมรับสูงสุด: <span className="font-bold text-rose-700">≤ {evaluationResult.acceptMaxDefectQty} kg</span>
                                </div>
                              </div>
                            </div>
                          )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>

                {/* Pending Items List */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      รายการที่เพิ่มในบิลนี้ ({pendingItems.length})
                    </h3>
                  </div>
                  
                  {pendingItems.length === 0 ? (
                    <div className="py-8 bg-slate-50/50 border border-slate-200 border-dashed rounded-xl text-center flex flex-col items-center justify-center">
                       <PackageCheck className="w-8 h-8 text-slate-300 mb-2" />
                       <p className="text-sm text-slate-500 font-medium">ยังไม่มีรายการวัตถุดิบในบิลนี้</p>
                       <p className="text-xs text-slate-400 mt-1">กรอกข้อมูลและกดปุ่ม "เพิ่มรายการ" เพื่อเริ่มบันทึก</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {pendingItems.map((item) => (
                          <motion.div 
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, height: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-slate-300 hover:shadow transition-all gap-3"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.isPass ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {item.isPass ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-900">{item.rmName}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium border border-slate-200">{item.rmCategory}</span>
                                </div>
                                <div className="flex items-center flex-wrap gap-2 md:gap-3 mt-1 text-xs text-slate-500">
                                  <span>รับเข้า: <strong className="text-slate-700">{item.receiveQty} kg</strong></span>
                                  <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                                  <span>สุ่ม: <strong className="text-slate-700">{item.sampleQty} kg</strong></span>
                                  <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                                  <span className={item.isPass ? '' : 'text-rose-600 font-medium'}>
                                    Defect: <strong>{item.defectQty} kg ({item.defectPercent}%)</strong>
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePendingItem(item.id)}
                              className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 self-end sm:self-auto"
                              title="ลบรายการนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Final Submit Action */}
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                   <button
                    type="button"
                    onClick={handleSubmitBill}
                    disabled={pendingItems.length === 0}
                    className="h-12 px-8 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    <PackageCheck className="w-5 h-5" />
                    <span>บันทึกบิลนี้ ({pendingItems.length} รายการ)</span>
                  </button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Receiving History Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:px-5 sm:py-4 border-b border-slate-100 bg-white flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                ประวัติการรับเข้าวัตถุดิบ (Receiving History)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                รายการประเมินรับเข้าวัตถุดิบและสถานะ QC
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา Bill No, Supplier, RM..."
                className="w-full h-9 pl-9 pr-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs font-medium">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ทั้งหมด ({receivingRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PASS')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'PASS'
                    ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                PASS
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('FAIL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'FAIL'
                    ? 'bg-rose-600 text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                FAIL
              </button>
            </div>
          </div>
        </div>

        {/* Table Content with Scrollbar */}
        <div className="overflow-x-auto max-h-[calc(100vh-320px)] min-h-[400px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sticky top-0 z-10">
                <th className="py-3 px-4">วันที่รับ</th>
                <th className="py-3 px-4">Bill No</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">วัตถุดิบ (RM)</th>
                <th className="py-3 px-4 text-right">รับเข้า</th>
                <th className="py-3 px-4 text-right">สุ่มตรวจ</th>
                <th className="py-3 px-4 text-right">Defect</th>
                <th className="py-3 px-4 text-right">% Defect</th>
                <th className="py-3 px-4 text-center">ผลประเมิน</th>
                <th className="py-3 px-4 text-center">หลังการผลิต</th>
                <th className="py-3 px-4 text-center w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm font-normal text-slate-800">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-normal text-slate-500">ไม่พบประวัติการรับเข้าวัตถุดิบ</p>
                    <p className="text-sm mt-0.5">กรอกฟอร์มด้านบนเพื่อเริ่มบันทึกรายการ</p>
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono">
                      {rec.receiveDate ? rec.receiveDate.split('T')[0] : '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-normal text-slate-900 font-mono">
                      {rec.billNo}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-normal text-slate-800">
                      {rec.supplierName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-normal text-slate-900">{rec.rmName}</span>
                        <span className="text-sm font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {rec.rmCategory}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right font-normal text-slate-900">
                      {rec.receiveQty.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right font-normal text-blue-700">
                      {rec.sampleQty}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right font-normal text-rose-700">
                      {rec.defectQty}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right font-normal">
                      {rec.defectPercent}%
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      {rec.isPass ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-normal">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-sm font-normal">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          FAIL
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      {rec.postProductionDefectQty !== undefined ? (
                        <span className="font-normal text-rose-600 bg-rose-50 px-2 py-1 rounded">
                          {rec.postProductionDefectQty} kg
                        </span>
                      ) : (
                        <span className="text-sm font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded">
                          รอบันทึก
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPostProd(rec)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors shadow-none cursor-pointer"
                          title="บันทึกหลังการผลิต"
                        >
                          <Factory className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rec)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sky-700 hover:text-sky-900 hover:bg-sky-50 transition-colors shadow-none cursor-pointer"
                          title="แก้ไขรายการ"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(rec)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors shadow-none cursor-pointer"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {!rec.isPass && (
                          !rec.hasIssueLog ? (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenIssueLogModal({
                                  receivingRecordId: rec.id,
                                  supplierId: rec.supplierId,
                                  supplierName: rec.supplierName,
                                  rmId: rec.rmId,
                                  rmName: rec.rmName,
                                  billNo: rec.billNo,
                                  issueDate: rec.receiveDate,
                                  problemQty: rec.defectQty > 0 ? rec.defectQty : rec.receiveQty,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-normal transition-all shadow-2xs cursor-pointer"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              สร้าง Issue Log
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-xs font-normal">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                              มี Issue Log แล้ว
                            </span>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredHistory.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemUnitLabel="รายการรับเข้า"
        />
      </div>

      {/* -------------------------------------------------------------
          EDIT MODAL
      ------------------------------------------------------------- */}
      {isEditModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={handleCloseEdit}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-50/80 via-slate-50 to-sky-50/50 border-b border-slate-200/80 rounded-t-3xl px-6 py-4.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-lg text-sky-600 shadow-2xs">
                  ✏️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">แก้ไขข้อมูลรับเข้า</h3>
                  <p className="text-xs text-slate-500 mt-0.5">แก้ไขตัวเลขและรายละเอียดการรับเข้า (เฉพาะรายการที่บันทึกผิด)</p>
                </div>
              </div>
              <button
                onClick={handleCloseEdit}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Readonly Context */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="block text-sm font-normal text-slate-500 uppercase">Supplier</span>
                  <span className="text-base font-normal text-slate-800">{editingRecord.supplierName}</span>
                </div>
                <div>
                  <span className="block text-sm font-normal text-slate-500 uppercase">วัตถุดิบ (RM)</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-base font-normal text-slate-900">{editingRecord.rmName}</span>
                    <span className="text-sm font-normal text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                      {editingRecord.rmCategory}
                    </span>
                  </div>
                </div>
              </div>

              <form id="editForm" onSubmit={handleSaveEdit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-normal text-slate-700 mb-1.5">เลขที่บิล (Bill No) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={editBillNo}
                      onChange={(e) => setEditBillNo(e.target.value)}
                      required
                      className="w-full h-9.5 px-3 bg-white border border-slate-300 rounded-lg text-base font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-normal text-slate-700 mb-1.5">วันที่รับเข้า <span className="text-rose-500">*</span></label>
                    <input
                      type="date"
                      value={editReceiveDate}
                      onChange={(e) => setEditReceiveDate(e.target.value)}
                      required
                      className="w-full h-9.5 px-3 bg-white border border-slate-300 rounded-lg text-base font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-sm font-normal text-slate-700 mb-1.5 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-slate-400" /> รับเข้า (kg) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={editReceiveQty}
                      onChange={(e) => setEditReceiveQty(e.target.value)}
                      required
                      className="w-full h-9.5 px-3 bg-white border border-slate-300 rounded-lg text-base font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-normal text-slate-700 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Defect ที่พบ (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editDefectQty}
                      onChange={(e) => setEditDefectQty(e.target.value)}
                      className="w-full h-9.5 px-3 bg-rose-50 border border-rose-200 rounded-lg text-base font-normal text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition-all"
                    />
                  </div>
                </div>

                {/* Live Recalculation Display */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                  <div className="flex gap-6 w-full sm:w-auto">
                    <div>
                      <span className="block text-sm font-normal text-slate-500 uppercase">สุ่มตรวจ (Sample)</span>
                      <span className="text-base font-normal text-sky-700">{editEvaluationResult.sampleQty} kg</span>
                    </div>
                    <div>
                      <span className="block text-sm font-normal text-slate-500 uppercase">% Defect</span>
                      <span className={`text-base font-normal ${editEvaluationResult.defectPercent > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {editEvaluationResult.defectPercent}%
                      </span>
                    </div>
                  </div>
                  <div>
                    {editEvaluationResult.isPass ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-normal border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> PASS (ผ่าน)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 text-sm font-normal border border-rose-200">
                        <XCircle className="w-4 h-4 text-rose-600" /> FAIL (ไม่ผ่าน)
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-normal text-slate-700 mb-1.5">หมายเหตุ (Remark)</label>
                  <textarea
                    value={editRemark}
                    onChange={(e) => setEditRemark(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all resize-none"
                    placeholder="เพิ่มเติม..."
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={handleCloseEdit}
                className="h-9.5 px-4 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-normal text-base rounded-lg shadow-sm transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="editForm"
                className="h-9.5 px-6 bg-sky-600 hover:bg-sky-700 text-white font-normal text-base rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && recordToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-xl font-normal text-slate-900 mb-2">
                ยืนยันการลบรายการรับเข้า?
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                คุณต้องการลบรายการรับเข้าวัตถุดิบ <span className="font-normal text-slate-700">{recordToDelete.rmName}</span> (บิล: {recordToDelete.billNo}) ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 h-11 bg-white border border-slate-300 text-slate-700 font-normal rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 text-white font-normal rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  ใช่, ลบรายการเลย
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          POST-PRODUCTION MODAL
      ------------------------------------------------------------- */}
      {isPostProdModalOpen && postProdRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={handleClosePostProd}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-normal text-emerald-900 leading-tight">บันทึกหลังการผลิต</h3>
                  <p className="text-sm text-emerald-700 mt-0.5">ระบุจำนวนของเสียที่พบจริง หลังจากการผลิตเสร็จสิ้น</p>
                </div>
              </div>
              <button
                onClick={handleClosePostProd}
                className="w-8 h-8 rounded-full hover:bg-emerald-200/50 flex items-center justify-center text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-full sm:w-auto">
                  <span className="block text-sm font-normal text-slate-500 uppercase">วัตถุดิบ</span>
                  <span className="text-base font-normal text-slate-800">{postProdRecord.rmName}</span>
                </div>
                <div className="w-full sm:w-auto">
                  <span className="block text-sm font-normal text-slate-500 uppercase">จำนวนรับเข้า</span>
                  <span className="text-base font-normal text-slate-800">{postProdRecord.receiveQty} kg</span>
                </div>
              </div>

              <form id="postProdForm" onSubmit={handleSavePostProd} className="space-y-5">
                <div>
                  <label className="block text-sm font-normal text-slate-700 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-emerald-600" /> วันที่บันทึก
                  </label>
                  <input
                    type="date"
                    value={postProdDate}
                    onChange={(e) => setPostProdDate(e.target.value)}
                    required
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-base font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-normal text-slate-700 mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-rose-500" /> จำนวนของเสียจริงที่พบ (kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={postProdDefectQty}
                    onChange={(e) => setPostProdDefectQty(e.target.value)}
                    required
                    placeholder="เช่น 10"
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-base font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-normal text-slate-700 mb-1.5">หมายเหตุหลังการผลิต</label>
                  <textarea
                    value={postProdRemark}
                    onChange={(e) => setPostProdRemark(e.target.value)}
                    rows={3}
                    placeholder="ระบุสาเหตุหรือข้อมูลเพิ่มเติม..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all resize-none"
                  />
                </div>
              </form>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={handleClosePostProd}
                className="h-9.5 px-4 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-normal text-base rounded-lg shadow-sm transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="postProdForm"
                className="h-9.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-normal text-base rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
              >
                บันทึกหลังผลิต
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
