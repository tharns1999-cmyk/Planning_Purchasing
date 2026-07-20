import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { PlanningPage } from '@/features/planning/PlanningPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { ActualsPage } from '@/features/actuals/ActualsPage';
import { PrintPreviewPage } from '@/features/print-preview/PrintPreviewPage';
import { MasterDataPage } from '@/features/master-data/MasterDataPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ShowcasePage } from '@/features/showcase/ShowcasePage';

export const AppRoutes: React.FC = () => {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/actuals" element={<ActualsPage />} />
        <Route path="/print-preview" element={<PrintPreviewPage />} />
        <Route path="/master-data" element={<MasterDataPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/showcase" element={<ShowcasePage />} />
      </Routes>
    </AppShell>
  );
};
