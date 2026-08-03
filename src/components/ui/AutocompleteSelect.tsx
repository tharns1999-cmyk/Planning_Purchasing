import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  subtitle?: string;
  badge?: string;
}

interface AutocompleteSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export const AutocompleteSelect: React.FC<AutocompleteSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '-- เลือกรายการ --',
  searchPlaceholder = 'พิมพ์เพื่อค้นหา...',
  required = false,
  disabled = false,
  className = '',
  icon,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((opt) => {
      const labelMatch = String(opt.label || '').toLowerCase().includes(query);
      const subtitleMatch = opt.subtitle ? String(opt.subtitle).toLowerCase().includes(query) : false;
      const badgeMatch = opt.badge ? String(opt.badge).toLowerCase().includes(query) : false;
      return labelMatch || subtitleMatch || badgeMatch;
    });
  }, [options, searchQuery]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-50' : ''} ${className}`}>
      {/* Hidden native input for HTML5 form required validation */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          required
          tabIndex={-1}
          className="sr-only"
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all flex items-center justify-between gap-2 cursor-pointer ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''
        } ${isOpen ? 'ring-2 ring-emerald-500/20 border-emerald-600 bg-white shadow-sm' : ''}`}
      >
        <div className="flex items-center gap-2 overflow-hidden text-left">
          {icon}
          {selectedOption ? (
            <div className="flex items-center gap-1.5 overflow-hidden">
              {selectedOption.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono shrink-0">
                  {selectedOption.badge}
                </span>
              )}
              <span className="font-bold text-slate-900 truncate">{selectedOption.label}</span>
            </div>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedOption && !disabled && (
            <span
              onClick={handleClear}
              className="p-1 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors"
              title="ล้างตัวเลือก"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[9999] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Search Box Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400 font-medium">
                ไม่พบรายการที่ตรงกับ "{searchQuery}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between text-left cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {opt.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                          isSelected 
                            ? 'bg-emerald-200 text-emerald-900' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {opt.badge}
                        </span>
                      )}
                      <div>
                        <p className="leading-snug">{opt.label}</p>
                        {opt.subtitle && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{opt.subtitle}</p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
