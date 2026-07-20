import React from 'react';
import { motion } from 'motion/react';
import { pageTransitionVariants } from '@/motion/tokens';
import { EmptyState } from './EmptyState';
import { Badge } from './Badge';

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, subtitle, icon }) => {
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-900 leading-relaxed">{title}</h2>
              <Badge label="Phase 0 Placeholder" variant="slate" />
            </div>
            <p className="text-sm text-slate-500 leading-normal">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Content Placeholder Box */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-2xs min-h-[360px] flex items-center justify-center">
        <EmptyState
          icon={icon}
          title={`หน้า ${title}`}
          message="โครงสร้างหน้าและเส้นทางของระบบได้รับการเตรียมพร้อมแล้ว ฟังก์ชันการทำงานทางธุรกิจจะเปิดใช้งานในระยะถัดไป"
        />
      </div>
    </motion.div>
  );
};
