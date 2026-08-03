import React, { useState, useMemo } from 'react';
import {
  Building2,
  Layers,
  Sliders,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Search,
} from 'lucide-react';
import { TablePagination } from '@/components/ui/TablePagination';
import { AutocompleteSelect, SelectOption } from '@/components/ui/AutocompleteSelect';
import { MultiAutocompleteSelect } from '@/components/ui/MultiAutocompleteSelect';
import {
  Supplier,
  RMItem,
  DefectRule,
  formatPhoneNumber,
} from '@/services/DefectMatrixService';

interface PurchasingMasterDataModuleProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;

  rmItems: RMItem[];
  onAddRMItem: (rm: RMItem) => void;
  onUpdateRMItem: (rm: RMItem) => void;
  onDeleteRMItem: (id: string) => void;

  defectMatrix: Record<string, DefectRule[]>;
  onUpdateDefectMatrix: (matrix: Record<string, DefectRule[]>) => void;
}

export const PurchasingMasterDataModule: React.FC<PurchasingMasterDataModuleProps> = ({
  suppliers = [],
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  rmItems = [],
  onAddRMItem,
  onUpdateRMItem,
  onDeleteRMItem,
  defectMatrix = {},
  onUpdateDefectMatrix,
}) => {
  // Sub-tab state
  const [activeSubTab, setActiveSubTab] = useState<'suppliers' | 'rms' | 'matrix'>('suppliers');

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // --- DYNAMIC CATEGORIES ---
  const dynamicCategories = useMemo(() => {
    const cats: Record<string, string> = {
      'Type 1': 'พืชเกษตร ยกเว้นผักใบ (Type 1)',
      'Type 2': 'ผักใบ (Type 2)',
      'Type 3': 'สำเร็จรูป (Type 3)',
      'Type 4': 'ประมง (Type 4)',
    };
    (rmItems || []).forEach(rm => {
      if (rm.category && rm.categoryLabel) {
        cats[rm.category] = rm.categoryLabel;
      }
    });
    return cats;
  }, [rmItems]);

  const categoryOptions: SelectOption[] = useMemo(() => {
    return Object.entries(dynamicCategories).map(([key, label]) => ({
      value: key,
      label: label,
    }));
  }, [dynamicCategories]);

  // Autocomplete Select Options
  const supplierSelectOptions: SelectOption[] = useMemo(
    () =>
      (suppliers || []).map((s) => ({
        value: s.id,
        label: s.name,
        badge: s.code,
      })),
    [suppliers]
  );

  // -----------------------------------------------------------------
  // 1. SUPPLIER MANAGEMENT MODALS & STATE
  // -----------------------------------------------------------------
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supCode, setSupCode] = useState<string>('');
  const [supName, setSupName] = useState<string>('');
  const [supPhone, setSupPhone] = useState<string>('');
  const [supEmail, setSupEmail] = useState<string>('');
  const [supAddress, setSupAddress] = useState<string>('');
  const [supContact, setSupContact] = useState<string>('');

  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    const nextNum = (suppliers.length + 1).toString().padStart(2, '0');
    setSupCode(nextNum);
    setSupName('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setSupContact('');
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupCode(sup.code);
    setSupName(sup.name);
    setSupPhone(sup.phone || '');
    setSupEmail(sup.email || '');
    setSupAddress(sup.address || '');
    setSupContact(sup.contactPerson || '');
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e?: React.FormEvent | React.MouseEvent) => {
    try {
      if (e) {
        e.preventDefault();
      }
      const codeStr = String(supCode || '').trim();
      const nameStr = String(supName || '').trim();
      const contactStr = String(supContact || '').trim();
      const emailStr = String(supEmail || '').trim();
      const addressStr = String(supAddress || '').trim();

      if (!codeStr) {
        alert('กรุณากรอกรหัส Supplier');
        return;
      }
      if (!nameStr) {
        alert('กรุณากรอกชื่อผู้ส่งมอบ / ชื่อฟาร์ม');
        return;
      }

      const cleanPhone = formatPhoneNumber(supPhone);
      const phoneToSave = cleanPhone === '-' ? '' : cleanPhone;

      // Duplicate code check
      const isDuplicate = suppliers.some(
        (s) => String(s.code || '').trim().toLowerCase() === codeStr.toLowerCase() &&
               (!editingSupplier || s.id !== editingSupplier.id)
      );
      if (isDuplicate) {
        alert('รหัส Supplier นี้มีในระบบแล้ว กรุณาระบุรหัสใหม่');
        return;
      }

      // Close modal first so UI is responsive even if save fails
      setIsSupplierModalOpen(false);

      if (editingSupplier) {
        onUpdateSupplier({
          ...editingSupplier,
          code: codeStr,
          name: nameStr,
          phone: phoneToSave,
          contactPerson: contactStr,
          email: emailStr,
          address: addressStr,
        });
      } else {
        const newSup: Supplier = {
          id: `sup-${Date.now().toString().slice(-4)}`,
          code: codeStr,
          name: nameStr,
          phone: phoneToSave,
          contactPerson: contactStr,
          email: emailStr,
          address: addressStr,
        };
        onAddSupplier(newSup);
      }
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Error saving supplier: ${e.message}`);
      console.error(e);
    }
  };

  // -----------------------------------------------------------------
  // 2. RAW MATERIAL (RM) MANAGEMENT & SUPPLIER LINKING MODALS & STATE
  // -----------------------------------------------------------------
  const [isRmModalOpen, setIsRmModalOpen] = useState<boolean>(false);
  const [editingRm, setEditingRm] = useState<RMItem | null>(null);
  const [rmCode, setRmCode] = useState<string>('');
  const [rmName, setRmName] = useState<string>('');
  const [rmCategory, setRmCategory] = useState<string>('Type 1');
  const [rmUnit, setRmUnit] = useState<string>('kg');
  const [selectedLinkedSupplierIds, setSelectedLinkedSupplierIds] = useState<string[]>([]);

  const handleOpenAddRm = () => {
    setEditingRm(null);
    setRmCode(`RM-${(rmItems.length + 1).toString().padStart(3, '0')}`);
    setRmName('');
    setRmCategory('Type 1');
    setRmUnit('kg');
    setSelectedLinkedSupplierIds(suppliers && suppliers.length > 0 && suppliers[0]?.id ? [suppliers[0].id] : []);
    setIsRmModalOpen(true);
  };

  const handleOpenEditRm = (rm: RMItem) => {
    setEditingRm(rm);
    setRmCode(rm.code);
    setRmName(rm.name);
    setRmCategory(rm.category);
    setRmUnit(rm.unit);

    // Linked supplier IDs
    const linkedIds = rm.supplierIds && rm.supplierIds.length > 0
      ? rm.supplierIds
      : [rm.supplierId];
    setSelectedLinkedSupplierIds(linkedIds);
    setIsRmModalOpen(true);
  };

  const handleSaveRm = (e?: React.FormEvent | React.MouseEvent) => {
    try {
      if (e) e.preventDefault();
      const codeStr = String(rmCode || '').trim();
      const nameStr = String(rmName || '').trim();
      const unitStr = String(rmUnit || '').trim();

      if (!nameStr) return;

      // Duplicate RM code check
      const isDuplicate = rmItems.some(
        (rm) => String(rm.code || '').trim().toLowerCase() === codeStr.toLowerCase() &&
                (!editingRm || rm.id !== editingRm.id)
      );
      if (isDuplicate) {
        alert('รหัส RM นี้มีในระบบแล้ว กรุณาระบุรหัสใหม่');
        return;
      }

      // Close modal first so UI is responsive even if save fails
      setIsRmModalOpen(false);

      const primarySup = suppliers.find((s) => selectedLinkedSupplierIds.includes(s.id)) || suppliers[0];

      if (editingRm) {
        onUpdateRMItem({
          ...editingRm,
          code: codeStr,
          name: nameStr,
          category: rmCategory,
          categoryLabel: dynamicCategories[rmCategory] || rmCategory,
          supplierId: primarySup ? primarySup.id : '',
          supplierName: primarySup ? primarySup.name : 'หลาย Supplier',
          supplierIds: selectedLinkedSupplierIds,
          unit: unitStr,
        });
      } else {
        const newRm: RMItem = {
          id: `rm-${Date.now().toString().slice(-4)}`,
          code: codeStr,
          name: nameStr,
          category: rmCategory,
          categoryLabel: dynamicCategories[rmCategory] || rmCategory,
          supplierId: primarySup ? primarySup.id : '',
          supplierName: primarySup ? primarySup.name : 'หลาย Supplier',
          supplierIds: selectedLinkedSupplierIds,
          unit: unitStr,
        };
        onAddRMItem(newRm);
      }
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Error saving RM Item: ${e.message}`);
      console.error(e);
    }
  };

  // -----------------------------------------------------------------
  // 3. QC MATRIX RULES MANAGEMENT
  // -----------------------------------------------------------------
  const [selectedMatrixCategory, setSelectedMatrixCategory] = useState<string>('Type 1');
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [ruleMinQty, setRuleMinQty] = useState<number>(0);
  const [ruleMaxQty, setRuleMaxQty] = useState<number>(0);
  const [ruleSampleQty, setRuleSampleQty] = useState<number>(0);
  const [ruleAcceptDefectQty, setRuleAcceptDefectQty] = useState<number>(0);

  const handleOpenAddRule = () => {
    setEditingRuleIndex(null);
    const existingRules = defectMatrix[selectedMatrixCategory] || [];
    const lastRule = existingRules[existingRules.length - 1];
    const newMin = lastRule ? lastRule.maxQty + 1 : 1;
    setRuleMinQty(newMin);
    setRuleMaxQty(newMin + 100);
    setRuleSampleQty(5);
    setRuleAcceptDefectQty(1);
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (rule: DefectRule, index: number) => {
    setEditingRuleIndex(index);
    setRuleMinQty(rule.minQty);
    setRuleMaxQty(rule.maxQty);
    setRuleSampleQty(rule.sampleQty);
    setRuleAcceptDefectQty(rule.acceptMaxDefectQty);
    setIsRuleModalOpen(true);
  };

  const handleDeleteRule = (index: number) => {
    if (!window.confirm('ยืนยันลบเกณฑ์การสุ่มตรวจแถวนี้?')) return;
    const currentRules = [...(defectMatrix[selectedMatrixCategory] || [])];
    if (currentRules.length <= 1) {
      alert('ไม่สามารถลบเกณฑ์การสุ่มตรวจแถวสุดท้ายได้ (ต้องมีอย่างน้อย 1 กฎ)');
      return;
    }
    currentRules.splice(index, 1);
    onUpdateDefectMatrix({
      ...defectMatrix,
      [selectedMatrixCategory]: currentRules,
    });
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    const currentRules = [...(defectMatrix[selectedMatrixCategory] || [])];
    const pct = ruleSampleQty > 0 ? Number(((ruleAcceptDefectQty / ruleSampleQty) * 100).toFixed(2)) : 0;

    const newRule: DefectRule = {
      minQty: Number(ruleMinQty),
      maxQty: Number(ruleMaxQty),
      sampleQty: Number(ruleSampleQty),
      acceptMaxDefectQty: Number(ruleAcceptDefectQty),
      acceptMaxDefectPercent: pct,
    };

    if (editingRuleIndex !== null) {
      currentRules[editingRuleIndex] = newRule;
    } else {
      currentRules.push(newRule);
    }

    // Sort by minQty
    currentRules.sort((a, b) => a.minQty - b.minQty);

    onUpdateDefectMatrix({
      ...defectMatrix,
      [selectedMatrixCategory]: currentRules,
    });

    setIsRuleModalOpen(false);
  };

  // Filter lists
  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (suppliers || []).filter(
      (s) =>
        String(s?.name || '').toLowerCase().includes(q) ||
        String(s?.code || '').toLowerCase().includes(q) ||
        String(s?.phone || '').includes(searchQuery)
    );
  }, [suppliers, searchQuery]);

  const filteredRms = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (rmItems || []).filter(
      (r) =>
        String(r?.name || '').toLowerCase().includes(q) ||
        String(r?.code || '').toLowerCase().includes(q)
    );
  }, [rmItems, searchQuery]);

  const currentRulesList = useMemo(() => {
    return (defectMatrix && defectMatrix[selectedMatrixCategory]) || [];
  }, [defectMatrix, selectedMatrixCategory]);

  // Pagination States
  const [supPage, setSupPage] = useState<number>(1);
  const [supPageSize, setSupPageSize] = useState<number>(10);

  const [rmPage, setRmPage] = useState<number>(1);
  const [rmPageSize, setRmPageSize] = useState<number>(10);

  const [rulePage, setRulePage] = useState<number>(1);
  const [rulePageSize, setRulePageSize] = useState<number>(10);

  React.useEffect(() => {
    setSupPage(1);
    setRmPage(1);
  }, [searchQuery, activeSubTab]);

  React.useEffect(() => {
    setRulePage(1);
  }, [selectedMatrixCategory]);

  const paginatedSuppliers = React.useMemo(() => {
    const start = (supPage - 1) * supPageSize;
    return filteredSuppliers.slice(start, start + supPageSize);
  }, [filteredSuppliers, supPage, supPageSize]);

  const paginatedRms = React.useMemo(() => {
    const start = (rmPage - 1) * rmPageSize;
    return filteredRms.slice(start, start + rmPageSize);
  }, [filteredRms, rmPage, rmPageSize]);

  const paginatedRules = React.useMemo(() => {
    const start = (rulePage - 1) * rulePageSize;
    return currentRulesList.slice(start, start + rulePageSize);
  }, [currentRulesList, rulePage, rulePageSize]);

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-sm font-normal">
          <button
            type="button"
            onClick={() => setActiveSubTab('suppliers')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'suppliers'
                ? 'bg-white text-emerald-800 shadow-xs font-normal'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            🏬 ข้อมูล Supplier ({(suppliers || []).length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('rms')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'rms'
                ? 'bg-white text-sky-800 shadow-xs font-normal'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-sky-600" />
            🥬 ข้อมูลวัตถุดิบ & ผูก Supplier ({(rmItems || []).length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('matrix')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'matrix'
                ? 'bg-white text-purple-800 shadow-xs font-normal'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-purple-600" />
            📐 ตารางเกณฑ์การสุ่มตรวจ Matrix (SD-PC-03 R01)
          </button>
        </div>

        {/* Search & Action Bar */}
        <div className="flex items-center gap-3">
          {activeSubTab !== 'matrix' && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาข้อมูล..."
                className="h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {activeSubTab === 'suppliers' && (
            <button
              type="button"
              onClick={handleOpenAddSupplier}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-normal text-sm rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              เพิ่ม Supplier ใหม่
            </button>
          )}

          {activeSubTab === 'rms' && (
            <button
              type="button"
              onClick={handleOpenAddRm}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-normal text-sm rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              เพิ่มวัตถุดิบ (RM) ใหม่
            </button>
          )}
        </div>
      </div>

      {/* 1. SUPPLIERS DIRECTORY SUB-TAB */}
      {activeSubTab === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-normal text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                รายชื่อผู้ส่งมอบวัตถุดิบ (Registered Suppliers)
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                จัดการรหัส ชื่อผู้ส่งมอบ/ฟาร์ม ชื่อผู้ติดต่อ และเบอร์โทรศัพท์
              </p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[480px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm font-normal uppercase tracking-wider text-slate-500 sticky top-0 z-10 shadow-2xs">
                  <th className="py-3.5 px-4">รหัส Supplier</th>
                  <th className="py-3.5 px-4">ชื่อผู้ส่งมอบ / ฟาร์ม</th>
                  <th className="py-3.5 px-4">ผู้ติดต่อ</th>
                  <th className="py-3.5 px-4">เบอร์โทรศัพท์</th>
                  <th className="py-3.5 px-4">อีเมล</th>
                  <th className="py-3.5 px-4">ที่อยู่</th>
                  <th className="py-3.5 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm font-normal text-slate-800">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      ไม่พบข้อมูล Supplier ในระบบ
                    </td>
                  </tr>
                ) : (
                  paginatedSuppliers.map((sup: Supplier) => (
                    <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-normal text-emerald-700">
                        {sup.code}
                      </td>
                      <td className="py-3.5 px-4 font-normal text-slate-900">
                        {sup.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {sup.contactPerson || '-'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {formatPhoneNumber(sup.phone)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {sup.email || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 truncate max-w-[150px]" title={sup.address}>
                        {sup.address || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSupplier(sup)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไข"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`ยืนยันลบ Supplier: ${sup.name}?`)) {
                                onDeleteSupplier(sup.id);
                              }
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={supPage}
            totalPages={Math.ceil(filteredSuppliers.length / supPageSize)}
            totalItems={filteredSuppliers.length}
            pageSize={supPageSize}
            onPageChange={setSupPage}
            onPageSizeChange={setSupPageSize}
            itemUnitLabel="ผู้ส่งมอบ"
          />
        </div>
      )}

      {/* 2. RAW MATERIALS (RM) & SUPPLIER LINKING SUB-TAB */}
      {activeSubTab === 'rms' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-normal text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-600" />
                ทะเบียนวัตถุดิบและการผูก Supplier (Raw Materials Directory)
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                สามารถเชื่อมโยง 1 วัตถุดิบ กับ Supplier ได้หลายราย (Multi-Supplier Linking)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[480px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm font-normal uppercase tracking-wider text-slate-500 sticky top-0 z-10 shadow-2xs">
                  <th className="py-3.5 px-4">รหัส RM</th>
                  <th className="py-3.5 px-4">ชื่อวัตถุดิบ (Raw Material)</th>
                  <th className="py-3.5 px-4">หมวดหมู่สเปก QC (Category)</th>
                  <th className="py-3.5 px-4">หน่วยนับ</th>
                  <th className="py-3.5 px-4">Supplier ที่จัดหาได้ (Linked Suppliers)</th>
                  <th className="py-3.5 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm font-normal text-slate-800">
                {filteredRms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      ไม่พบข้อมูลวัตถุดิบในระบบ
                    </td>
                  </tr>
                ) : (
                  paginatedRms.map((rm: RMItem) => {
                    const linkedSupIds = rm.supplierIds && rm.supplierIds.length > 0
                      ? rm.supplierIds
                      : [rm.supplierId];

                    const linkedSups = (suppliers || []).filter((s) => s && s.id && linkedSupIds.includes(s.id));

                    return (
                      <tr key={rm.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-normal text-sky-700">
                          {rm.code}
                        </td>
                        <td className="py-3.5 px-4 font-normal text-slate-900">
                          {rm.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-1 rounded-md text-sm font-normal bg-slate-100 text-slate-800 border border-slate-200">
                            {rm.categoryLabel || rm.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-normal text-slate-600">
                          {rm.unit}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {linkedSups.length === 0 ? (
                              <span className="text-sm text-slate-400 italic">
                                ยังไม่ได้ผูก Supplier
                              </span>
                            ) : (
                              linkedSups.map((s) => (
                                <span
                                  key={s.id}
                                  className="inline-flex items-center gap-1 text-sm font-normal px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
                                >
                                  <Building2 className="w-3 h-3 text-emerald-600" />
                                  {s.name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditRm(rm)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="แก้ไข"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`ยืนยันลบวัตถุดิบ: ${rm.name}?`)) {
                                  onDeleteRMItem(rm.id);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="ลบ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={rmPage}
            totalPages={Math.ceil(filteredRms.length / rmPageSize)}
            totalItems={filteredRms.length}
            pageSize={rmPageSize}
            onPageChange={setRmPage}
            onPageSizeChange={setRmPageSize}
            itemUnitLabel="วัตถุดิบ"
          />
        </div>
      )}

      {/* 3. QC SAMPLING MATRIX RULES MANAGEMENT SUB-TAB */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-normal text-slate-900">
                  เกณฑ์การสุ่มตรวจวัตถุดิบตามประเภท (QC Sampling Matrix SD-PC-03 R01)
                </h3>
                <p className="text-sm text-slate-500">
                  แก้ไข ปรับเพิ่ม/ลด ช่วงน้ำหนัก ปริมาณสุ่มตรวจ และเกณฑ์ของเสียยินยอมสูงสุด
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Category Pills (Dynamic) */}
              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-sm font-normal flex-wrap">
                {Object.entries(dynamicCategories).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedMatrixCategory(key)}
                    className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      selectedMatrixCategory === key
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Add New Rule Button */}
              <button
                type="button"
                onClick={handleOpenAddRule}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-normal text-sm rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                เพิ่มช่วงน้ำหนักสุ่มตรวจใหม่
              </button>
            </div>
          </div>

          {/* Matrix Rules Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-base font-normal text-slate-900 flex items-center gap-2">
                ตารางเกณฑ์ปัจจุบันสำหรับหมวดหมู่:{' '}
                <span className="text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200 font-normal">
                  {selectedMatrixCategory === 'Type 1'
                    ? 'Type 1 (เกษตรทั่วไป เช่น ข่า, มะพร้าว)'
                    : selectedMatrixCategory === 'Type 2'
                    ? 'Type 2 (ผักใบ/สมุนไพรสด เช่น ใบตอง, ใบมะกรูด)'
                    : 'Type 4 (ประมง เช่น ปลาทู, กุ้ง)'}
                </span>
              </h4>
            </div>

            <div className="overflow-x-auto max-h-[480px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-sm font-normal uppercase tracking-wider text-slate-500 sticky top-0 z-10 shadow-2xs">
                    <th className="py-3.5 px-4">ลำดับ</th>
                    <th className="py-3.5 px-4">ช่วงน้ำหนักรับเข้า (Receive Qty Range)</th>
                    <th className="py-3.5 px-4 text-right">ปริมาณสุ่มตรวจ (Sample Qty)</th>
                    <th className="py-3.5 px-4 text-right">ของเสียยินยอมสูงสุด (Max Accept Defect)</th>
                    <th className="py-3.5 px-4 text-right">% Defect ยินยอมสูงสุด</th>
                    <th className="py-3.5 px-4 text-center font-normal">ผลการประเมินอัตโนมัติ</th>
                    <th className="py-3.5 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm font-normal text-slate-800">
                  {currentRulesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        ยังไม่มีการกำหนดเกณฑ์สุ่มตรวจสำหรับหมวดหมู่นี้
                      </td>
                    </tr>
                  ) : (
                    paginatedRules.map((rule, idx) => {
                      const actualIdx = (rulePage - 1) * rulePageSize + idx;
                      return (
                        <tr key={actualIdx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-normal text-slate-500">
                            #{actualIdx + 1}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-normal text-slate-900">
                            {rule.minQty.toLocaleString()} kg — {rule.maxQty.toLocaleString()} kg
                          </td>
                          <td className="py-3.5 px-4 text-right font-normal text-sky-700">
                            {rule.sampleQty.toLocaleString()} kg
                          </td>
                          <td className="py-3.5 px-4 text-right font-normal text-rose-700">
                            {rule.acceptMaxDefectQty.toLocaleString()} kg
                          </td>
                          <td className="py-3.5 px-4 text-right font-normal text-slate-800">
                            {rule.acceptMaxDefectPercent}%
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-sm font-normal px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ของเสีย ≤ {rule.acceptMaxDefectQty} kg = PASS
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditRule(rule, actualIdx)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="แก้ไขเกณฑ์"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRule(actualIdx)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="ลบเกณฑ์"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={rulePage}
              totalPages={Math.ceil(currentRulesList.length / rulePageSize)}
              totalItems={currentRulesList.length}
              pageSize={rulePageSize}
              onPageChange={setRulePage}
              onPageSizeChange={setRulePageSize}
              itemUnitLabel="เกณฑ์สุ่มตรวจ"
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD/EDIT SUPPLIER */}
      {/* ------------------------------------------------------------- */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/80 w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[90vh] flex flex-col my-auto overflow-hidden transform transition-all relative">
            <div className="flex-none bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 px-5 py-4 sm:px-7 sm:py-5 text-white flex items-center justify-between rounded-t-2xl sm:rounded-t-3xl border-b border-emerald-900/40">
              <h3 className="text-base sm:text-lg font-normal text-white flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-emerald-400" />
                {editingSupplier ? 'แก้ไขข้อมูล Supplier' : 'เพิ่ม Supplier ใหม่'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-7 space-y-4 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                      รหัส Supplier <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={supCode}
                      onChange={(e) => setSupCode(e.target.value)}
                      placeholder="เช่น 05, 12, sup-01"
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-normal text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                      ชื่อผู้ส่งมอบ / ชื่อฟาร์ม <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={supName}
                      onChange={(e) => setSupName(e.target.value)}
                      placeholder="ระบุชื่อ Supplier"
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-normal text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                    ผู้ติดต่อ (Contact Person)
                  </label>
                  <input
                    type="text"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="ชื่อผู้ประสานงาน (ถ้ามี)"
                    className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-normal text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="เช่น 0812345678"
                    className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-normal text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                    อีเมล (Email)
                  </label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="เช่น supplier@example.com"
                    className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-normal text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                    ที่อยู่ (Address)
                  </label>
                  <textarea
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                    placeholder="ระบุที่อยู่ของ Supplier"
                    className="w-full min-h-[80px] p-3.5 bg-white border border-slate-300 rounded-xl text-sm font-normal text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition-all custom-scrollbar"
                  />
                </div>
              </div>

              <div className="flex-none shrink-0 relative z-20 px-5 py-3.5 sm:px-7 sm:py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl sm:rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-normal text-sm rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveSupplier}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-normal text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  💾 บันทึก Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: ADD/EDIT RAW MATERIAL & SUPPLIER LINKING */}
      {/* ------------------------------------------------------------- */}
      {isRmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/80 w-full max-w-lg max-h-[calc(100vh-2rem)] sm:max-h-[90vh] flex flex-col my-auto overflow-hidden transform transition-all relative">
            <div className="flex-none bg-gradient-to-r from-slate-950 via-sky-950 to-slate-900 px-5 py-4 sm:px-7 sm:py-5 text-white flex items-center justify-between rounded-t-2xl sm:rounded-t-3xl border-b border-sky-900/40">
              <h3 className="text-base sm:text-lg font-normal text-white flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-sky-400" />
                {editingRm ? 'แก้ไขข้อมูลวัตถุดิบ & การผูก Supplier' : 'เพิ่มวัตถุดิบ (RM) ใหม่'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRmModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-7 space-y-4 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                      รหัสวัตถุดิบ (RM Code) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={rmCode}
                      onChange={(e) => setRmCode(e.target.value)}
                      placeholder="เช่น RM-001"
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-normal text-slate-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 shadow-2xs transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                      ชื่อวัตถุดิบ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={rmName}
                      onChange={(e) => setRmName(e.target.value)}
                      placeholder="เช่น ใบตอง, ใบเตย"
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-normal text-slate-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 shadow-2xs transition-all"
                    />
                  </div>
                </div>

                <div className="relative z-30">
                  <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                    หมวดหมู่สเปก QC (Category) <span className="text-rose-500">*</span>
                  </label>
                  <AutocompleteSelect
                    options={categoryOptions}
                    value={rmCategory}
                    onChange={(val) => setRmCategory(val)}
                    placeholder="-- เลือกหมวดหมู่สเปก --"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                    หน่วยนับ (Unit) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={rmUnit}
                    onChange={(e) => setRmUnit(e.target.value)}
                    required
                    placeholder="เช่น kg, มัด, ตัว"
                    className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-normal text-slate-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 shadow-2xs transition-all"
                  />
                </div>

                {/* Multi-select Suppliers List with Search */}
                <div className="relative z-20">
                  <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                    <span>เลือก Supplier ที่จัดหาสินค้านี้ได้ (Multi-Select Autocomplete)</span>
                    <span className="text-sm font-normal text-slate-500">พิมพ์/ค้นหาได้มากกว่า 1 ราย</span>
                  </label>
                  <MultiAutocompleteSelect
                    options={supplierSelectOptions}
                    selectedValues={selectedLinkedSupplierIds}
                    onChange={setSelectedLinkedSupplierIds}
                    placeholder="-- ค้นหาและเลือก Supplier ที่จัดหาสินค้านี้ได้ --"
                    searchPlaceholder="พิมพ์รหัส หรือ ชื่อ Supplier เพื่อค้นหา..."
                  />
                </div>
              </div>

              <div className="flex-none shrink-0 relative z-20 px-5 py-3.5 sm:px-7 sm:py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl sm:rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setIsRmModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-normal text-sm rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveRm}
                  className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white font-normal text-sm rounded-xl shadow-lg shadow-sky-600/25 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  💾 บันทึกวัตถุดิบ & การผูก Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: ADD/EDIT QC SAMPLING RULE */}
      {/* ------------------------------------------------------------- */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/80 w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[90vh] flex flex-col my-auto overflow-hidden transform transition-all relative">
            <div className="flex-none bg-gradient-to-r from-slate-950 via-purple-950 to-slate-900 px-5 py-4 sm:px-7 sm:py-5 text-white flex items-center justify-between rounded-t-2xl sm:rounded-t-3xl border-b border-purple-900/40">
              <h3 className="text-base sm:text-lg font-normal text-white flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-purple-400" />
                {editingRuleIndex !== null ? 'แก้ไขเกณฑ์สุ่มตรวจ' : 'เพิ่มเกณฑ์สุ่มตรวจใหม่'} ({selectedMatrixCategory})
              </h3>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-7 space-y-4 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                      น้ำหนักต่ำสุด (Min kg) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={ruleMinQty}
                      onChange={(e) => setRuleMinQty(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-normal text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 shadow-2xs transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                      น้ำหนักสูงสุด (Max kg) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={ruleMaxQty}
                      onChange={(e) => setRuleMaxQty(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-normal text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 shadow-2xs transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                    ปริมาณสุ่มตรวจ (Sample Qty - kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={ruleSampleQty}
                    onChange={(e) => setRuleSampleQty(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-normal text-sky-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 shadow-2xs transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-normal text-slate-800 uppercase tracking-wide mb-1.5">
                    ของเสียยอมรับได้สูงสุด (Max Defect - kg) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={ruleAcceptDefectQty}
                    onChange={(e) => setRuleAcceptDefectQty(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-normal text-rose-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 shadow-2xs transition-all"
                  />
                  <p className="text-sm text-slate-500 mt-1 font-normal">
                    คิดเป็น {ruleSampleQty > 0 ? ((ruleAcceptDefectQty / ruleSampleQty) * 100).toFixed(2) : 0}% Defect ยินยอม
                  </p>
                </div>
              </div>

              <div className="flex-none shrink-0 relative z-20 px-5 py-3.5 sm:px-7 sm:py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl sm:rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-normal text-sm rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveRule}
                  className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white font-normal text-sm rounded-xl shadow-lg shadow-sky-600/25 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  💾 บันทึกเกณฑ์สุ่มตรวจ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
