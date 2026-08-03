import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Textarea } from '@/components/common/Textarea';
import { BoardNote } from '@/domain/types';

export interface BoardNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingNote?: BoardNote | null;
  onSave: (input: { noteText: string; highlightOnPlan: boolean }) => void;
}

export const BoardNoteModal: React.FC<BoardNoteModalProps> = ({
  isOpen,
  onClose,
  editingNote,
  onSave,
}) => {
  const [noteText, setNoteText] = useState<string>('');
  const [highlightOnPlan, setHighlightOnPlan] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorBanner(null);
      if (editingNote) {
        setNoteText(editingNote.noteText || '');
        setHighlightOnPlan(Boolean(editingNote.highlightOnPlan));
      } else {
        setNoteText('');
        setHighlightOnPlan(false);
      }
    }
  }, [isOpen, editingNote]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    const cleanText = noteText.trim();
    if (!cleanText) {
      setErrorBanner('กรุณาระบุข้อความหมายเหตุ');
      return;
    }

    onSave({
      noteText: cleanText,
      highlightOnPlan,
    });
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  const modalFooter = (
    <>
      <Button variant="secondary" size="md" onClick={onClose}>
        ยกเลิก
      </Button>
      <Button variant="primary" size="md" onClick={handleSubmit}>
        บันทึก
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="หมายเหตุบนแผน"
      maxWidth="md"
      footer={modalFooter}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorBanner && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorBanner}</span>
          </div>
        )}

        <Textarea
          label="ข้อความหมายเหตุ *"
          placeholder="เช่น ช่วย K2 / รอ QC / ทำความสะอาด"
          rows={3}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          autoFocus
        />

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={highlightOnPlan}
            onChange={(e) => setHighlightOnPlan(e.target.checked)}
            className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
          />
          <span>ไฮไลต์บนใบแผน</span>
        </label>
      </form>
    </Modal>
  );
};
