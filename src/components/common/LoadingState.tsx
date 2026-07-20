import React from 'react';
import { Loader2 } from 'lucide-react';
import { THAI_TRANSLATIONS } from '@/i18n/th';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = THAI_TRANSLATIONS.common.loading,
  className = '',
}) => {
  return (
    <div
      className={`min-h-[200px] flex flex-col items-center justify-center p-6 text-slate-500 ${className}`}
      role="status"
      aria-label={message}
    >
      <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-3" />
      <span className="text-sm font-medium text-slate-600 leading-normal">{message}</span>
    </div>
  );
};
