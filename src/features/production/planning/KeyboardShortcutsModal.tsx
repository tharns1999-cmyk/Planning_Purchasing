import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + B', description: 'พับเก็บ / ขยายรายการรอวางแผน (Queue Panel)' },
    { key: '?', description: 'เปิด / ปิด หน้าต่างแสดงคู่มือคีย์ลัดนี้' },
    { key: 'Esc', description: 'ปิดหน้าต่าง Modal หรือ ยกเลิกคำสั่งปัจจุบัน' },
    { key: 'Tab', description: 'สลับช่องกรอกข้อมูลถัดไป (Fast Field Navigation)' },
    { key: 'Shift + Tab', description: 'ย้อนกลับไปช่องกรอกข้อมูลก่อนหน้า' },
    { key: 'Enter', description: 'ยืนยันการบันทึกในฟอร์ม Modal' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Overlay Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
            <Keyboard className="w-5 h-5 text-sky-600" />
            <span>คีย์ลัดสำหรับนักวางแผน (Shortcuts)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            เพิ่มความรวดเร็วในการจัดตารางผลิตด้วยปุ่มลัดบนคีย์บอร์ด (Keyboard Accelerator)
          </p>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
            {shortcuts.map((item, index) => (
              <div key={index} className="flex items-center justify-between px-3.5 py-2.5 bg-white hover:bg-sky-50/30 transition-colors text-xs">
                <span className="text-slate-700 font-medium">{item.description}</span>
                <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded-md font-mono text-[11px] font-bold text-slate-800 shadow-2xs">
                  {item.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            เข้าใจแล้ว (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
