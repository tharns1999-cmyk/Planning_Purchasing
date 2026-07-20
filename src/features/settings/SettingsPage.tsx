import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Layers,
  ShoppingBag,
  ListOrdered,
  ChefHat,
  CalendarDays,
  LayoutList,
  CheckSquare,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { plannerRepository } from '@/services/plannerService';
import { DatabaseSchema, DatabaseEntities } from '@/services/databaseSchema';
import { formatDateISO } from '@/domain/calculations';

export const SettingsPage: React.FC = () => {
  const [snapshot, setSnapshot] = useState<DatabaseSchema | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Import State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<DatabaseSchema | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Reset State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');

  const loadSnapshot = () => {
    try {
      plannerRepository.initialize();
      const snap = plannerRepository.getSnapshot();
      setSnapshot(snap);
    } catch (err) {
      console.error('Failed to load snapshot:', err);
      setError('ไม่สามารถโหลดข้อมูลสแนปชอตได้');
    }
  };

  useEffect(() => {
    loadSnapshot();
  }, []);

  // 1. Export Data Handler
  const handleExportData = () => {
    try {
      plannerRepository.initialize();
      const snap = plannerRepository.getSnapshot();
      const jsonString = JSON.stringify(snap, null, 2);

      const todayIso = formatDateISO(new Date());
      const fileName = `planning-backup-${todayIso}.json`;

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setNotice(`ส่งออกข้อมูลเรียบร้อยแล้ว: ${fileName}`);
      setError(null);
    } catch (err) {
      console.error('Failed to export data:', err);
      setError('ไม่สามารถส่งออกข้อมูลได้');
    }
  };

  // 2. Import Data Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImportError(null);
    setPreviewData(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object' || !parsed.entities) {
          setImportError('รูปแบบไฟล์ JSON ไม่ถูกต้อง ไม่พบโครงสร้างส่วน entities');
          return;
        }

        const requiredKeys: (keyof DatabaseEntities)[] = [
          'rooms',
          'salesOrders',
          'salesOrderLines',
          'wipPrepItems',
          'weeklyPlans',
          'planAllocations',
          'productionActualEntries',
          'boardNotes',
        ];

        const missing = requiredKeys.filter((k) => !Array.isArray(parsed.entities[k]));
        if (missing.length > 0) {
          setImportError(`ไฟล์ขาดโครงสร้างข้อมูลหลัก: ${missing.join(', ')}`);
          return;
        }

        setPreviewData(parsed as DatabaseSchema);
      } catch {
        setImportError('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าเป็นไฟล์ JSON ที่ถูกต้อง');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!previewData) return;

    const res = plannerRepository.importDatabase(previewData);
    if (res.success) {
      setNotice('นำเข้าข้อมูลสำเร็จแล้ว');
      setError(null);
      setSelectedFile(null);
      setPreviewData(null);
      setIsImportModalOpen(false);
      loadSnapshot();
    } else {
      setError(res.errors?.[0] || 'การนำเข้าข้อมูลล้มเหลว');
      setIsImportModalOpen(false);
    }
  };

  // 3. Reset Data Handlers
  const handleConfirmReset = () => {
    if (resetConfirmInput !== 'RESET') {
      return;
    }

    try {
      plannerRepository.reset();
      setNotice('ล้างข้อมูลและเริ่มต้นใหม่เรียบร้อยแล้ว');
      setError(null);
      setResetConfirmInput('');
      setIsResetModalOpen(false);
      loadSnapshot();
    } catch (err) {
      console.error('Failed to reset repository:', err);
      setError('ไม่สามารถรีเซ็ตข้อมูลได้');
      setIsResetModalOpen(false);
    }
  };

  const entities = snapshot?.entities;

  const entityCounts = [
    { label: 'ห้องผลิต (Rooms)', count: entities?.rooms?.length || 0, icon: Layers, color: 'text-sky-600 bg-sky-50' },
    { label: 'Sales Orders', count: entities?.salesOrders?.length || 0, icon: ShoppingBag, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Sales Order Lines', count: entities?.salesOrderLines?.length || 0, icon: ListOrdered, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'WIP/PREP Items', count: entities?.wipPrepItems?.length || 0, icon: ChefHat, color: 'text-amber-600 bg-amber-50' },
    { label: 'Weekly Plans', count: entities?.weeklyPlans?.length || 0, icon: CalendarDays, color: 'text-purple-600 bg-purple-50' },
    { label: 'Plan Allocations', count: entities?.planAllocations?.length || 0, icon: LayoutList, color: 'text-blue-600 bg-blue-50' },
    { label: 'Actual Entries', count: entities?.productionActualEntries?.length || 0, icon: CheckSquare, color: 'text-rose-600 bg-rose-50' },
    { label: 'Board Notes', count: entities?.boardNotes?.length || 0, icon: StickyNote, color: 'text-teal-600 bg-teal-50' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-sky-600" />
            <span>เครื่องมือข้อมูล (Data Tools)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            จัดการสำรองข้อมูล นำเข้า ล้างข้อมูล และตรวจสอบสถานะข้อมูลสำหรับช่วง Prototype / LocalStorage
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-900 font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900 font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Section 1: Data Summary Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Layers className="w-4 h-4 text-slate-500" />
          <span>สรุปจำนวนข้อมูลปัจจุบัน (Data Summary)</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {entityCounts.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-lg flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.color} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-extrabold text-slate-900">{item.count}</div>
                  <div className="text-[11px] text-slate-500 font-medium truncate">{item.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Export / Import / Reset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Export Data */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">1. ส่งออกข้อมูล (Export Data)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              สำรองข้อมูลระบบทั้งหมดจาก `getSnapshot()` ออกมาเป็นไฟล์ `.json` เพื่อนำไปจัดเก็บหรือย้ายไปเครื่องอื่น
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportData}
          >
            ส่งออกข้อมูล JSON
          </Button>
        </div>

        {/* Card 2: Import Data */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">2. นำเข้าข้อมูล (Import Data)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              อัปโหลดไฟล์ `.json` เพื่อนำเข้าข้อมูลแทนที่ข้อมูลปัจจุบัน (มีการตรวจสอบ Schema ครบทั้ง 8 Entity ก่อนการนำเข้า)
            </p>

            <div className="space-y-2">
              <label htmlFor="import-json-file" className="block text-xs font-semibold text-slate-700">เลือกไฟล์สำรองข้อมูล (.json)</label>
              <input
                id="import-json-file"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
            </div>

            {importError && (
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-lg">
                {importError}
              </div>
            )}

            {previewData && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1">
                  <FileJson className="w-3.5 h-3.5 text-sky-600" />
                  <span>พรีวิวรายการที่จะนำเข้า:</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                  <div>ห้องผลิต: <strong>{previewData.entities.rooms?.length || 0}</strong></div>
                  <div>Sales Orders: <strong>{previewData.entities.salesOrders?.length || 0}</strong></div>
                  <div>Sales Order Lines: <strong>{previewData.entities.salesOrderLines?.length || 0}</strong></div>
                  <div>WIP/PREP: <strong>{previewData.entities.wipPrepItems?.length || 0}</strong></div>
                  <div>Weekly Plans: <strong>{previewData.entities.weeklyPlans?.length || 0}</strong></div>
                  <div>Allocations: <strong>{previewData.entities.planAllocations?.length || 0}</strong></div>
                  <div>Actual Entries: <strong>{previewData.entities.productionActualEntries?.length || 0}</strong></div>
                  <div>Board Notes: <strong>{previewData.entities.boardNotes?.length || 0}</strong></div>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="primary"
            size="md"
            disabled={!previewData || Boolean(importError)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setIsImportModalOpen(true)}
          >
            นำเข้าข้อมูล
          </Button>
        </div>

        {/* Card 3: Reset Data */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">3. ล้างข้อมูล (Reset Data)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              รีเซ็ตข้อมูลระบบทั้งหมดกลับเป็นค่าเริ่มต้น (Seed Data) ข้อมูลแผนและการวางแผนทั้งหมดจะถูกลบทิ้ง
            </p>
          </div>

          <Button
            variant="danger"
            size="md"
            className="w-full"
            leftIcon={<RotateCcw className="w-4 h-4" />}
            onClick={() => {
              setResetConfirmInput('');
              setIsResetModalOpen(true);
            }}
          >
            ล้างข้อมูลและเริ่มใหม่
          </Button>
        </div>
      </div>

      {/* Modal: Confirm Import */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="ยืนยันการนำเข้าข้อมูล"
        maxWidth="md"
        footer={
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirmImport}>
              ยืนยันการนำเข้า
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            คุณกำลังจะนำเข้าข้อมูลจากไฟล์ <strong>{selectedFile?.name}</strong> ข้อมูลในระบบปัจจุบันจะถูกแทนที่ด้วยข้อมูลชุดนี้ทั้งหมด
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>คำเตือน: การนำเข้าข้อมูลไม่สามารถย้อนกลับได้ กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ</span>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirm Reset */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="ยืนยันการล้างข้อมูลและเริ่มใหม่"
        maxWidth="md"
        footer={
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsResetModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={resetConfirmInput !== 'RESET'}
              onClick={handleConfirmReset}
            >
              ยืนยันการล้างข้อมูล
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            การล้างข้อมูลจะทำการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้น (Seed Data) ข้อมูลแผน รายการวางแผน และผลผลิตจริงจะถูกลบทิ้งทั้งหมด
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>การกระทำนี้ไม่สามารถย้อนกลับได้ กรุณาพิมพ์คำว่า <strong>RESET</strong> เพื่อยืนยัน</span>
          </div>
          <div>
            <label htmlFor="confirm-reset-text" className="block text-xs font-semibold text-slate-700 mb-1">พิมพ์คำว่า RESET เพื่อยืนยัน *</label>
            <Input
              id="confirm-reset-text"
              type="text"
              placeholder="พิมพ์ RESET"
              value={resetConfirmInput}
              onChange={(e) => setResetConfirmInput(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
