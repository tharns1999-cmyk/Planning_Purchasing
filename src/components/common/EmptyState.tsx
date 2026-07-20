import React from 'react';
import { Inbox } from 'lucide-react';
import { THAI_TRANSLATIONS } from '@/i18n/th';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = THAI_TRANSLATIONS.common.emptyTitle,
  message = THAI_TRANSLATIONS.common.emptyMessage,
  actionLabel,
  onAction,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`min-h-[220px] p-8 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center bg-white/50 ${className}`}
    >
      <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h4 className="text-base font-semibold text-slate-800 mb-1 leading-normal">{title}</h4>
      <p className="text-sm text-slate-500 max-w-sm mb-4 leading-normal">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm rounded-lg transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
