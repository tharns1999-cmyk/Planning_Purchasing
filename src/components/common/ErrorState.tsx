import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { THAI_TRANSLATIONS } from '@/i18n/th';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = THAI_TRANSLATIONS.common.errorTitle,
  message = THAI_TRANSLATIONS.common.errorMessage,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`p-6 bg-rose-50/50 border border-rose-200 rounded-xl text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-base font-semibold text-slate-900 mb-1 leading-normal">{title}</h4>
      <p className="text-sm text-slate-600 mb-4 max-w-sm leading-normal">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          {THAI_TRANSLATIONS.common.retry}
        </button>
      )}
    </div>
  );
};
