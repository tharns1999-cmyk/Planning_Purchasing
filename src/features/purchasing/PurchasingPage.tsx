import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  ArrowLeft,
  PackageCheck,
  AlertTriangle,
  BarChart3,
  Sliders,
  Pin,
  PinOff,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { RMReceivingModule } from './receiving/RMReceivingModule';
import { IssueLogModule, PrefillIssueData } from './issuelog/IssueLogModule';
import { PurchasingAnalyticsDashboard } from './analytics/PurchasingAnalyticsDashboard';
import { PurchasingMasterDataModule } from './master/PurchasingMasterDataModule';
import {
  ReceivingRecord,
  IssueLogRecord,
  Supplier,
  RMItem,
  DefectRule,
  
} from '@/services/DefectMatrixService';
import { PurchasingGasService } from '@/services/PurchasingGasService';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PurchasingErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PurchasingErrorBoundary] Caught exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4 my-8">
          <div className="inline-flex p-3 rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-rose-900">เกิดข้อผิดพลาดในการแสดงผลระบบจัดซื้อ</h3>
          <p className="text-sm text-rose-700 max-w-lg mx-auto font-mono bg-white p-3 rounded-lg border border-rose-200 text-left overflow-x-auto">
            {this.state.error?.toString() || 'Unknown Error'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-all"
            >
              🔄 โหลดหน้าเว็บใหม่
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const PurchasingPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation Sidebar States
  const [activeTab, setActiveTab] = useState<'receiving' | 'issuelog' | 'analytics' | 'master'>(
    'receiving'
  );
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);

  const isExpanded = isSidebarPinned || isSidebarHovered;
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Master Dynamic Data States
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rmItems, setRmItems] = useState<RMItem[]>([]);
  const [defectMatrix, setDefectMatrix] = useState<Record<string, DefectRule[]>>({});

  // Transaction States
  const [receivingRecords, setReceivingRecords] = useState<ReceivingRecord[]>([]);
  const [issueLogs, setIssueLogs] = useState<IssueLogRecord[]>([]);

  // Load Purchasing Data from GAS / LocalStorage on mount
  useEffect(() => {
    PurchasingGasService.loadPurchasingData().then((data) => {
      setSuppliers(data.suppliers || []);
      setRmItems(data.rmItems || []);
      if (data.defectMatrix && Object.keys(data.defectMatrix).length > 0) {
        setDefectMatrix(data.defectMatrix);
      }
      setReceivingRecords(data.receivingRecords || []);
      setIssueLogs(data.issueLogs || []);
    });
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await PurchasingGasService.loadPurchasingData();
      setSuppliers(data.suppliers || []);
      setRmItems(data.rmItems || []);
      if (data.defectMatrix && Object.keys(data.defectMatrix).length > 0) {
        setDefectMatrix(data.defectMatrix);
      }
      setReceivingRecords(data.receivingRecords || []);
      setIssueLogs(data.issueLogs || []);
    } catch (err) {
      console.error('Failed to refresh data', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto Issue Log Modal State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);
  const [prefillData, setPrefillData] = useState<PrefillIssueData | null>(null);

  // KPI Computations
  const openIssuesCount = issueLogs.filter((i) => i.status !== 'Resolved').length;

  // Handlers
  const handleAddReceivingRecord = (record: ReceivingRecord) => {
    setReceivingRecords((prev) => [record, ...prev]);
    PurchasingGasService.saveReceivingRecord(record);
  };

  const handleUpdateReceivingRecord = (updatedRecord: ReceivingRecord) => {
    setReceivingRecords((prev) =>
      prev.map((item) => (item.id === updatedRecord.id ? updatedRecord : item))
    );
    PurchasingGasService.saveReceivingRecord(updatedRecord);
  };

  const handleDeleteReceivingRecord = (id: string) => {
    setReceivingRecords((prev) => prev.filter((item) => item.id !== id));
    PurchasingGasService.deleteReceivingRecord(id);
  };

  const handleAddIssueLogRecord = (record: IssueLogRecord) => {
    setIssueLogs((prev) => [record, ...prev]);
    PurchasingGasService.saveIssueLogRecord(record);
  };

  const handleUpdateIssueLogStatus = (
    id: string,
    newStatus: 'Open' | 'In Progress' | 'Resolved'
  ) => {
    setIssueLogs((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item));
      const target = updated.find((i) => i.id === id);
      if (target) PurchasingGasService.saveIssueLogRecord(target);
      return updated;
    });
  };

  const handleUpdateIssueLogRecord = (updatedRecord: IssueLogRecord) => {
    setIssueLogs((prev) =>
      prev.map((item) => (item.id === updatedRecord.id ? updatedRecord : item))
    );
    PurchasingGasService.saveIssueLogRecord(updatedRecord);
  };

  const handleDeleteIssueLogRecord = (id: string) => {
    const issueToDelete = issueLogs.find((i) => i.id === id);
    if (issueToDelete && issueToDelete.receivingRecordId) {
      setReceivingRecords((prev) =>
        prev.map((r) =>
          r.id === issueToDelete.receivingRecordId ? { ...r, hasIssueLog: false } : r
        )
      );
    }
    setIssueLogs((prev) => prev.filter((item) => item.id !== id));
    PurchasingGasService.deleteIssueLogRecord(id);
  };

  const handleAddSupplier = (newSup: Supplier) => {
    setSuppliers((prev) => [...prev, newSup]);
    PurchasingGasService.saveSupplier(newSup);
  };

  const handleUpdateSupplier = (updatedSup: Supplier) => {
    setSuppliers((prev) => {
      const exists = prev.some((s) => s.id === updatedSup.id);
      if (exists) {
        return prev.map((s) => (s.id === updatedSup.id ? updatedSup : s));
      }
      return [...prev, updatedSup];
    });
    PurchasingGasService.saveSupplier(updatedSup);
  };

  const handleDeleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    PurchasingGasService.deleteSupplier(id);
  };

  const handleAddRMItem = (newRm: RMItem) => {
    setRmItems((prev) => [...prev, newRm]);
    PurchasingGasService.saveRMItem(newRm);
  };

  const handleUpdateRMItem = (updatedRm: RMItem) => {
    setRmItems((prev) => prev.map((r) => (r.id === updatedRm.id ? updatedRm : r)));
    PurchasingGasService.saveRMItem(updatedRm);
  };

  const handleDeleteRMItem = (id: string) => {
    setRmItems((prev) => prev.filter((r) => r.id !== id));
    PurchasingGasService.deleteRMItem(id);
  };

  const handleUpdateDefectMatrix = (updatedMatrix: Record<string, DefectRule[]>) => {
    setDefectMatrix(updatedMatrix);
    PurchasingGasService.saveDefectMatrix(updatedMatrix);
  };

  const handleOpenIssueModal = (data: PrefillIssueData) => {
    setPrefillData(data);
    setIsIssueModalOpen(true);
    setActiveTab('issuelog');
  };

  const handleOpenManualIssueModal = () => {
    setPrefillData(null);
    setIsIssueModalOpen(true);
    setActiveTab('issuelog');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex relative font-sarabun">
      {/* ------------------------------------------------------------- */}
      {/* HOVERABLE COLLAPSIBLE SIDEBAR NAVIGATION (Desktop) */}
      {/* ------------------------------------------------------------- */}
      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`hidden md:flex fixed left-0 top-0 bottom-0 z-40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white shadow-2xl transition-all duration-300 ease-in-out flex-col justify-between overflow-hidden border-r border-slate-800 ${
          isExpanded ? 'w-64' : 'w-16'
        }`}
      >
        {/* Sidebar Top Header & Brand */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white flex items-center justify-center shadow-lg shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              {isExpanded && (
                <div className="whitespace-nowrap transition-opacity duration-200">
                  <h1 className="text-base font-normal text-white tracking-wide">
                    Purchasing System
                  </h1>
                  <span className="text-sm font-normal text-emerald-400 block">
                    RM & QC Management
                  </span>
                </div>
              )}
            </div>

            {/* Pin Sidebar Toggle Button (Visible when expanded) */}
            {isExpanded && (
              <button
                type="button"
                onClick={() => setIsSidebarPinned(!isSidebarPinned)}
                className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ${
                  isSidebarPinned ? 'text-emerald-400 bg-slate-800/80' : ''
                }`}
                title={isSidebarPinned ? 'ปลดปักหมุด Sidebar' : 'ปักหมุดตรึง Sidebar'}
              >
                {isSidebarPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Navigation Menu Links */}
          <nav className="p-2 space-y-1.5 mt-2">
            {/* 1. RM Receiving */}
            <button
              type="button"
              onClick={() => setActiveTab('receiving')}
              className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl font-normal text-sm transition-all cursor-pointer relative group ${
                activeTab === 'receiving'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="📦 บันทึกการรับเข้าวัตถุดิบ (RM Receiving)"
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <PackageCheck className={`w-5 h-5 ${activeTab === 'receiving' ? 'text-white' : 'text-emerald-400'}`} />
              </div>
              {isExpanded && (
                <div className="text-left whitespace-nowrap overflow-hidden transition-all duration-200">
                  <p className="text-sm font-normal leading-none">บันทึกรับเข้าวัตถุดิบ</p>
                  <p className="text-sm font-normal text-slate-300 mt-1">RM Receiving & Inspection</p>
                </div>
              )}
              {activeTab === 'receiving' && !isExpanded && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-400 rounded-l-full" />
              )}
            </button>

            {/* 2. QC Issue Log */}
            <button
              type="button"
              onClick={() => setActiveTab('issuelog')}
              className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl font-normal text-sm transition-all cursor-pointer relative group ${
                activeTab === 'issuelog'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="🚨 ทะเบียนติดตามปัญหาคุณภาพ (QC Issue Log)"
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0 relative">
                <AlertTriangle className={`w-5 h-5 ${activeTab === 'issuelog' ? 'text-white' : 'text-rose-400'}`} />
                {openIssuesCount > 0 && !isExpanded && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                )}
              </div>
              {isExpanded && (
                <div className="text-left whitespace-nowrap overflow-hidden flex-1 flex items-center justify-between transition-all duration-200">
                  <div>
                    <p className="text-sm font-normal leading-none">ทะเบียนปัญหาคุณภาพ</p>
                    <p className="text-sm font-normal text-slate-300 mt-1">QC Issue Log & Action</p>
                  </div>
                  {openIssuesCount > 0 && (
                    <span className="px-2 py-0.5 text-sm bg-rose-500 text-white font-normal rounded-full animate-pulse">
                      {openIssuesCount}
                    </span>
                  )}
                </div>
              )}
              {activeTab === 'issuelog' && !isExpanded && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-rose-400 rounded-l-full" />
              )}
            </button>

            {/* 3. Analytics & Insights */}
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl font-normal text-sm transition-all cursor-pointer relative group ${
                activeTab === 'analytics'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="📊 วิเคราะห์และสรุปผลคุณภาพ (Analytics)"
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <BarChart3 className={`w-5 h-5 ${activeTab === 'analytics' ? 'text-white' : 'text-sky-400'}`} />
              </div>
              {isExpanded && (
                <div className="text-left whitespace-nowrap overflow-hidden transition-all duration-200">
                  <p className="text-sm font-normal leading-none">วิเคราะห์สรุปผลคุณภาพ</p>
                  <p className="text-sm font-normal text-slate-300 mt-1">Analytics & Dashboard</p>
                </div>
              )}
              {activeTab === 'analytics' && !isExpanded && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sky-400 rounded-l-full" />
              )}
            </button>

            {/* 4. Master Data & QC Matrix */}
            <button
              type="button"
              onClick={() => setActiveTab('master')}
              className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl font-normal text-sm transition-all cursor-pointer relative group ${
                activeTab === 'master'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="⚙️ Master Data & QC Matrix"
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <Sliders className={`w-5 h-5 ${activeTab === 'master' ? 'text-white' : 'text-purple-400'}`} />
              </div>
              {isExpanded && (
                <div className="text-left whitespace-nowrap overflow-hidden transition-all duration-200">
                  <p className="text-sm font-normal leading-none">ข้อมูลหลัก & QC Matrix</p>
                  <p className="text-sm font-normal text-slate-300 mt-1">Master Data & Rules</p>
                </div>
              )}
              {activeTab === 'master' && !isExpanded && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-400 rounded-l-full" />
              )}
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Footer: Back to Portal */}
        <div className="p-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => navigate('/portal')}
            className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
            title="กลับหน้าหลัก Portal"
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </div>
            {isExpanded && (
              <span className="text-sm font-normal whitespace-nowrap">
                กลับสู่หน้า พอร์ทัล
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT WRAPPER WITH DYNAMIC PADDING */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out flex flex-col min-h-screen pb-16 md:pb-0 ${
          isExpanded ? 'md:pl-64' : 'md:pl-16'
        }`}
      >
        {/* Top Header */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50 shadow-xs">
          <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base sm:text-lg font-normal text-slate-900 leading-tight">
                    ระบบรับเข้าวัตถุดิบและติดตามปัญหา (Purchasing)
                  </h1>
                  <span className="text-sm font-normal px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                    SD-PC-03 R01
                  </span>
                </div>
                <p className="text-sm sm:text-sm text-slate-500 mt-1 sm:mt-0 line-clamp-1 sm:line-clamp-none">
                  {activeTab === 'receiving'
                    ? 'บันทึกการลงรับวัตถุดิบและสุ่มตรวจคุณภาพสินค้าตามเกณฑ์ Matrix'
                    : activeTab === 'issuelog'
                    ? 'ทะเบียนติดตามเคสปัญหาคุณภาพ มาตรการแก้ไข และสถานะดำเนินการ'
                    : activeTab === 'analytics'
                    ? 'รายงานวิเคราะห์สรุปผลคุณภาพ supplier ranking และ defect causes'
                    : 'ตั้งค่า Master Data Supplier วัตถุดิบ และเกณฑ์การสุ่มตรวจ'}
                </p>
              </div>
            </div>

            {/* Current Active Module Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-normal px-3 py-1 rounded-xl shadow-2xs border ${
                  activeTab === 'receiving'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : activeTab === 'issuelog'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : activeTab === 'analytics'
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}
              >
                {activeTab === 'receiving'
                  ? '📦 RM Receiving'
                  : activeTab === 'issuelog'
                  ? '🚨 QC Issue Log'
                  : activeTab === 'analytics'
                  ? '📊 Analytics & Insights'
                  : '⚙️ Master Data & Matrix'}
              </span>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="รีเฟรชข้อมูล"
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl shadow-2xs border transition-all cursor-pointer ${
                  isRefreshing 
                    ? 'bg-sky-50 text-sky-400 border-sky-100 cursor-not-allowed' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-sky-700 hover:border-slate-300 hover:shadow-sm'
                }`}
                title="โหลดข้อมูลล่าสุด"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline font-normal text-sm">รีเฟรช</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-2 sm:p-4 lg:p-4 w-full transition-all duration-300">
          <PurchasingErrorBoundary>
            {activeTab === 'receiving' && (
              <RMReceivingModule
                receivingRecords={receivingRecords}
                onAddReceivingRecord={handleAddReceivingRecord}
                onUpdateReceivingRecord={handleUpdateReceivingRecord}
                onDeleteReceivingRecord={handleDeleteReceivingRecord}
                onOpenIssueLogModal={handleOpenIssueModal}
                suppliers={suppliers}
                rmItems={rmItems}
                defectMatrix={defectMatrix}
              />
            )}

            {activeTab === 'issuelog' && (
              <IssueLogModule
                issueLogRecords={issueLogs}
                suppliers={suppliers}
                rmItems={rmItems}
                onAddIssueLogRecord={handleAddIssueLogRecord}
                onUpdateIssueLogStatus={handleUpdateIssueLogStatus}
                onUpdateIssueLogRecord={handleUpdateIssueLogRecord}
                onDeleteIssueLogRecord={handleDeleteIssueLogRecord}
                isModalOpen={isIssueModalOpen}
                onCloseModal={() => setIsIssueModalOpen(false)}
                onOpenManualModal={handleOpenManualIssueModal}
                prefillData={prefillData}
              />
            )}

            {activeTab === 'analytics' && (
              <PurchasingAnalyticsDashboard
                receivingRecords={receivingRecords}
                issueLogs={issueLogs}
                suppliers={suppliers}
                rmItems={rmItems}
              />
            )}

            {activeTab === 'master' && (
              <PurchasingMasterDataModule
                suppliers={suppliers}
                onAddSupplier={handleAddSupplier}
                onUpdateSupplier={handleUpdateSupplier}
                onDeleteSupplier={handleDeleteSupplier}
                rmItems={rmItems}
                onAddRMItem={handleAddRMItem}
                onUpdateRMItem={handleUpdateRMItem}
                onDeleteRMItem={handleDeleteRMItem}
                defectMatrix={defectMatrix}
                onUpdateDefectMatrix={handleUpdateDefectMatrix}
              />
            )}
          </PurchasingErrorBoundary>
        </main>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE BOTTOM NAVIGATION (Phones & Tablets) */}
      {/* ------------------------------------------------------------- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-safe flex items-center justify-around px-2">
        <button
          onClick={() => setActiveTab('receiving')}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 space-y-1 transition-colors ${
            activeTab === 'receiving' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <PackageCheck className={`w-5 h-5 ${activeTab === 'receiving' ? 'fill-emerald-100' : ''}`} />
          <span className="text-sm font-normal">รับเข้า RM</span>
        </button>
        <button
          onClick={() => setActiveTab('issuelog')}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 space-y-1 transition-colors relative ${
            activeTab === 'issuelog' ? 'text-rose-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className={`w-5 h-5 ${activeTab === 'issuelog' ? 'fill-rose-100' : ''}`} />
          <span className="text-sm font-normal">Issue Log</span>
          {openIssuesCount > 0 && (
            <span className="absolute top-1.5 right-1/4 w-2 h-2 bg-rose-500 rounded-full border border-white" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 space-y-1 transition-colors ${
            activeTab === 'analytics' ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${activeTab === 'analytics' ? 'fill-sky-100' : ''}`} />
          <span className="text-sm font-normal">สรุปผล</span>
        </button>
        <button
          onClick={() => setActiveTab('master')}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 space-y-1 transition-colors ${
            activeTab === 'master' ? 'text-purple-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className={`w-5 h-5 ${activeTab === 'master' ? 'fill-purple-100' : ''}`} />
          <span className="text-sm font-normal">ตั้งค่า</span>
        </button>
      </nav>
    </div>
  );
};
