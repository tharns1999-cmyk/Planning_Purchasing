import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Award,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Calendar,
  Scale,
  PieChart as PieIcon,
  Layers,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TablePagination } from '@/components/ui/TablePagination';
import { AutocompleteSelect, SelectOption } from '@/components/ui/AutocompleteSelect';
import {
  ReceivingRecord,
  IssueLogRecord,
  DEFECT_CATEGORIES,
  exportToCSV,
  Supplier,
  RMItem
} from '@/services/DefectMatrixService';

interface PurchasingAnalyticsDashboardProps {
  receivingRecords: ReceivingRecord[];
  issueLogs: IssueLogRecord[];
  suppliers?: Supplier[];
  rmItems?: RMItem[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'สิ่งแปลกปลอม / สิ่งปนเปื้อน (Foreign Matters / Pests)': '#ef4444',
  'คุณภาพเสื่อมสภาพ / สดไม่ได้มาตรฐาน (Degradation / Freshness)': '#f59e0b',
  'ขนาด / สเปกไม่ได้มาตรฐาน (Non-conformance / Off-Spec)': '#3b82f6',
  'บรรจุภัณฑ์และการขนส่ง (Packaging & Transport Issues)': '#06b6d4',
  'อื่น ๆ (Others)': '#8b5cf6',
};

export const PurchasingAnalyticsDashboard: React.FC<PurchasingAnalyticsDashboardProps> = ({
  receivingRecords,
  issueLogs,
  suppliers = [],
  rmItems = [],
}) => {

  // -------------------------------------------------------------
  // Date Range Filter States & Presets
  // -------------------------------------------------------------
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeDatePreset, setActiveDatePreset] = useState<'ALL' | 'THIS_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR'>('ALL');

  // Table Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedRmFilter, setSelectedRmFilter] = useState<string>('ALL');

  // Filter base records by Date Range to determine available dropdown options
  const dateFilteredRecords = useMemo(() => {
    return receivingRecords.filter((rec) => {
      if (startDate && rec.receiveDate < startDate) return false;
      if (endDate && rec.receiveDate > endDate) return false;
      return true;
    });
  }, [receivingRecords, startDate, endDate]);

  const supplierFilterOptions: SelectOption[] = useMemo(() => {
    const activeSupplierIds = new Set(dateFilteredRecords.map((r) => r.supplierId));
    return [
      { value: 'ALL', label: 'Supplier ทั้งหมด' },
      ...suppliers
        .filter((s) => activeSupplierIds.has(s.id))
        .map((s) => ({
          value: s.id,
          label: s.name,
          badge: s.code,
        })),
    ];
  }, [suppliers, dateFilteredRecords]);

  const categoryFilterOptions: SelectOption[] = useMemo(() => {
    const defaultCats = [{ value: 'ALL', label: 'ทุกหมวดหมู่ RM' }];
    const uniqueCats = new Map<string, string>();
    const activeCategories = new Set(dateFilteredRecords.map((r) => r.rmCategory).filter(Boolean));
    
    (rmItems || []).forEach(rm => {
      if (rm.category && activeCategories.has(rm.category)) {
        uniqueCats.set(rm.category, rm.categoryLabel || rm.category);
      }
    });
    
    const dynamicOptions = Array.from(uniqueCats.entries()).map(([val, lbl]) => ({
      value: val,
      label: lbl,
    }));
    
    return [...defaultCats, ...dynamicOptions];
  }, [rmItems, dateFilteredRecords]);

  const rmFilterOptions: SelectOption[] = useMemo(() => {
    const activeRmIds = new Set(dateFilteredRecords.map((r) => r.rmId));
    return [
      { value: 'ALL', label: 'วัตถุดิบทั้งหมด' },
      ...rmItems
        .filter((rm) => activeRmIds.has(rm.id))
        .map((rm) => ({
          value: rm.id,
          label: rm.name,
          badge: rm.category,
        })),
    ];
  }, [rmItems, dateFilteredRecords]);

  const statusFilterOptions: SelectOption[] = [
    { value: 'ALL', label: 'ทุกผลตรวจ' },
    { value: 'PASS', label: 'PASS เท่านั้น' },
    { value: 'FAIL', label: 'FAIL เท่านั้น' },
  ];

