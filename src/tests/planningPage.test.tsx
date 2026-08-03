import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningPage } from '@/features/production/planning/PlanningPage';
import { plannerRepository } from '../services/plannerService';
import { PlanStatus } from '../domain/types';

describe('Phase 3A — Planning Board Shell + Plan Lifecycle UI Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
  });

  it('1. Successfully renders Planning Board title and 4 production rooms', () => {
    render(<PlanningPage />);

    expect(screen.getByText('วางแผนการผลิต (Weekly Planning Board)')).toBeInTheDocument();
    expect(screen.getByText('R1 - ห้องขนม 1')).toBeInTheDocument();
    expect(screen.getByText('R2 - ห้องขนม 2')).toBeInTheDocument();
    expect(screen.getByText('R3 - ห้องผลไม้')).toBeInTheDocument();
    expect(screen.getByText('R4 - ห้องแพ็ค')).toBeInTheDocument();
  });

  it('2. Displays Monday through Saturday rows with empty cell state', () => {
    render(<PlanningPage />);

    expect(screen.getByText('จันทร์')).toBeInTheDocument();
    expect(screen.getByText('อังคาร')).toBeInTheDocument();
    expect(screen.getByText('พุธ')).toBeInTheDocument();
    expect(screen.getByText('พฤหัสบดี')).toBeInTheDocument();
    expect(screen.getByText('ศุกร์')).toBeInTheDocument();
    expect(screen.getByText('เสาร์')).toBeInTheDocument();

    expect(screen.getAllByText('ลากมาวางที่นี่').length).toBe(24); // 6 days * 4 rooms
  });

  it('3. Creates R00 Draft plan when clicking "สร้างแผนฉบับร่าง"', () => {
    render(<PlanningPage />);

    expect(screen.getAllByText('ไม่มีแผน').length).toBeGreaterThan(0);

    const createDraftBtn = screen.getByText('สร้างแผนฉบับร่าง');
    fireEvent.click(createDraftBtn);

    expect(screen.getByText('ฉบับร่าง')).toBeInTheDocument();
    expect(screen.getByText('R00')).toBeInTheDocument();
    expect(screen.getByText('ประกาศใช้แผน')).toBeInTheDocument();
    expect(screen.getByText('ยกเลิกฉบับร่าง')).toBeInTheDocument();

    // Persistence check
    const activePlan = plannerRepository.getActivePlanForWeek('2026-07-20');
    expect(activePlan).not.toBeNull();
    expect(activePlan?.status).toBe(PlanStatus.DRAFT);
  });

  it('4. Publishes Draft plan when clicking "ประกาศใช้แผน"', () => {
    render(<PlanningPage />);

    // Create Draft first
    fireEvent.click(screen.getByText('สร้างแผนฉบับร่าง'));

    // Click Publish
    const publishBtn = screen.getByText('ประกาศใช้แผน');
    fireEvent.click(publishBtn);

    expect(screen.getByText('ประกาศใช้แล้ว')).toBeInTheDocument();
    expect(screen.getByText('สร้างฉบับแก้ไข')).toBeInTheDocument();

    // Persistence check
    const activePlan = plannerRepository.getActivePlanForWeek('2026-07-20');
    expect(activePlan?.status).toBe(PlanStatus.PUBLISHED);
  });

  it('5. Cancels Draft plan when clicking "ยกเลิกฉบับร่าง"', () => {
    render(<PlanningPage />);

    // Create Draft first
    fireEvent.click(screen.getByText('สร้างแผนฉบับร่าง'));

    // Click Cancel Draft
    const cancelBtn = screen.getByText('ยกเลิกฉบับร่าง');
    fireEvent.click(cancelBtn);

    expect(screen.getAllByText('ไม่มีแผน').length).toBeGreaterThan(0);

    // Persistence check
    const activePlan = plannerRepository.getActivePlanForWeek('2026-07-20');
    expect(activePlan).toBeNull();
  });

  it('6. Navigates previous week, next week, and this week', () => {
    render(<PlanningPage />);

    const prevBtn = screen.getByText('สัปดาห์ก่อนหน้า');
    const nextBtn = screen.getByText('สัปดาห์ถัดไป');
    const thisWeekBtn = screen.getByText('สัปดาห์นี้');

    fireEvent.click(nextBtn);
    expect(screen.getAllByText(/27 ก.ค. 2569/).length).toBeGreaterThan(0);

    fireEvent.click(prevBtn);
    expect(screen.getAllByText(/20 ก.ค. 2569/).length).toBeGreaterThan(0);

    fireEvent.click(thisWeekBtn);
    expect(screen.getAllByText(/20 ก.ค. 2569/).length).toBeGreaterThan(0);
  });

  it('7. Resolves date picker selection to Monday weekStart', () => {
    render(<PlanningPage />);

    // Select Wednesday July 22, 2026
    const dateInput = screen.getByTitle('เลือกวันที่ (ระบบจะแปลงเป็นวันจันทร์สัปดาห์นั้น)');
    fireEvent.change(dateInput, { target: { value: '2026-07-22' } });

    // Should resolve to Monday July 20, 2026
    expect(screen.getByText(/20 ก.ค. 2569 – 25 ก.ค. 2569/)).toBeInTheDocument();
  });
});
