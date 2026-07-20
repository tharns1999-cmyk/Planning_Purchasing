export const COLOR_TOKENS = {
  primary: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
  },
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  status: {
    planned: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
    },
    inProduction: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
    },
    completed: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    delayed: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
    },
  },
} as const;

export const LAYOUT_TOKENS = {
  sidebarWidthExpanded: '240px',
  sidebarWidthCollapsed: '64px',
  headerHeight: '56px',
  maxViewportWidth: '1440px',
  defaultViewportWidth: '1366px',
} as const;