  const handleDatePresetChange = (preset: 'ALL' | 'THIS_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR') => {
    setActiveDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0] || '';

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0] || '';
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'LAST_3_MONTHS') {
      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().split('T')[0] || '';
      setStartDate(threeMonthsAgo);
      setEndDate(todayStr);
    } else if (preset === 'THIS_YEAR') {
      const firstDayYear = `${today.getFullYear()}-01-01`;
      setStartDate(firstDayYear);
      setEndDate(todayStr);
    }
  };

  // Filtered master records by Date Range & Dropdown Filters
  const globalFilteredReceivingRecords = useMemo(() => {
    return receivingRecords.filter((rec) => {
      if (startDate && rec.receiveDate < startDate) return false;
      if (endDate && rec.receiveDate > endDate) return false;
      if (selectedSupplierFilter !== 'ALL' && rec.supplierId !== selectedSupplierFilter) return false;
      if (selectedRmFilter !== 'ALL' && rec.rmId !== selectedRmFilter) return false;
      if (selectedCategoryFilter !== 'ALL' && rec.rmCategory !== selectedCategoryFilter) return false;
      if (selectedStatusFilter === 'PASS' && !rec.isPass) return false;
      if (selectedStatusFilter === 'FAIL' && rec.isPass) return false;
      return true;
    });
  }, [receivingRecords, startDate, endDate, selectedSupplierFilter, selectedRmFilter, selectedCategoryFilter, selectedStatusFilter]);

  const globalFilteredIssueLogs = useMemo(() => {
    return issueLogs.filter((issue) => {
      if (startDate && issue.issueDate < startDate) return false;
      if (endDate && issue.issueDate > endDate) return false;
      if (selectedSupplierFilter !== 'ALL' && issue.supplierId !== selectedSupplierFilter) return false;
      if (selectedRmFilter !== 'ALL' && issue.rmId !== selectedRmFilter) return false;
      return true;
    });
  }, [issueLogs, startDate, endDate, selectedSupplierFilter, selectedRmFilter]);

  // -------------------------------------------------------------
  // 1. KPI Calculations (Filtered by Global Filters)
  // -------------------------------------------------------------
  const totalVolumeKg = useMemo(
    () => globalFilteredReceivingRecords.reduce((sum, r) => sum + r.receiveQty, 0),
    [globalFilteredReceivingRecords]
  );
  const totalBills = globalFilteredReceivingRecords.length;

  const passCount = useMemo(
    () => globalFilteredReceivingRecords.filter((r) => r.isPass).length,
    [globalFilteredReceivingRecords]
  );
  const failCount = useMemo(
    () => globalFilteredReceivingRecords.filter((r) => !r.isPass).length,
    [globalFilteredReceivingRecords]
  );

  const overallPassRate = useMemo(
    () => (totalBills > 0 ? ((passCount / totalBills) * 100).toFixed(1) : '100'),
    [totalBills, passCount]
  );

  const totalPostProdDefectKg = useMemo(
    () => globalFilteredReceivingRecords.reduce((sum, r) => sum + (r.postProductionDefectQty || 0), 0),
    [globalFilteredReceivingRecords]
  );

  const activeIssuesCount = useMemo(
    () => globalFilteredIssueLogs.filter((i) => i.status !== 'Resolved').length,
    [globalFilteredIssueLogs]
  );

  // -------------------------------------------------------------
  // 2. Data Preparation for Charts (Filtered by Date Range)
  // -------------------------------------------------------------

  // Helper: Format date to Thai Month & Year (e.g. "ก.ค. 26")
  const getMonthYearLabel = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const month = thaiMonths[d.getMonth()];
    const yr = (d.getFullYear() + 543).toString().slice(-2);
    return `${month} ${yr}`;
  };

  // A. Monthly Quality Trend Data (Dynamic from Date-filtered records)
  const monthlyTrendData = useMemo(() => {
    if (globalFilteredReceivingRecords.length === 0) return [];

    const monthMap: Record<
      string,
      { month: string; totalBills: number; passBills: number; totalKg: number; postProdKg: number; timestamp: number }
    > = {};

    globalFilteredReceivingRecords.forEach((rec) => {
      const d = new Date(rec.receiveDate);
      const timestamp = isNaN(d.getTime()) ? 0 : d.getTime();
      const monthLabel = getMonthYearLabel(rec.receiveDate) || 'ไม่ระบุ';

      if (!monthMap[monthLabel]) {
        monthMap[monthLabel] = { month: monthLabel, totalBills: 0, passBills: 0, totalKg: 0, postProdKg: 0, timestamp };
      }
      const entry = monthMap[monthLabel]!;
      entry.totalBills += 1;
      if (rec.isPass) entry.passBills += 1;
      entry.totalKg += rec.receiveQty || 0;
      entry.postProdKg += rec.postProductionDefectQty || 0;
    });

    return Object.values(monthMap)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((m) => {
        const passRate = m.totalBills > 0 ? Number(((m.passBills / m.totalBills) * 100).toFixed(1)) : 0;
        const defectRate = Number((100 - passRate).toFixed(1));
        const postProdDefectRate = m.totalKg > 0 ? Number(((m.postProdKg / m.totalKg) * 100).toFixed(2)) : 0;
        return {
          month: m.month,
          passRate,
          defectRate,
          postProdDefectRate,
          totalKg: m.totalKg,
        };
      });
  }, [globalFilteredReceivingRecords]);

  // B. Supplier Defect Ranking Data (Only include suppliers with fail bills)
  const supplierRankingData = useMemo(() => {
    if (globalFilteredReceivingRecords.length === 0) return [];

    const supplierMap: Record<
      string,
      { name: string; totalBills: number; failBills: number; totalDefectKg: number; postProdKg: number }
    > = {};

    globalFilteredReceivingRecords.forEach((rec) => {
      if (!supplierMap[rec.supplierId]) {
        supplierMap[rec.supplierId] = {
          name: rec.supplierName || rec.supplierId,
          totalBills: 0,
          failBills: 0,
          totalDefectKg: 0,
          postProdKg: 0,
        };
      }
      const supEntry = supplierMap[rec.supplierId]!;
      supEntry.totalBills += 1;
      supEntry.totalDefectKg += rec.defectQty || 0;
      supEntry.postProdKg += rec.postProductionDefectQty || 0;
      if (!rec.isPass) {
        supEntry.failBills += 1;
      }
    });

    return Object.values(supplierMap)
      .filter((item) => item.totalBills > 0 && item.failBills > 0)
      .map((item) => ({
        supplier: item.name.length > 15 ? item.name.substring(0, 14) + '...' : item.name,
        fullName: item.name,
        failCount: item.failBills,
        defectKg: Number(item.totalDefectKg.toFixed(1)),
        postProdKg: Number(item.postProdKg.toFixed(1)),
        failRate: item.totalBills > 0 ? Number(((item.failBills / item.totalBills) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.failCount - a.failCount || b.postProdKg - a.postProdKg);
  }, [globalFilteredReceivingRecords]);

  // C. RM Category Breakdown Data (Only include categories with > 0 defect kg)
  const categoryBreakdownData = useMemo(() => {
    if (globalFilteredReceivingRecords.length === 0) return [];

    const catMap: Record<string, { name: string; defectKg: number; color: string }> = {};
    const fallbackColors = ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#3b82f6', '#ec4899'];
    let colorIdx = 0;

    (rmItems || []).forEach(rm => {
      if (rm.category && !catMap[rm.category]) {
        catMap[rm.category] = {
           name: rm.categoryLabel || rm.category,
           defectKg: 0,
           color: fallbackColors[colorIdx % fallbackColors.length] || '#000000'
        };
        colorIdx++;
      }
    });

    globalFilteredReceivingRecords.forEach((r) => {
      if (!catMap[r.rmCategory]) {
        catMap[r.rmCategory] = {
           name: r.rmCategory,
           defectKg: 0,
           color: fallbackColors[colorIdx % fallbackColors.length] || '#000000'
        };
        colorIdx++;
      }
      catMap[r.rmCategory]!.defectKg += r.defectQty || 0;
      catMap[r.rmCategory]!.defectKg += r.postProductionDefectQty || 0;
    });

    return Object.values(catMap)
      .map((data) => ({
        name: data.name,
        value: Number(data.defectKg.toFixed(1)),
        color: data.color
      }))
      .filter((item) => item.value > 0);
  }, [globalFilteredReceivingRecords, rmItems]);

  const defectCausesData = useMemo(() => {
    if (globalFilteredIssueLogs.length === 0 && globalFilteredReceivingRecords.filter((r) => !r.isPass).length === 0) {
      return [];
    }

    const categoryCounts: Record<string, { routineCases: number; escalatedCases: number; routineKg: number; escalatedKg: number }> = {};

    DEFECT_CATEGORIES.forEach((cat) => {
      categoryCounts[cat] = { routineCases: 0, escalatedCases: 0, routineKg: 0, escalatedKg: 0 };
    });

    globalFilteredIssueLogs.forEach((issue) => {
      const cat = issue.defectCategory || DEFECT_CATEGORIES[0];
      if (!categoryCounts[cat]) {
        categoryCounts[cat] = { routineCases: 0, escalatedCases: 0, routineKg: 0, escalatedKg: 0 };
      }
      const countEntry = categoryCounts[cat]!;
      countEntry.escalatedCases += 1;
      countEntry.escalatedKg += issue.problemQty || 0;
    });

    globalFilteredReceivingRecords
      .filter((r) => !r.isPass)
      .forEach((r) => {
        if (!r.hasIssueLog) {
          const remarkText = (r.remark || '').toLowerCase();
          let cat: string = DEFECT_CATEGORIES[0];
          if (remarkText.includes('แมลง') || remarkText.includes('ขี้หนู') || remarkText.includes('แปลกปลอม')) {
            cat = DEFECT_CATEGORIES[0];
          } else if (remarkText.includes('แก่') || remarkText.includes('เน่า') || remarkText.includes('สด')) {
            cat = DEFECT_CATEGORIES[1];
          } else if (remarkText.includes('spec') || remarkText.includes('ขนาด')) {
            cat = DEFECT_CATEGORIES[2];
          } else if (remarkText.includes('กลิ่น') || remarkText.includes('น้ำแข็ง') || remarkText.includes('ขนส่ง')) {
            cat = DEFECT_CATEGORIES[3];
          }
          if (!categoryCounts[cat]) {
            categoryCounts[cat] = { routineCases: 0, escalatedCases: 0, routineKg: 0, escalatedKg: 0 };
          }
          const countEntry = categoryCounts[cat]!;
          countEntry.routineCases += 1;
          countEntry.routineKg += r.defectQty || 0;
        }
      });

    const totalCountSum = Object.values(categoryCounts).reduce((sum, item) => sum + item.routineCases + item.escalatedCases, 0);

    return DEFECT_CATEGORIES.map((cat) => {
      const item = categoryCounts[cat] || { routineCases: 0, escalatedCases: 0, routineKg: 0, escalatedKg: 0 };
      const totalCases = item.routineCases + item.escalatedCases;
      const totalKg = item.routineKg + item.escalatedKg;
      const percent = totalCountSum > 0 ? Number(((totalCases / totalCountSum) * 100).toFixed(1)) : 0;
      let shortLabel = (cat || '').split('(')[0]?.trim() || '';
      if (shortLabel.length > 18) {
        shortLabel = shortLabel.substring(0, 16) + '...';
      }
      return {
        category: cat,
        shortLabel,
        totalCases,
        routineCases: item.routineCases,
        escalatedCases: item.escalatedCases,
        routineKg: Number(item.routineKg.toFixed(1)),
        escalatedKg: Number(item.escalatedKg.toFixed(1)),
        totalKg: Number(totalKg.toFixed(1)),
        percent,
        color: CATEGORY_COLORS[cat] || '#8b5cf6',
      };
    })
      .filter((item) => item.totalCases > 0)
      .sort((a, b) => b.totalCases - a.totalCases);
  }, [globalFilteredIssueLogs, globalFilteredReceivingRecords]);

  // Top Defect RM Items (New Bar Chart)
  const topDefectRmsData = useMemo(() => {
    if (globalFilteredReceivingRecords.length === 0) return [];
    
    const rmMap: Record<string, { name: string; failCount: number; postProdKg: number }> = {};
    
    globalFilteredReceivingRecords.forEach((r) => {
      if (!rmMap[r.rmId]) {
        rmMap[r.rmId] = { name: r.rmName, failCount: 0, postProdKg: 0 };
      }
      if (!r.isPass) {
        rmMap[r.rmId]!.failCount += 1;
      }
      if (r.postProductionDefectQty) {
        rmMap[r.rmId]!.postProdKg += r.postProductionDefectQty;
      }
    });
    
    return Object.values(rmMap)
      .filter(rm => rm.failCount > 0 || rm.postProdKg > 0)
      .sort((a, b) => b.failCount - a.failCount || b.postProdKg - a.postProdKg)
      .slice(0, 10);
  }, [globalFilteredReceivingRecords]);

  // -------------------------------------------------------------
  // 3. Filtered Data Table & Export
  // -------------------------------------------------------------
  const filteredRecords = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return (globalFilteredReceivingRecords || []).filter((rec) => {
      if (!rec) return false;
      const matchSearch =
        String(rec.billNo || '').toLowerCase().includes(q) ||
        String(rec.supplierName || '').toLowerCase().includes(q) ||
        String(rec.rmName || '').toLowerCase().includes(q);
      
      // Additional filters like Supplier, Status, RM, Category are already applied in globalFilteredReceivingRecords

      return matchSearch;
    });
  }, [globalFilteredReceivingRecords, searchQuery]);

  // Table Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSupplierFilter, selectedCategoryFilter, selectedStatusFilter, activeDatePreset]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedAnalyticsRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleExportCSV = () => {
    const exportData = filteredRecords.map((r) => ({
      'Bill No': r.billNo,
      'Receive Date': r.receiveDate,
      'Supplier': r.supplierName,
      'RM Name': r.rmName,
      'Category': r.rmCategory,
      'Receive Qty (kg)': r.receiveQty,
      'Sample Qty (kg)': r.sampleQty,
      'Defect Qty (kg)': r.defectQty,
      'Defect Percent (%)': r.defectPercent,
      'Inspection Result': r.isPass ? 'PASS' : 'FAIL',
      'Remark': r.remark || '',
    }));

    exportToCSV(`Purchasing_QC_Analytics_${new Date().toISOString().split('T')[0]}`, exportData);
  };

  return (
    <div className="space-y-8">
      {/* Date Range Filter Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-normal text-slate-900">
              ตัวกรองช่วงเวลาวิเคราะห์ (Date Range Filter)
            </h3>
            <p className="text-sm text-slate-500">
              เลือกช่วงเวลาเพื่อปรับเปลี่ยนข้อมูลสถิติตามต้องการ
            </p>
          </div>
        </div>

        {/* Date Inputs & Presets */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Quick Presets */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-sm font-normal">
            <button
              type="button"
              onClick={() => handleDatePresetChange('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeDatePreset === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-normal'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => handleDatePresetChange('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeDatePreset === 'THIS_MONTH'
                  ? 'bg-white text-slate-900 shadow-xs font-normal'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เดือนนี้
            </button>
            <button
              type="button"
              onClick={() => handleDatePresetChange('LAST_3_MONTHS')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeDatePreset === 'LAST_3_MONTHS'
                  ? 'bg-white text-slate-900 shadow-xs font-normal'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3 เดือนล่าสุด
            </button>
            <button
              type="button"
              onClick={() => handleDatePresetChange('THIS_YEAR')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeDatePreset === 'THIS_YEAR'
                  ? 'bg-white text-slate-900 shadow-xs font-normal'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ปีนี้
            </button>
          </div>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-sm">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActiveDatePreset('ALL');
              }}
              className="h-8 px-2 bg-white border border-slate-300 rounded-lg font-normal text-slate-800 focus:outline-none"
            />
            <span className="text-slate-400 font-normal">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActiveDatePreset('ALL');
              }}
              className="h-8 px-2 bg-white border border-slate-300 rounded-lg font-normal text-slate-800 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Global Dropdown Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto text-sm text-slate-500 font-normal">
          <Filter className="w-4 h-4 text-slate-400" /> ตัวกรองเพิ่มเติม:
        </div>
        <div className="flex-1 min-w-[200px]">
          <AutocompleteSelect
            options={supplierFilterOptions}
            value={selectedSupplierFilter}
            onChange={(val) => setSelectedSupplierFilter(val || 'ALL')}
            placeholder="Supplier ทั้งหมด"
            searchPlaceholder="พิมพ์ชื่อ Supplier..."
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <AutocompleteSelect
            options={rmFilterOptions}
            value={selectedRmFilter}
            onChange={(val) => setSelectedRmFilter(val || 'ALL')}
            placeholder="วัตถุดิบ (RM) ทั้งหมด"
            searchPlaceholder="พิมพ์ชื่อวัตถุดิบ..."
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <AutocompleteSelect
            options={categoryFilterOptions}
            value={selectedCategoryFilter}
            onChange={(val) => setSelectedCategoryFilter(val || 'ALL')}
            placeholder="ทุกหมวดหมู่ RM"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <AutocompleteSelect
            options={statusFilterOptions}
            value={selectedStatusFilter}
            onChange={(val) => setSelectedStatusFilter((val as 'ALL' | 'PASS' | 'FAIL') || 'ALL')}
            placeholder="ทุกผลตรวจ"
          />
        </div>
      </div>

      {/* 1. Top Executive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Volume */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-normal text-slate-500 uppercase tracking-wider">
              ปริมาณรับเข้ารวม (Total Volume)
            </p>
            <h3 className="text-3xl font-normal text-slate-900 mt-1">
              {totalVolumeKg.toLocaleString()}{' '}
              <span className="text-sm text-slate-500 font-normal">kg</span>
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              จาก <strong className="text-slate-800">{totalBills}</strong> บิลรับเข้าวัตถุดิบ
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-100 text-emerald-700">
            <Scale className="w-6 h-6" />
          </div>
        </div>

        {/* Overall Pass Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-normal text-slate-500 uppercase tracking-wider">
              อัตราผ่านการสุ่มตรวจ (Pass Rate)
            </p>
            <h3
              className={`text-3xl font-normal mt-1 ${
                Number(overallPassRate) >= 90 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {overallPassRate}%
            </h3>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
              <span>ผ่าน {passCount} บิล</span> •{' '}
              <span className="text-rose-600 font-normal">ตก {failCount} บิล</span>
            </p>
          </div>
          <div
            className={`p-3.5 rounded-2xl ${
              Number(overallPassRate) >= 90
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Post-Production Defect Volume */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-normal text-slate-500 uppercase tracking-wider">
              ปัญหาหลังการผลิต (Post-Prod Defect)
            </p>
            <h3 className="text-3xl font-normal text-rose-600 mt-1">
              {totalPostProdDefectKg.toLocaleString()}{' '}
              <span className="text-sm text-slate-500 font-normal">kg</span>
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              จากวัตถุดิบทั้งหมดรวมถึง Type 3
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-100 text-rose-700">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Active QC Issues */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-sm font-normal text-slate-500 uppercase tracking-wider">
              รายการปัญหาคุณภาพเปิดอยู่ (Active QC Issues)
            </p>
            <h3 className="text-3xl font-normal text-amber-600 mt-1">
              {activeIssuesCount} <span className="text-sm text-slate-500 font-normal">รายการ</span>
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              ต้องติดตามมาตรการแก้ไข (FM-PC-28)
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Smart Insights & Actionable Recommendations */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-normal">ข้อสรุปการประเมินคุณภาพจัดซื้อประจำช่วงเวลา</h3>
              <span className="text-sm font-normal px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                AI Executive Brief
              </span>
            </div>
            {globalFilteredReceivingRecords.length === 0 ? (
              <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                ยังไม่พบข้อมูลประวัติการตรวจรับวัตถุดิบและปัญหาคุณภาพในช่วงเวลาที่เลือก สามารถเริ่มบันทึกการรับเข้าใหม่ที่เมนู{' '}
                <strong className="text-sky-300">"บันทึกรับเข้าวัตถุดิบ"</strong> ระบบจะประมวลผลวิเคราะห์สรุปให้โดยอัตโนมัติ
              </p>
            ) : (
              <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                จากการวิเคราะห์ข้อมูลประวัติการตรวจรับจำนวน{' '}
                <strong className="text-sky-300 font-normal">{globalFilteredReceivingRecords.length} บิล</strong>{' '}
                พบอัตราผ่านคุณภาพรวมอยู่ที่ <strong className="text-emerald-400 font-normal">{overallPassRate}%</strong>{' '}
                {categoryBreakdownData.length > 0 && (
                  <>
                    โดยหมวดหมู่ที่มีของเสียสูงสุดคือ <strong className="text-rose-400 font-normal">{categoryBreakdownData[0]?.name}</strong>{' '}
                  </>
                )}
                {defectCausesData.length > 0 && (
                  <>
                    มีสาเหตุหลักมาจาก <strong className="text-amber-300 font-normal">{defectCausesData[0]?.category}</strong>{' '}
                  </>
                )}
                {supplierRankingData.length > 0 && (
                  <>
                    แนะนำให้ติดตามมาตรการปรับปรุงคุณภาพร่วมกับ Supplier <strong className="text-rose-300 font-normal">{supplierRankingData[0]?.fullName}</strong> เพื่อลดของเสียในอนาคต
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Recharts Section (Grid 2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Quality Pass Trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-normal text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                1. แนวโน้มเปอร์เซ็นต์การตรวจผ่านคุณภาพ (Quality Pass Rate Trend)
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                เปรียบเทียบ % PASS และ % FAIL ในแต่ละเดือน
              </p>
            </div>
          </div>

          {monthlyTrendData.length === 0 ? (
            <div className="h-64 w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <TrendingUp className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-normal text-slate-600">ยังไม่มีข้อมูลแนวโน้มคุณภาพ</p>
              <p className="text-sm text-slate-400 mt-0.5 max-w-xs">
                ระบบจะพล็อตกราฟแนวโน้มอัตโนมัติเมื่อเริ่มบันทึกประวัติการตรวจรับเข้าวัตถุดิบ
              </p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorFail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [`${value}%`, '']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="passRate" name="% PASS (ตรวจผ่าน)" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPass)" />
                  <Area type="monotone" dataKey="postProdDefectRate" name="% ปัญหาหลังผลิต" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFail)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Supplier Defect Ranking (Bar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-normal text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-rose-600" />
                2. จัดอันดับผู้ส่งมอบที่มีปัญหาคุณภาพสูงสุด (Supplier Defect Ranking)
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                เรียงตามจำนวนครั้งที่สุ่มตรวจไม่ผ่าน (FAIL Count)
              </p>
            </div>
          </div>

          {supplierRankingData.length === 0 ? (
            <div className="h-64 w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <Award className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-normal text-slate-600">ยังไม่มีข้อมูลจัดอันดับ Supplier ไม่ผ่านเกณฑ์</p>
              <p className="text-sm text-slate-400 mt-0.5 max-w-xs">
                ระบบจะจัดอันดับผู้ส่งมอบที่มีบิลตรวจไม่ผ่าน (FAIL) โดยอัตโนมัติเมื่อพบของเสีย
              </p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierRankingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="supplier" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, _name: any, item: any) => [
                      `${value} บิลที่ไม่ผ่าน (ของเสีย ${item?.payload?.defectKg || 0} kg / Fail Rate ${item?.payload?.failRate || 0}%)`,
                      item?.payload?.fullName || '',
                    ]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                  />
                  <Bar dataKey="failCount" name="จำนวนบิลที่ไม่ผ่าน (FAIL)" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 3: RM Category Breakdown (Donut Pie Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-normal text-slate-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-sky-600" />
                3. สัดส่วนน้ำหนักของเสียตามหมวดหมู่ (Defect Vol by RM Category)
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                แบ่งตามประเภทวัตถุดิบ (Category)
              </p>
            </div>
          </div>

          {categoryBreakdownData.length === 0 ? (
            <div className="h-64 w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <PieIcon className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-normal text-slate-600">ยังไม่มีสัดส่วนน้ำหนักของเสีย</p>
              <p className="text-sm text-slate-400 mt-0.5 max-w-xs">
                ไม่พบน้ำหนักของเสียแยกตามหมวดหมู่ในช่วงเวลาที่เลือก
              </p>
            </div>
          ) : (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value} kg`}
                  >
                    {categoryBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any) => [`${value} kg`, 'น้ำหนักของเสีย']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 4: Top Defect RM Items (Bar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-normal text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                4. วัตถุดิบที่มีของเสียสูงสุด (Top Defect RM Items)
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                จัดอันดับจากบิลที่ตกเกณฑ์ และปัญหาหลังการผลิต
              </p>
            </div>
          </div>

          {topDefectRmsData.length === 0 ? (
            <div className="h-64 w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <Layers className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-normal text-slate-600">ยังไม่มีข้อมูลวัตถุดิบที่มีของเสีย</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDefectRmsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="failCount" name="จำนวนบิลที่ไม่ผ่าน (FAIL)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="postProdKg" name="หลังการผลิต (kg)" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 4. Advanced Data Table & Export */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls & Export Header */}
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-normal text-slate-900">
              ตารางสรุปประวัติ QC & การประเมินผลผู้ส่งมอบ ({filteredRecords.length} รายการ)
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              สามารถกรองข้อมูลเพื่อส่งออกเป็นรายงาน CSV สำหรับการประชุมประเมินประจำเดือน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา Bill No, Supplier, RM..."
                className="w-full h-9 pl-9 pr-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-normal text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-normal text-sm rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export to CSV
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-normal uppercase tracking-wider text-slate-500 sticky top-0 z-10 shadow-2xs">
                <th className="py-3.5 px-4">วันที่รับ</th>
                <th className="py-3.5 px-4">Bill No</th>
                <th className="py-3.5 px-4">Supplier (ผู้ส่งมอบ)</th>
                <th className="py-3.5 px-4">วัตถุดิบ (RM)</th>
                <th className="py-3.5 px-4 text-right">รับเข้า (kg)</th>
                <th className="py-3.5 px-4 text-right">สุ่มตรวจ (kg)</th>
                <th className="py-3.5 px-4 text-right">Defect (kg)</th>
                <th className="py-3.5 px-4 text-right">% Defect</th>
                <th className="py-3.5 px-4 text-center">ผลตรวจ</th>
                <th className="py-3.5 px-4 text-right">หลังการผลิต (kg)</th>
                <th className="py-3.5 px-4">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm font-normal text-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    ไม่พบข้อมูลประวัติ QC ตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                paginatedAnalyticsRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600">{r.receiveDate}</td>
                    <td className="py-3 px-4 font-mono font-normal text-slate-900">{r.billNo}</td>
                    <td className="py-3 px-4 font-normal text-slate-800">{r.supplierName}</td>
                    <td className="py-3 px-4">
                      <span className="font-normal text-slate-900">{r.rmName}</span>{' '}
                      <span className="text-sm bg-slate-100 text-slate-500 font-normal px-1.5 py-0.5 rounded">
                        {r.rmCategory}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-normal">{r.receiveQty.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-blue-700 font-normal">{r.sampleQty}</td>
                    <td className="py-3 px-4 text-right text-rose-700 font-normal">{r.defectQty}</td>
                    <td className="py-3 px-4 text-right font-normal">{r.defectPercent}%</td>
                    <td className="py-3 px-4 text-center">
                      {r.isPass ? (
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
                    <td className="py-3 px-4 text-right text-rose-700 font-normal">
                      {r.postProductionDefectQty !== undefined ? r.postProductionDefectQty : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{r.remark || '-'}</td>
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
          totalItems={filteredRecords.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemUnitLabel="รายการประวัติ"
        />
      </div>
    </div>
  );
};
