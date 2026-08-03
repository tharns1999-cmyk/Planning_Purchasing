import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Building2 } from 'lucide-react';
import { SelectOption } from './AutocompleteSelect';

interface MultiAutocompleteSelectProps {
  options: SelectOption[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export const MultiAutocompleteSelect: React.FC<MultiAutocompleteSelectProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = '-- เลือกรายการ --',
  searchPlaceholder = 'พิมพ์เพื่อค้นหารายชื่อ...',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOptions = useMemo(
    () => options.filter((opt) => selectedValues.includes(opt.value)),
    [options, selectedValues]
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

  const handleToggle = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleRemove = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== val));
  };

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? 'z-50' : ''} ${className}`}>
      {/* Trigger Box */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[44px] p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all flex items-center justify-between gap-2 cursor-pointer ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''
        } ${isOpen ? 'ring-2 ring-emerald-500/20 border-emerald-600 bg-white shadow-sm' : ''}`}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {selectedOptions.length === 0 ? (
            <span className="text-slate-400 font-normal px-1.5">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200"
              >
                <Building2 className="w-3 h-3 text-emerald-700" />
                {opt.badge && <span className="font-mono opacity-80">[{opt.badge}]</span>}
                {opt.label}
                {!disabled && (
                  <span
                    onClick={(e) => handleRemove(e, opt.value)}
                    className="p-0.5 hover:bg-emerald-200 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3 text-emerald-800" />
                  </span>
                )}
              </span>
            ))
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </div>

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

          {/* Options Checkbox List */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400 font-medium">
                ไม่พบรายการที่ตรงกับ "{searchQuery}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggle(opt.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between text-left cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      {opt.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono shrink-0">
                          {opt.badge}
                        </span>
                      )}
                      <span className="leading-snug truncate">{opt.label}</span>
                    </div>
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
