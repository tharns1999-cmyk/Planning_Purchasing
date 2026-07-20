import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { THAI_TRANSLATIONS } from '@/i18n/th';
import { COLOR_TOKENS } from '@/design/tokens';

describe('Phase 0 Foundation Tests', () => {
  it('renders AppShell with Thai application title and sidebar items', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Main Test Content</div>
        </AppShell>
      </MemoryRouter>
    );

    expect(screen.getByText(THAI_TRANSLATIONS.app.title)).toBeInTheDocument();
    expect(screen.getByText(THAI_TRANSLATIONS.nav.overview)).toBeInTheDocument();
    expect(screen.getByText(THAI_TRANSLATIONS.nav.planning)).toBeInTheDocument();
    expect(screen.getByText('Main Test Content')).toBeInTheDocument();
  });

  it('contains valid design tokens', () => {
    expect(COLOR_TOKENS.primary[600]).toBe('#0284C7');
    expect(COLOR_TOKENS.slate[900]).toBe('#0F172A');
  });

  it('renders Button component variants correctly', () => {
    render(<Button variant="primary">กดบันทึก</Button>);
    expect(screen.getByText('กดบันทึก')).toBeInTheDocument();
  });

  it('renders Status Badge with Thai status label', () => {
    render(<Badge status="planned" />);
    expect(screen.getByText(THAI_TRANSLATIONS.status.planned)).toBeInTheDocument();
  });

  it('renders Feedback state components (Loading, Empty, Error)', () => {
    render(<LoadingState message="กำลังโหลด..." />);
    expect(screen.getByText('กำลังโหลด...')).toBeInTheDocument();

    render(<EmptyState title="ไม่มีข้อมูล" />);
    expect(screen.getByText('ไม่มีข้อมูล')).toBeInTheDocument();

    render(<ErrorState title="ข้อผิดพลาด" />);
    expect(screen.getByText('ข้อผิดพลาด')).toBeInTheDocument();
  });
});
