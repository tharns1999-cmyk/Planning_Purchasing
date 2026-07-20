import React, { TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

    return (
      <div className="w-full flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-medium text-slate-700 leading-normal">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={twMerge(
            clsx(
              'w-full p-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 disabled:text-slate-400 leading-normal resize-y',
              error && 'border-rose-500 focus:ring-rose-500 focus:border-rose-500',
              className
            )
          )}
          {...props}
        />
        {error ? (
          <span className="text-xs text-rose-600 leading-normal">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-slate-500 leading-normal">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
