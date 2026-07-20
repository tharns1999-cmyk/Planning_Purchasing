import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  Truck,
  CheckSquare,
  Printer,
  Database,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Factory,
} from 'lucide-react';
import { THAI_TRANSLATIONS } from '@/i18n/th';
import { sidebarVariants } from '@/motion/tokens';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const navItems = [
    { to: '/', label: THAI_TRANSLATIONS.nav.overview, icon: LayoutDashboard },
    { to: '/orders', label: THAI_TRANSLATIONS.nav.orders, icon: FileText },
    { to: '/planning', label: THAI_TRANSLATIONS.nav.planning, icon: CalendarDays },
    { to: '/calendar', label: THAI_TRANSLATIONS.nav.calendar, icon: Truck },
    { to: '/actuals', label: THAI_TRANSLATIONS.nav.actuals, icon: CheckSquare },
    { to: '/print-preview', label: THAI_TRANSLATIONS.nav.printPreview, icon: Printer },
    { to: '/master-data', label: THAI_TRANSLATIONS.nav.masterData, icon: Database },
    { to: '/settings', label: THAI_TRANSLATIONS.nav.settings, icon: Settings },
  ];

  return (
    <motion.aside
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      initial={false}
      className="relative z-20 h-screen bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0 shadow-lg select-none"
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Factory className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold text-white leading-tight truncate">
                {THAI_TRANSLATIONS.app.shortName}
              </span>
              <span className="text-[11px] text-slate-400 leading-none truncate">
                {THAI_TRANSLATIONS.app.subtitle}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
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
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors leading-normal ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <IconComponent className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}

        <div className="my-2 border-t border-slate-800" />

        {/* Temporary Dev Showcase Link */}
        <NavLink
          to="/showcase"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-slate-800/60'
            }`
          }
          title={isCollapsed ? THAI_TRANSLATIONS.nav.showcase : undefined}
        >
          <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
          {!isCollapsed && <span className="truncate">{THAI_TRANSLATIONS.nav.showcase}</span>}
        </NavLink>
      </nav>

      {/* Footer / User Info */}
      <div className="p-3 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
          TH
        </div>
        {!isCollapsed && (
          <div className="flex flex-col truncate">
            <span className="text-slate-200 font-medium truncate">ฝ่ายวางแผนผลิต</span>
            <span className="text-[10px] text-slate-500 truncate">1366x768 Optimized</span>
          </div>
        )}
      </div>
    </motion.aside>
  );
};
