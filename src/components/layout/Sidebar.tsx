import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  PieChart,
  FileText,
  CalendarDays,
  Truck,
  CheckSquare,
  Printer,
  Database,
  ChevronLeft,
  ChevronRight,
  Factory,
  ArrowLeft,
} from 'lucide-react';
import { THAI_TRANSLATIONS } from '@/i18n/th';
import { sidebarVariants } from '@/motion/tokens';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check viewport on mount and resize
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Effective state: collapsed if manually collapsed AND not currently hovered
  const effectiveCollapsed = !isMobile && isCollapsed && !isHovered;

  const navItems = [
    { to: '/production/dashboard', label: THAI_TRANSLATIONS.nav.dashboard, icon: LayoutDashboard },
    { to: '/production/overview', label: THAI_TRANSLATIONS.nav.overview, icon: PieChart },
    { to: '/production/orders', label: THAI_TRANSLATIONS.nav.orders, icon: FileText },
    { to: '/production/planning', label: THAI_TRANSLATIONS.nav.planning, icon: CalendarDays },
    { to: '/production/calendar', label: THAI_TRANSLATIONS.nav.calendar, icon: Truck },
    { to: '/production/actuals', label: THAI_TRANSLATIONS.nav.actuals, icon: CheckSquare },
    { to: '/production/print-preview', label: THAI_TRANSLATIONS.nav.printPreview, icon: Printer },
    { to: '/production/master-data', label: THAI_TRANSLATIONS.nav.masterData, icon: Database },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <motion.aside
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        variants={sidebarVariants}
        animate={isMobile ? (isMobileOpen ? 'mobile_expanded' : 'mobile_collapsed') : (effectiveCollapsed ? 'collapsed' : 'expanded')}
        initial={false}
        className={`fixed md:relative z-50 h-screen bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0 shadow-lg select-none`}
      >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Factory className="w-5 h-5" />
          </div>
          <div className={effectiveCollapsed ? 'sr-only' : 'flex flex-col truncate'}>
            <span className="text-sm font-semibold text-white leading-tight truncate">
              {THAI_TRANSLATIONS.app.shortName}
            </span>
            <span className="text-[11px] text-slate-400 leading-none truncate">
              {THAI_TRANSLATIONS.app.subtitle}
            </span>
          </div>
        </div>
        <button
          onClick={isMobile ? onCloseMobile : onToggleCollapse}
          aria-label={isMobile ? 'ปิดเมนู' : (effectiveCollapsed ? 'ขยายเมนู' : 'ย่อเมนู')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {isMobile ? <ArrowLeft className="w-4 h-4" /> : (effectiveCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />)}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => isMobile && onCloseMobile?.()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors leading-normal ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`
              }
              title={effectiveCollapsed ? item.label : undefined}
            >
              <IconComponent className="w-5 h-5 shrink-0" />
              <span className={effectiveCollapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
            </NavLink>
          );
        })}

      </nav>

      {/* Back to Portal */}
      <div className="p-3 border-t border-slate-800">
        <NavLink
          to="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors leading-normal text-slate-400 hover:text-white hover:bg-slate-800/80 ${effectiveCollapsed ? 'justify-center' : ''}`}
          title={effectiveCollapsed ? 'กลับหน้าหลัก (Portal)' : undefined}
        >
          <ArrowLeft className="w-5 h-5 shrink-0" />
          <span className={effectiveCollapsed ? 'sr-only' : 'truncate'}>กลับหน้าหลัก (Portal)</span>
        </NavLink>
      </div>

      {/* Footer / User Info */}
      <div className="p-3 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
          TH
        </div>
        <div className={effectiveCollapsed ? 'sr-only' : 'flex flex-col truncate'}>
          <span className="text-slate-200 font-medium truncate">ฝ่ายวางแผนผลิต</span>
          <span className="text-[10px] text-slate-500 truncate">1366x768 Optimized</span>
        </div>
      </div>
    </motion.aside>
    </>
  );
};
