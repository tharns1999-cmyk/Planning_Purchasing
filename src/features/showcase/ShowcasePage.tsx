import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Search, Layers, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Textarea } from '@/components/common/Textarea';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { THAI_TRANSLATIONS } from '@/i18n/th';
import { pageTransitionVariants } from '@/motion/tokens';

export const ShowcasePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('line1');

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-8 pb-12"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-md border border-slate-700 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white leading-relaxed">
              {THAI_TRANSLATIONS.showcase.title}
            </h2>
          </div>
          <p className="text-sm text-slate-300 leading-normal">
            {THAI_TRANSLATIONS.showcase.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              className="rounded text-sky-500 focus:ring-sky-500"
            />
            <span>{THAI_TRANSLATIONS.showcase.toggleReducedMotion}</span>
          </label>
        </div>
      </div>

      {/* 1. Buttons Showcase */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
          1. {THAI_TRANSLATIONS.showcase.buttons}
        </h3>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary">Primary Action</Button>
          <Button variant="secondary">Secondary Action</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="danger">Danger Action</Button>
        </div>
        <div className="flex flex-wrap gap-3 items-center pt-2">
          <Button variant="primary" size="sm">
            Small Button
          </Button>
          <Button variant="primary" size="md">
            Medium (Standard)
          </Button>
          <Button variant="primary" size="lg">
            Large Button
          </Button>
          <Button variant="primary" isLoading>
            Loading State
          </Button>
          <Button variant="primary" disabled>
            Disabled State
          </Button>
        </div>
      </section>

      {/* 2. Badges Showcase */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
          2. {THAI_TRANSLATIONS.showcase.badges}
        </h3>
        <div className="flex flex-wrap gap-4 items-center">
          <Badge status="planned" />
          <Badge status="inProduction" />
          <Badge status="completed" />
          <Badge status="delayed" />
          <Badge label="กำหนดเอง (Custom)" variant="sky" />
        </div>
      </section>

      {/* 3. Form Controls Showcase */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
          3. {THAI_TRANSLATIONS.showcase.inputs}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="รหัสสินค้า (SKU Code)"
            placeholder="เช่น SK-FB-001"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            helperText="ระบุรหัสสินค้าเพื่อค้นหา"
          />

          <Select
            label="ไลน์การผลิต (Production Line)"
            value={selectValue}
            onChange={(e) => setSelectValue(e.target.value)}
            options={[
              { value: 'line1', label: 'ไลน์การผลิตที่ 1 (ของทอด)' },
              { value: 'line2', label: 'ไลน์การผลิตที่ 2 (ของนึ่ง)' },
              { value: 'line3', label: 'ไลน์การผลิตที่ 3 (บรรจุ)' },
            ]}
          />

          <div className="md:col-span-2">
            <Textarea
              label="หมายเหตุการผลิต (Production Note)"
              placeholder="ระบุข้อความหรือหมายเหตุเพิ่มเติม..."
            />
          </div>
        </div>
      </section>

      {/* 4. Feedback States Showcase */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
          4. {THAI_TRANSLATIONS.showcase.states}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-slate-100 rounded-lg p-2 bg-slate-50/50">
            <span className="text-xs font-medium text-slate-500 mb-2 block">Loading State</span>
            <LoadingState />
          </div>
          <div className="border border-slate-100 rounded-lg p-2 bg-slate-50/50">
            <span className="text-xs font-medium text-slate-500 mb-2 block">Empty State</span>
            <EmptyState title="ไม่มีแผนการผลิต" message="ยังไม่มีรายการสัปดาห์นี้" />
          </div>
          <div className="border border-slate-100 rounded-lg p-2 bg-slate-50/50">
            <span className="text-xs font-medium text-slate-500 mb-2 block">Error State</span>
            <ErrorState onRetry={() => alert('Retry triggered')} />
          </div>
        </div>
      </section>

      {/* 5. Modal & Motion Showcase */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
          5. {THAI_TRANSLATIONS.showcase.modal} & {THAI_TRANSLATIONS.showcase.motion}
        </h3>
        <div className="flex items-center gap-4">
          <Button
            variant="primary"
            leftIcon={<Layers className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            ทดสอบเปิด Modal Dialog
          </Button>

          <span className="text-xs text-slate-500">
            {reducedMotion ? 'โหมดปัจจุบัน: Reduced Motion Active' : 'โหมดปัจจุบัน: Motion Active (Fluid)'}
          </span>
        </div>
      </section>

      {/* Interactive Modal Component */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="ตัวอย่างหน้าต่าง Modal ป็อปอัป"
        reducedMotion={reducedMotion}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {THAI_TRANSLATIONS.common.cancel}
            </Button>
            <Button
              variant="primary"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => setIsModalOpen(false)}
            >
              {THAI_TRANSLATIONS.common.confirm}
            </Button>
          </>
        }
      >
        <p className="mb-4">
          นี่คือตัวอย่างหน้าต่าง Modal สำหรับแสดงข้อความยืนยัน ฟอร์มแก้ไขข้อมูล หรือรายละเอียดเพิ่มเติม
        </p>
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sky-800 text-xs leading-normal">
          หน้าต่างนี้รองรับอนิเมชันความลื่นไหลด้วย Motion for React และสลับใช้โหมด Reduced Motion ได้โดยอัตโนมัติ
        </div>
      </Modal>
    </motion.div>
  );
};
