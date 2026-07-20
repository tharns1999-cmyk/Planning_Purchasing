import React, { SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, leftIcon, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

    return (
      <div className="w-full flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-slate-700 leading-normal">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none z-10">{leftIcon}</div>
          )}
          <select
            id={selectId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full h-9.5 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer leading-normal',
                leftIcon && 'pl-9',
                error && 'border-rose-500 focus:ring-rose-500 focus:border-rose-500',
                className
              )
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {error ? (
          <span className="text-xs text-rose-600 leading-normal">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-slate-500 leading-normal">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
