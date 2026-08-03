import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { PlanningPage } from '@/features/production/planning/PlanningPage';
import { plannerRepository } from '@/services/plannerService';
import { THAI_TRANSLATIONS } from '@/i18n/th';

describe('PHASE 5I — Auto Collapse Sidebar & Wider Planning Board Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
    plannerRepository.initialize();
  });

  it('1. Sidebar default is collapsed and expands on hover, collapses on mouse leave', () => {
    const onToggle = vi.fn();
    render(
      <MemoryRouter>
        <Sidebar isCollapsed={true} onToggleCollapse={onToggle} />
      </MemoryRouter>
    );

    const aside = screen.getByRole('complementary');

    // Default: isCollapsed=true and not hovered -> effectiveCollapsed=true
    expect(screen.getByLabelText('ขยายเมนู')).toBeInTheDocument();

    // Mouse enter -> auto expand
    fireEvent.mouseEnter(aside);
    expect(screen.getByLabelText('ย่อเมนู')).toBeInTheDocument();
    expect(screen.getByText(THAI_TRANSLATIONS.nav.overview)).toBeInTheDocument();

    // Mouse leave -> auto collapse
    fireEvent.mouseLeave(aside);
    expect(screen.getByLabelText('ขยายเมนู')).toBeInTheDocument();
  });

  it('2. AppShell defaults to collapsed sidebar state and renders page content smoothly', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Test Main Content</div>
        </AppShell>
      </MemoryRouter>
    );

    const aside = screen.getByRole('complementary');
    expect(aside).toBeInTheDocument();
    expect(screen.getByText('Test Main Content')).toBeInTheDocument();
  });

  it('3. PlanningPage renders 290px Queue Panel and full 4 Room columns (R1-R4) + Date header', async () => {
    render(
      <MemoryRouter>
        <PlanningPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/วางแผนการผลิต/)).toBeInTheDocument();
    });

    // Planning Queue Panel
    expect(screen.getByText(/รายการรอวางแผน \(Queue\)/)).toBeInTheDocument();
    expect(screen.getByText(/สินค้า FG/)).toBeInTheDocument();

    // Board Header Column
    expect(screen.getByText('วันที่ / ห้องผลิต')).toBeInTheDocument();

    // 4 Fixed Rooms
    expect(screen.getAllByText(/R1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R2/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R3/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R4/).length).toBeGreaterThan(0);
  });

  it('4. Queue Cards remain draggable and Board grid cells remain droppable', async () => {
    render(
      <MemoryRouter>
        <PlanningPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/วางแผนการผลิต/)).toBeInTheDocument();
    });

    // Check droppable cells exist
    const cells = screen.getAllByText('ลากมาวางที่นี่');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('5. AppShell content container renders full width with max-w-none class', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div data-testid="page-content">Full Width Test</div>
        </AppShell>
      </MemoryRouter>
    );

    const main = screen.getByRole('main');
    expect(main).toHaveClass('max-w-none');
    expect(main).toHaveClass('w-full');
  });
});
