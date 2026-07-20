import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ActualsPage } from '../features/actuals/ActualsPage';
import { plannerRepository } from '../services/plannerService';
import { ActualEntryType, ProductionStatus } from '../domain/types';

describe('Phase 4A — Production Actual UI Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    plannerRepository.reset();
    plannerRepository.initialize();
  });

  it('1. Displays Empty State when no Published plan exists for the selected week', async () => {
    // Default 2026-07-20 week has no Published plan initially
    render(<ActualsPage />);

    expect(await screen.findByText('ยังไม่มีแผนที่ประกาศใช้สำหรับบันทึกผลผลิตจริง')).toBeInTheDocument();
  });

  it('2. Displays published allocations when a Published plan exists', async () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 60,
      fgOutputUnit: 'ชิ้น',
    });

    plannerRepository.publishPlan(planId);

    render(<ActualsPage />);

    expect(await screen.findByText('พายไก่ไข่เค็ม 120g')).toBeInTheDocument();
    expect(screen.getByText('ยังไม่เริ่ม')).toBeInTheDocument();
    expect(screen.getByText('บันทึกผลผลิตจริง')).toBeInTheDocument();
  });

  it('3. Logging PARTIAL actual entry updates allocation status to "กำลังผลิต"', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    const allocRes = plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 60,
      fgOutputUnit: 'ชิ้น',
    });

    const allocId = allocRes.allocation!.allocationId;
    plannerRepository.publishPlan(planId);

    const logRes = plannerRepository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 25,
      wasteQty: 1,
      reworkQty: 0,
      shortfallQty: 0,
    });

    expect(logRes.success).toBe(true);

    const summary = plannerRepository.getAllocationActualSummary(allocId);
    expect(summary?.status).toBe(ProductionStatus.IN_PROGRESS);
    expect(summary?.totalGoodQty).toBe(25);
    expect(summary?.totalWasteQty).toBe(1);
  });

  it('4. Logging FINAL actual entry without shortfall updates allocation status to "เสร็จสิ้น"', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    const allocRes = plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 60,
      fgOutputUnit: 'ชิ้น',
    });

    const allocId = allocRes.allocation!.allocationId;
    plannerRepository.publishPlan(planId);

    const logRes = plannerRepository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.FINAL,
      goodQty: 60,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 0,
    });

    expect(logRes.success).toBe(true);

    const summary = plannerRepository.getAllocationActualSummary(allocId);
    expect(summary?.status).toBe(ProductionStatus.COMPLETED);
  });

  it('5. FINAL actual entry with shortfallQty > 0 requires a shortfallReason', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    const allocRes = plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 100,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 100,
      fgOutputUnit: 'ชิ้น',
    });

    const allocId = allocRes.allocation!.allocationId;
    plannerRepository.publishPlan(planId);

    // Missing reason when shortfall > 0
    const failRes = plannerRepository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.FINAL,
      goodQty: 40,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 20,
      shortfallReason: '',
    });

    expect(failRes.success).toBe(false);
    expect(failRes.errors).toContain('FINAL entry with shortfallQty > 0 requires a shortfallReason');

    // Valid with reason
    const passRes = plannerRepository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.FINAL,
      goodQty: 40,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 20,
      shortfallReason: 'วัตถุดิบไม่พอตามรอบ',
    });

    expect(passRes.success).toBe(true);
    const summary = plannerRepository.getAllocationActualSummary(allocId);
    expect(summary?.status).toBe(ProductionStatus.CLOSED_SHORTFALL);
  });

  it('6. Rejects further actual entries after a FINAL entry has been logged', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    const allocRes = plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 60,
      fgOutputUnit: 'ชิ้น',
    });

    const allocId = allocRes.allocation!.allocationId;
    plannerRepository.publishPlan(planId);

    plannerRepository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.FINAL,
      goodQty: 60,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 0,
    });

    // Attempting to append another entry
    const failRes = plannerRepository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 5,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 0,
    });

    expect(failRes.success).toBe(false);
    expect(failRes.errors).toContain('Allocation already has a FINAL actual entry. No further entries allowed.');
  });

  it('7. Rejects negative quantity values', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    const allocRes = plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 60,
      fgOutputUnit: 'ชิ้น',
    });

    const allocId = allocRes.allocation!.allocationId;
    plannerRepository.publishPlan(planId);

    const failRes = plannerRepository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: -10,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 0,
    });

    expect(failRes.success).toBe(false);
    expect(failRes.errors).toContain('Quantities (goodQty, wasteQty, reworkQty, shortfallQty) must be finite non-negative numbers (>= 0)');
  });

  it('8. Summary totals calculate correctly across multiple PARTIAL entries and 1 FINAL entry', () => {
    const draftRes = plannerRepository.createDraftPlan('2026-07-20');
    const planId = draftRes.plan!.id;

    const allocRes = plannerRepository.createFgAllocation({
      planId,
      salesOrderId: 'so-1001',
      salesOrderLineId: 'sol-1001-1',
      productionDate: '2026-07-21',
      roomId: 'R1',
      plannedQty: 10,
      unit: 'ชิ้น',
      plannedUnit: 'ชุด',
      fgOutputQty: 60,
      fgOutputUnit: 'ชิ้น',
    });

    const allocId = allocRes.allocation!.allocationId;
    plannerRepository.publishPlan(planId);

    // Partial 1: 20 good, 2 waste
    plannerRepository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 20,
      wasteQty: 2,
      reworkQty: 1,
      shortfallQty: 0,
    });

    // Partial 2: 25 good, 1 rework
    plannerRepository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.PARTIAL,
      goodQty: 25,
      wasteQty: 0,
      reworkQty: 1,
      shortfallQty: 0,
    });

    // Final 3: 15 good
    plannerRepository.appendProductionActual({
      allocationId: allocId,
      entryType: ActualEntryType.FINAL,
      goodQty: 15,
      wasteQty: 0,
      reworkQty: 0,
      shortfallQty: 0,
    });

    const summary = plannerRepository.getAllocationActualSummary(allocId);
    expect(summary?.totalGoodQty).toBe(60); // 20 + 25 + 15
    expect(summary?.totalWasteQty).toBe(2);
    expect(summary?.totalReworkQty).toBe(2); // 1 + 1
    expect(summary?.totalShortfallQty).toBe(0);
    expect(summary?.status).toBe(ProductionStatus.COMPLETED);
  });
});
