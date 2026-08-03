import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Calendar, Bell, RefreshCw, Menu } from 'lucide-react';
import { THAI_TRANSLATIONS } from '@/i18n/th';
import { getISOWeekNumber } from '@/domain/calculations';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { plannerRepository } = await import('@/services/plannerService');
      await plannerRepository.initializeAsync(true);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error('Failed to refresh data', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const today = new Date();
  const weekNo = getISOWeekNumber(today);
  const currentYear = today.getFullYear();

  const currentDateFormatted = today.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row overflow-x-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={toggleSidebar} 
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Bar Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="เปิดเมนู"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold text-slate-900 leading-normal hidden sm:block">
              {THAI_TRANSLATIONS.app.title}
            </h1>
            <h1 className="text-base font-semibold text-slate-900 leading-normal sm:hidden">
              ระบบวางแผน
            </h1>
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-medium border border-sky-200 whitespace-nowrap">
              สัปดาห์ {weekNo}/{currentYear}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{currentDateFormatted}</span>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="รีเฟรชข้อมูล"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                isRefreshing 
                  ? 'bg-sky-50 text-sky-400 border-sky-100 cursor-not-allowed' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-sky-700 hover:border-slate-300 shadow-2xs hover:shadow-sm'
              }`}
              title="โหลดข้อมูลล่าสุด"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline font-medium">รีเฟรช</span>
            </button>

            <button
              aria-label="แจ้งเตือน"
              className="hidden sm:block p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-sky-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Dynamic Route View Content Container */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 sm:py-4 pb-16 md:pb-4 w-full max-w-none">
          <ErrorBoundary key={refreshKey}>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
