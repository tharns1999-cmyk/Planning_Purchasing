import React from 'react';
import { Database } from 'lucide-react';
import { PlaceholderPage } from '@/components/common/PlaceholderPage';
import { THAI_TRANSLATIONS } from '@/i18n/th';

export const MasterDataPage: React.FC = () => {
  return (
    <PlaceholderPage
      title={THAI_TRANSLATIONS.nav.masterData}
      subtitle="จัดการข้อมูลหลัก เช่น สินค้า (SKUs), ไลน์การผลิต, สูตรอาหาร (BOM) และกำลังการผลิต"
      icon={<Database className="w-6 h-6" />}
    />
  );
};
