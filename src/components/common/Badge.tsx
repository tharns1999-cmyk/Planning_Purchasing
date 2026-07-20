import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { THAI_TRANSLATIONS } from '@/i18n/th';

export type StatusType = 'planned' | 'inProduction' | 'completed' | 'delayed';

export interface BadgeProps {
  status?: StatusType;
  label?: string;
  variant?: 'sky' | 'amber' | 'emerald' | 'rose' | 'slate' | 'indigo';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, label, variant = 'slate', className }) => {
  const statusConfig: Record<StatusType, { label: string; style: string }> = {
    planned: {
      label: THAI_TRANSLATIONS.status.planned,
      style: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    inProduction: {
      label: THAI_TRANSLATIONS.status.inProduction,
      style: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    completed: {
      label: THAI_TRANSLATIONS.status.completed,
      style: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    delayed: {
      label: THAI_TRANSLATIONS.status.delayed,
      style: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  };

  const variantStyles = {
    sky: 'bg-sky-50 text-sky-700 border-sky-200/80',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/80',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  };

  const activeLabel = status ? statusConfig[status].label : label;
  const activeStyle = status ? statusConfig[status].style : variantStyles[variant];

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border leading-normal tracking-normal',
          activeStyle,
          className
        )
      )}
    >
      {activeLabel}
    </span>
  );
};
