import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useReducedMotion } from 'motion/react';

export interface ConfirmRemoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRemove: () => void;
  itemName?: string;
}

export const ConfirmRemoveModal: React.FC<ConfirmRemoveModalProps> = ({
  isOpen,
  onClose,
  onConfirmRemove,
  itemName,
}) => {
  const reducedMotion = useReducedMotion() ?? false;

  const modalFooter = (
    <>
      <Button variant="secondary" size="md" onClick={onClose}>
        ยกเลิก
      </Button>
      <Button
        variant="danger"
        size="md"
        onClick={() => {
          onConfirmRemove();
          onClose();
        }}
      >
        ลบรายการ
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ลบรายการวางแผน"
      maxWidth="sm"
      footer={modalFooter}
      reducedMotion={reducedMotion}
    >
      <div className="flex items-start gap-3 py-2">
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-800 leading-normal">
            ต้องการลบรายการนี้ออกจากแผนใช่หรือไม่
          </p>
          {itemName && (
            <p className="text-xs font-bold text-slate-900 bg-slate-100 p-2 rounded-lg border border-slate-200 mt-2">
              {itemName}
            </p>
          )}
          <p className="text-xs text-slate-500 pt-1">
            เมื่อลบแล้ว ยอดคงเหลือคงวางแผนจะถูกคืนกลับไปยังรายการค้างวางแผน (Queue)
          </p>
        </div>
      </div>
    </Modal>
  );
};
