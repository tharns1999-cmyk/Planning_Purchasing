import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] leading-normal';

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm border border-transparent',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200',
    outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border border-transparent',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm border border-transparent',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9.5 px-4 text-sm gap-2',
    lg: 'h-11 px-5 text-base gap-2.5',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variantStyles[variant], sizeStyles[size], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
