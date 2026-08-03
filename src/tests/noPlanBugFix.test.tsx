import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningPage } from '@/features/production/planning/PlanningPage';
import { plannerRepository } from '../services/plannerService';

describe('Bug Fix — Duplicate R00 & Missing Create Draft Plan Button Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
    plannerRepository.initialize();
  });

  it('1. Week without active plan does not show R00 in Revision Selector', async () => {
    render(<PlanningPage />);

    // Navigate to next week with no plans (2026-07-27)
    fireEvent.click(screen.getByText('สัปดาห์ถัดไป'));

    await waitFor(() => {
      expect(screen.queryByText('R00')).not.toBeInTheDocument();
    });
  });

  it('2. Week without active plan displays disabled Revision Selector with "ยังไม่มีฉบับแผน"', async () => {
    render(<PlanningPage />);

    // Navigate to next week
    fireEvent.click(screen.getByText('สัปดาห์ถัดไป'));

    const selector = (await screen.findByLabelText('เลือกฉบับแผน')) as HTMLSelectElement;
    expect(selector).toBeDisabled();
    expect(screen.getByText('ยังไม่มีฉบับแผน')).toBeInTheDocument();
  });

  it('3. Week without active plan displays "สร้างแผนฉบับร่าง" button and "ไม่มีแผน" badge', async () => {
    render(<PlanningPage />);

    fireEvent.click(screen.getByText('สัปดาห์ถัดไป'));

    await waitFor(() => {
      expect(screen.getByText('สร้างแผนฉบับร่าง')).toBeInTheDocument();
      expect(screen.getByText('ไม่มีแผน')).toBeInTheDocument();
    });
  });

  it('4. Week with ONLY Cancelled R00 plan still displays "ไม่มีแผน" and "สร้างแผนฉบับร่าง"', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-27');
    plannerRepository.cancelDraftPlan(draftRes.plan!.id);

    render(<PlanningPage />);

    // Navigate to 2026-07-27 week (which has only Cancelled R00)
    fireEvent.click(screen.getByText('สัปดาห์ถัดไป'));

    await waitFor(() => {
      expect(screen.getByText('สร้างแผนฉบับร่าง')).toBeInTheDocument();
      expect(screen.getByText('ไม่มีแผน')).toBeInTheDocument();
    });

    const selector = screen.getByLabelText('เลือกฉบับแผน') as HTMLSelectElement;
    expect(selector).toBeDisabled();
    expect(screen.getByText('ยังไม่มีฉบับแผน')).toBeInTheDocument();
  });

  it('5. Does not display duplicate R00 options when multiple R00 plans exist in week history', () => {
    const draftRes1 = plannerRepository.createDraftPlan('2026-07-20');
    plannerRepository.cancelDraftPlan(draftRes1.plan!.id);

    // Create a new R00 draft plan
    plannerRepository.createDraftPlan('2026-07-20');

    render(<PlanningPage />);

    const selector = screen.getByLabelText('เลือกฉบับแผน') as HTMLSelectElement;
    const r00Options = Array.from(selector.options).filter((o) => o.text === 'R00');

    // Should only have ONE R00 option
    expect(r00Options).toHaveLength(1);
  });

  it('6. Does not retain stale selectedPlanId when switching weeks', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    plannerRepository.publishPlan(draftRes.plan!.id);
    plannerRepository.createPlanRevision(draftRes.plan!.id); // R01 created in 2026-07-20

    render(<PlanningPage />);

    await waitFor(() => {
      expect(screen.getByText('R01')).toBeInTheDocument();
    });

    // Navigate to next week
    fireEvent.click(screen.getByText('สัปดาห์ถัดไป'));

    // Should reset selectedPlanId and NOT retain R01
    await waitFor(() => {
      expect(screen.getByText('สร้างแผนฉบับร่าง')).toBeInTheDocument();
    });

    expect(screen.queryByText('R01')).not.toBeInTheDocument();
  });
});
