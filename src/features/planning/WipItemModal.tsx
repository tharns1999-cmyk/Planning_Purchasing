import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Textarea } from '@/components/common/Textarea';
import { Button } from '@/components/common/Button';
import { Autocomplete, AutocompleteOption } from '@/components/common/Autocomplete';
import { WipPrepItem, ProductMaster } from '@/domain/types';
import { plannerRepository } from '@/services/plannerService';

export interface WipItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: WipPrepItem | null;
  onSuccess: () => void;
}

const DEFAULT_UNIT_OPTIONS = [
  'กก.',
  'กรัม',
  'ชิ้น',
  'กล่อง',
  'ถุง',
  'ชุด',
  'หม้อ',
  'ถาด',
  'ลัง',
  'อื่น ๆ',
];

export const WipItemModal: React.FC<WipItemModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  onSuccess,
}) => {
  const [itemName, setItemName] = useState<string>('');
  const [unitSelect, setUnitSelect] = useState<string>('กก.');
  const [customUnit, setCustomUnit] = useState<string>('');
  const [relatedProduct, setRelatedProduct] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Active products for Autocomplete
  const activeProducts = useMemo<ProductMaster[]>(() => {
    try {
      return plannerRepository.listProducts(false);
    } catch {
      return [];
    }
  }, []);

  const productAutocompleteOptions = useMemo<AutocompleteOption[]>(() => {
    return activeProducts.map((p) => ({
      value: p.productCode,
      label: `${p.productCode} - ${p.productName}`,
      subLabel: p.productName,
      data: p,
    }));
  }, [activeProducts]);

  useEffect(() => {
    if (isOpen) {
      setErrorBanner(null);
      if (editingItem) {
        setItemName(editingItem.itemName || '');
        setNote(editingItem.note || '');
        setRelatedProduct(editingItem.relatedProduct || '');
        setIsActive(editingItem.active);

        const currentUnit = editingItem.defaultUnit || 'กก.';
        if (DEFAULT_UNIT_OPTIONS.filter((u) => u !== 'อื่น ๆ').includes(currentUnit)) {
          setUnitSelect(currentUnit);
          setCustomUnit('');
        } else {
          setUnitSelect('อื่น ๆ');
          setCustomUnit(currentUnit);
        }
      } else {
        setItemName('');
        setUnitSelect('กก.');
        setCustomUnit('');
        setRelatedProduct('');
        setNote('');
        setIsActive(true);
      }
    }
  }, [isOpen, editingItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    const cleanName = itemName.trim();
    const finalUnit = unitSelect === 'อื่น ๆ' ? customUnit.trim() : unitSelect;

    // Validation
    if (!cleanName) {
      setErrorBanner('กรุณากรอกชื่อ WIP');
      return;
    }

    if (!finalUnit) {
      setErrorBanner('กรุณากรอกหน่วยเริ่มต้น');
      return;
    }

    if (editingItem) {
      const result = plannerRepository.updateWipItem(editingItem.itemId, {
        itemCode: editingItem.itemCode,
        itemName: cleanName,
        defaultUnit: finalUnit,
        relatedProduct: relatedProduct.trim() || undefined,
        note: note.trim() || undefined,
        active: isActive,
      });

      if (!result.success) {
        setErrorBanner(result.errors?.[0] || 'ไม่สามารถแก้ไขรายการ WIP ได้');
        return;
      }
    } else {
      const result = plannerRepository.createWipItem({
        itemName: cleanName,
        defaultUnit: finalUnit,
        relatedProduct: relatedProduct.trim() || undefined,
        note: note.trim() || undefined,
      });

      if (!result.success) {
        setErrorBanner(result.errors?.[0] || 'ไม่สามารถเพิ่มรายการ WIP ได้');
        return;
      }
    }

    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'แก้ไขรายการ WIP' : 'เพิ่มรายการ WIP'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3 pt-1">
        {errorBanner && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700">
            {errorBanner}
          </div>
        )}

        {/* ชื่อ WIP */}
        <Input
          label="ชื่อ WIP *"
          placeholder="ระบุชื่อ WIP (เช่น ไก่ตัดไส้พาเนมิกเครื่องเทศ)"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
        />

        {/* หน่วยเริ่มต้น */}
        <div className="space-y-1.5">
          <Select
            label="หน่วยเริ่มต้น *"
            value={unitSelect}
            onChange={(e) => setUnitSelect(e.target.value)}
            options={DEFAULT_UNIT_OPTIONS.map((u) => ({ value: u, label: u }))}
          />
          {unitSelect === 'อื่น ๆ' && (
            <Input
              placeholder="ระบุหน่วยเริ่มต้น (เช่น ลิตร, ซอง)"
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
            />
          )}
        </div>

        {/* สินค้า FG ที่เกี่ยวข้อง (Autocomplete) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            สินค้า FG ที่เกี่ยวข้อง (ถ้ามี)
          </label>
          <Autocomplete
            options={productAutocompleteOptions}
            value={relatedProduct}
            onChange={(val) => setRelatedProduct(val)}
            onSelectOption={(opt) => setRelatedProduct(opt.value)}
            placeholder="ค้นหาหรือเลือกสินค้า FG (เช่น SKU-BAK-001)"
            emptyText="ไม่พบสินค้า FG ที่ตรงกัน"
          />
        </div>

        {/* หมายเหตุ */}
        <Textarea
          label="หมายเหตุ (ถ้ามี)"
          placeholder="ระบุหมายเหตุการใช้งาน"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />

        {/* สถานะ (เฉพาะตอนแก้ไข) */}
        {editingItem && (
          <Select
            label="สถานะ *"
            value={isActive ? 'ACTIVE' : 'INACTIVE'}
            onChange={(e) => setIsActive(e.target.value === 'ACTIVE')}
            options={[
              { value: 'ACTIVE', label: 'ใช้งาน (Active)' },
              { value: 'INACTIVE', label: 'ปิดใช้งาน (Inactive)' },
            ]}
          />
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary">
            บันทึก
          </Button>
        </div>
      </form>
    </Modal>
  );
};
