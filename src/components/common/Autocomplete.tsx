import React, { useState, useRef, useEffect, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export interface AutocompleteOption {
  value: string;
  label: string;
  subLabel?: string;
  data?: unknown;
}


export interface AutocompleteProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onSelect' | 'onChange'> {
  label?: string;
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  onSelectOption?: (option: AutocompleteOption) => void;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  emptyText?: string;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  label,
  options,
  value,
  onChange,
  onSelectOption,
  error,
  helperText,
  leftIcon,
  emptyText = 'ไม่พบข้อมูลที่ตรงกัน',
  className,
  disabled,
  placeholder,
  id,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

  // Filter options based on user input
  const filteredOptions = options.filter((opt) => {
    if (!value) return true;
    const query = value.toLowerCase().trim();
    return (
      String(opt.label || '').toLowerCase().includes(query) ||
      String(opt.value || '').toLowerCase().includes(query) ||
      (opt.subLabel ? String(opt.subLabel).toLowerCase().includes(query) : false)
    );
  });

  useEffect(() => {
    setHighlightedIndex(0);
  }, [value]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: AutocompleteOption) => {
    onChange(option.label);
    if (onSelectOption) {
      onSelectOption(option);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter' && isOpen && filteredOptions[highlightedIndex]) {
      e.preventDefault();
      handleSelect(filteredOptions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-1 relative" ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-slate-700 leading-normal">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none z-10">{leftIcon}</div>
        )}

        <input
          id={inputId}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={twMerge(
            clsx(
              'w-full h-9.5 px-3 pr-8 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-100 disabled:text-slate-400 leading-normal',
              leftIcon && 'pl-9',
              error && 'border-rose-500 focus:ring-rose-500 focus:border-rose-500',
              className
            )
          )}
          {...props}
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
          }}
          className="absolute right-2 text-slate-400 hover:text-slate-600 disabled:opacity-40"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown Options */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-2xl z-[9999] py-1 text-xs">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-slate-400 text-center italic">{emptyText}</div>
          ) : (
            filteredOptions.map((opt, idx) => (
              <div
                key={`${opt.value}-${idx}`}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click
                  handleSelect(opt);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={clsx(
                  'px-3 py-2 cursor-pointer transition-colors flex flex-col gap-0.5',
                  idx === highlightedIndex ? 'bg-sky-50 text-sky-900 font-medium' : 'text-sky-800 hover:bg-slate-50'
                )}
              >
                <div className={clsx("font-semibold", idx === highlightedIndex ? "text-sky-900" : "text-slate-900")}>{opt.label}</div>
                {opt.subLabel && <div className={clsx("text-[11px]", idx === highlightedIndex ? "text-sky-700" : "text-slate-500")}>{opt.subLabel}</div>}
              </div>
            ))
          )}
        </div>
      )}

      {error ? (
        <span className="text-xs text-rose-600 leading-normal">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-slate-500 leading-normal">{helperText}</span>
      ) : null}
    </div>
  );
};
