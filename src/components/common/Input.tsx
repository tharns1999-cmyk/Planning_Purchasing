import React, { InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

    return (
      <div className="w-full flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-slate-700 leading-normal">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none">{leftIcon}</div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full h-9.5 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 disabled:text-slate-400 leading-normal',
                leftIcon && 'pl-9',
                error && 'border-rose-500 focus:ring-rose-500 focus:border-rose-500',
                className
              )
            )}
            {...props}
          />
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

Input.displayName = 'Input';
