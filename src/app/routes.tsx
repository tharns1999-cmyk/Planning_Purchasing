import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { PortalPage } from '@/features/portal/PortalPage';
import { DashboardPage } from '@/features/production/dashboard/DashboardPage';
import { OverviewPage } from '@/features/production/overview/OverviewPage';
import { OrdersPage } from '@/features/production/orders/OrdersPage';
import { PlanningPage } from '@/features/production/planning/PlanningPage';
import { CalendarPage } from '@/features/production/calendar/CalendarPage';
import { ActualsPage } from '@/features/production/actuals/ActualsPage';
import { PrintPreviewPage } from '@/features/production/print-preview/PrintPreviewPage';
import { MasterDataPage } from '@/features/production/master-data/MasterDataPage';
import { PurchasingPage } from '@/features/purchasing/PurchasingPage';
import { SuppliersPage } from '@/features/purchasing/suppliers/SuppliersPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Portal Landing Page */}
      <Route path="/" element={<PortalPage />} />
      <Route path="/portal" element={<PortalPage />} />

      {/* Production Module — all wrapped in AppShell (sidebar เดิม) */}
      <Route
        path="/production/*"
        element={
          <AppShell>
            <Routes>
              <Route index element={<Navigate to="/production/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="planning" element={<PlanningPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="actuals" element={<ActualsPage />} />
              <Route path="print-preview" element={<PrintPreviewPage />} />
              <Route path="master-data" element={<MasterDataPage />} />
              <Route path="masters" element={<MasterDataPage />} />
            </Routes>
          </AppShell>
        }
      />

      {/* Purchasing Module */}
      <Route path="/purchasing/*" element={<PurchasingPage />} />
      <Route path="/purchasing/suppliers" element={<SuppliersPage />} />

      {/* Redirect old paths to new production paths for backward compat */}
      <Route path="/dashboard" element={<Navigate to="/production/dashboard" replace />} />
      <Route path="/overview" element={<Navigate to="/production/overview" replace />} />
      <Route path="/orders" element={<Navigate to="/production/orders" replace />} />
      <Route path="/planning" element={<Navigate to="/production/planning" replace />} />
      <Route path="/calendar" element={<Navigate to="/production/calendar" replace />} />
      <Route path="/actuals" element={<Navigate to="/production/actuals" replace />} />
      <Route path="/print-preview" element={<Navigate to="/production/print-preview" replace />} />
      <Route path="/masters" element={<Navigate to="/production/masters" replace />} />
      <Route path="/master-data" element={<Navigate to="/production/master-data" replace />} />

      {/* Catch-all fallback to Portal */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
