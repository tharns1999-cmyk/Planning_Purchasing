import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Calendar, Bell } from 'lucide-react';
import { THAI_TRANSLATIONS } from '@/i18n/th';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const currentDateFormatted = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-row overflow-x-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Bar Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-2xs z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-slate-900 leading-normal">
              {THAI_TRANSLATIONS.app.title}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-medium border border-sky-200">
              สัปดาห์ที่ 29/2026
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{currentDateFormatted}</span>
            </div>

            <button
              aria-label="แจ้งเตือน"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-sky-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Dynamic Route View Content Container */}
        <main className="flex-1 overflow-y-auto px-3.5 sm:px-5 py-3 sm:py-4 w-full max-w-none">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
