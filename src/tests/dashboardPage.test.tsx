import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OverviewPage } from '@/features/production/overview/OverviewPage';
import { plannerRepository } from '../services/plannerService';

describe('Phase 2A — Dashboard Page UI Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
  });

  it('1. Successfully renders Dashboard header and KPI metric cards in Thai', () => {
    render(<OverviewPage referenceDate="2026-07-20" />);

    expect(screen.getByText('ภาพรวมการผลิตรายสัปดาห์')).toBeInTheDocument();
    expect(screen.getByText('PO ที่ใช้งาน')).toBeInTheDocument();
    expect(screen.getAllByText('ยังไม่วางแผน').length).toBeGreaterThan(0);
    expect(screen.getByText('PO เร่งด่วน')).toBeInTheDocument();
    expect(screen.getByText('ใกล้กำหนดส่ง')).toBeInTheDocument();
    expect(screen.getByText('เกินกำหนดส่ง')).toBeInTheDocument();
    expect(screen.getByText('ผลิตไม่ครบ')).toBeInTheDocument();

  });

  it('2. Renders Sales Order breakdown and Urgent FG section', () => {
    render(<OverviewPage referenceDate="2026-07-20" />);

    expect(screen.getByText('ภาพรวมความคืบหน้าใบสั่งซื้อ')).toBeInTheDocument();
    expect(screen.getByText('รายการ FG เร่งด่วน (Urgent Items)')).toBeInTheDocument();
  });

  it('3. Displays EmptyState when no shortfalls exist', () => {
    render(<OverviewPage referenceDate="2026-07-20" />);

    expect(screen.getByText('รายการผลิตไม่ครบล่าสุด')).toBeInTheDocument();
    expect(screen.getByText('ไม่มีรายการผลิตไม่ครบ')).toBeInTheDocument();
  });

  it('4. Successfully renders OverviewPage header and summary cards', () => {
    render(<OverviewPage referenceDate="2026-07-20" />);

    expect(screen.getByText('ภาพรวมการผลิตรายสัปดาห์')).toBeInTheDocument();
    expect(screen.getByText('PO ที่ใช้งาน')).toBeInTheDocument();
  });

  it('5. Handles repository error gracefully without crashing', async () => {
    vi.spyOn(plannerRepository, 'getDashboardSummary').mockImplementation(() => {
      throw new Error('Simulated database fetch failure');
    });

    render(<OverviewPage referenceDate="2026-07-20" />);

    expect(await screen.findByText('เกิดข้อผิดพลาดในการโหลดภาพรวม')).toBeInTheDocument();
    expect(await screen.findByText('ไม่สามารถโหลดข้อมูลภาพรวมระบบได้ กรุณาลองใหม่อีกครั้ง')).toBeInTheDocument();
  });
});
