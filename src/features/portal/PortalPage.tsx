import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, ShoppingCart, ArrowRight } from 'lucide-react';

const modules = [
  {
    id: 'production',
    title: 'ระบบวางแผนการผลิต',
    subtitle: 'Production Planning',
    description: 'วางแผนการผลิตรายสัปดาห์ จัดการคำสั่งซื้อ บันทึกผลผลิตจริง',
    icon: Factory,
    path: '/production/dashboard',
    color: 'sky',
    bgGradient: 'from-sky-500 to-sky-700',
    badgeText: 'Production',
  },
  {
    id: 'purchasing',
    title: 'ระบบจัดซื้อ',
    subtitle: 'Purchasing Management',
    description: 'บันทึกการรับเข้า ตรวจรับวัตถุดิบ (RM Receiving) และติดตามปัญหาคุณภาพ (QC Issue Log)',
    icon: ShoppingCart,
    path: '/purchasing',
    color: 'emerald',
    bgGradient: 'from-emerald-500 to-emerald-700',
    badgeText: 'Purchasing',
  },
];

export const PortalPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md mb-4 sm:mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20">
          <Factory className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          โรงงานผลิต — Portal
        </h1>
        <p className="mt-2 sm:mt-4 text-slate-300 text-sm sm:text-lg md:text-xl font-medium">
          เลือกระบบที่ต้องการใช้งาน
        </p>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-3xl">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              onClick={() => navigate(mod.path)}
              className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-left shadow-xl hover:-translate-y-1.5 hover:bg-white/10 hover:border-white/30 hover:shadow-2xl transition-all duration-300 ease-out cursor-pointer active:scale-[0.98]"
            >
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-gradient-to-br ${mod.bgGradient} shadow-lg mb-3 sm:mb-5`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>

              {/* Text */}
              <div className="mb-3 sm:mb-4">
                <span className={`inline-block text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5 ${mod.color === 'sky' ? 'bg-sky-500/20 text-sky-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {mod.badgeText}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  {mod.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  {mod.subtitle}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4 sm:mb-5 line-clamp-2 sm:line-clamp-none">
                {mod.description}
              </p>

              {/* Enter Button */}
              <div className={`flex items-center gap-2 text-xs sm:text-sm font-semibold ${mod.color === 'sky' ? 'text-sky-400 group-hover:text-sky-300' : 'text-emerald-400 group-hover:text-emerald-300'} transition-colors`}>
                เข้าสู่ระบบ
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-8 sm:mt-12 text-[11px] sm:text-xs text-slate-500">
        Weekly Production Planner — Portal v2.0
      </p>
    </div>
  );
};
