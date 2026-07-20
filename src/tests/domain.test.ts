import { describe, it, expect } from 'vitest';
import {
  Priority,
  PlanStatus,
  SourceType,
  ActualEntryType,
  ProductionStatus,
  DueStatus,
  WeeklyPlan,
  ProductionActualEntry,
  WipPrepItem,
  PlanAllocation,
} from '../domain/types';
import { FIXED_ROOMS } from '../domain/constants';
import {
  getProductionWeek,
  getNextRevisionNumber,
  getActivePlanRevision,
  calculateRemainingQty,
  calculateActivePlannedQtyForLine,
  getDueStatus,
  deriveProductionStatus,
  validateProductionActualEntry,
} from '../domain/calculations';

describe('Phase 1A.1 — Corrected Domain Models & Business Logic', () => {
  describe('Corrected WipPrepItem Model', () => {
    it('instantiates valid WipPrepItem with required fields only', () => {
      const item: WipPrepItem = {
        itemId: 'wip-01',
        itemType: SourceType.WIP,
        itemCode: 'WP-CHK-01',
        itemName: 'ไก่หมักซอส (WIP)',
        defaultUnit: 'กก.',
        relatedProduct: 'ไก่ทอดซอสเกาหลี',
        active: true,
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
      };

      expect(item.itemId).toBe('wip-01');
      expect(item.itemType).toBe(SourceType.WIP);
      expect(item.defaultUnit).toBe('กก.');
      expect(item.active).toBe(true);
    });
  });

  describe('Corrected PlanAllocation Model', () => {
    it('instantiates valid PlanAllocation with sourceType (FG, WIP, PREP)', () => {
      const allocation: PlanAllocation = {
        allocationId: 'alloc-01',
        planId: 'plan-w29',
        sourceType: SourceType.FG,
        salesOrderId: 'so-1001',
        salesOrderLineId: 'sol-01',
        productionDate: '2026-07-20',
        roomId: 'R1',
        plannedQty: 500,
        unit: 'ถุง',
        status: ProductionStatus.NOT_STARTED,
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
      };

      expect(allocation.allocationId).toBe('alloc-01');
      expect(allocation.sourceType).toBe(SourceType.FG);
      expect(allocation.plannedQty).toBe(500);
      expect(allocation.productionDate).toBe('2026-07-20');
    });
  });

  describe('Corrected ProductionActualEntry Model & Validation Rules', () => {
    it('validates non-negative quantities rule', () => {
      const invalidEntry: ProductionActualEntry = {
        actualEntryId: 'act-01',
        allocationId: 'alloc-01',
        entryType: ActualEntryType.PARTIAL,
        goodQty: -10,
        wasteQty: 0,
        reworkQty: 0,
        shortfallQty: 0,
        recordedAt: '2026-07-20T10:00:00Z',
      };

      const result = validateProductionActualEntry(invalidEntry);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('goodQty must be non-negative');
    });

    it('requires shortfallReason for FINAL entry when shortfallQty > 0', () => {
      const entryWithoutReason: ProductionActualEntry = {
        actualEntryId: 'act-02',
        allocationId: 'alloc-01',
        entryType: ActualEntryType.FINAL,
        goodQty: 400,
        wasteQty: 20,
        reworkQty: 0,
        shortfallQty: 80,
        recordedAt: '2026-07-20T16:00:00Z',
      };

      const resultWithout = validateProductionActualEntry(entryWithoutReason);
      expect(resultWithout.isValid).toBe(false);
      expect(resultWithout.errors).toContain(
        'FINAL entry with shortfallQty > 0 requires a shortfallReason'
      );

      const entryWithReason: ProductionActualEntry = {
        ...entryWithoutReason,
        shortfallReason: 'วัตถุดิบไม่เพียงพอจากซัพพลายเออร์',
      };

      const resultWith = validateProductionActualEntry(entryWithReason);
      expect(resultWith.isValid).toBe(true);
    });
  });

  describe('Constants & Enums', () => {
    it('defines 4 fixed production rooms (R1 to R4)', () => {
      expect(FIXED_ROOMS).toHaveLength(4);
      expect(FIXED_ROOMS.map((r) => r.id)).toEqual(['R1', 'R2', 'R3', 'R4']);
      expect(FIXED_ROOMS[0]!.name).toBe('ห้องขนม 1');
      expect(FIXED_ROOMS[1]!.name).toBe('ห้องขนม 2');
      expect(FIXED_ROOMS[2]!.name).toBe('ห้องผลไม้');
      expect(FIXED_ROOMS[3]!.name).toBe('ห้องแพ็ค');
    });

    it('contains valid Domain Enums', () => {
      expect(Priority.URGENT).toBe('URGENT');
      expect(PlanStatus.PUBLISHED).toBe('PUBLISHED');
      expect(SourceType.WIP).toBe('WIP');
      expect(ActualEntryType.FINAL).toBe('FINAL');
      expect(ProductionStatus.CLOSED_SHORTFALL).toBe('CLOSED_SHORTFALL');
      expect(DueStatus.DUE_SOON).toBe('DUE_SOON');
    });
  });

  describe('1. getProductionWeek(date)', () => {
    it('calculates Monday-Saturday week for a Monday', () => {
      const week = getProductionWeek('2026-07-20');
      expect(week.weekStart).toBe('2026-07-20');
      expect(week.weekEnd).toBe('2026-07-25');
    });

    it('calculates Monday-Saturday week for a Wednesday', () => {
      const week = getProductionWeek(new Date(2026, 6, 22));
      expect(week.weekStart).toBe('2026-07-20');
      expect(week.weekEnd).toBe('2026-07-25');
    });

    it('handles Sunday by attributing to preceding Monday-Saturday week', () => {
      const week = getProductionWeek('2026-07-26');
      expect(week.weekStart).toBe('2026-07-20');
      expect(week.weekEnd).toBe('2026-07-25');
    });
  });

  describe('2. getNextRevisionNumber(current)', () => {
    it('increments R00 to R01', () => {
      expect(getNextRevisionNumber('R00')).toBe('R01');
    });

    it('increments R09 to R10', () => {
      expect(getNextRevisionNumber('R09')).toBe('R10');
    });
  });

  describe('3. getActivePlanRevision(plans)', () => {
    it('selects latest DRAFT plan over PUBLISHED and SUPERSEDED', () => {
      const plans: WeeklyPlan[] = [
        {
          id: '1',
          weekStart: '2026-07-20',
          weekEnd: '2026-07-25',
          revisionNumber: 'R00',
          status: PlanStatus.SUPERSEDED,
          allocations: [],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '2',
          weekStart: '2026-07-20',
          weekEnd: '2026-07-25',
          revisionNumber: 'R01',
          status: PlanStatus.PUBLISHED,
          allocations: [],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '3',
          weekStart: '2026-07-20',
          weekEnd: '2026-07-25',
          revisionNumber: 'R02',
          status: PlanStatus.DRAFT,
          allocations: [],
          createdAt: '',
          updatedAt: '',
        },
      ];

      const active = getActivePlanRevision(plans);
      expect(active?.revisionNumber).toBe('R02');
      expect(active?.status).toBe(PlanStatus.DRAFT);
    });
  });

  describe('4. calculateRemainingQty()', () => {
    it('calculates remaining quantity correctly', () => {
      expect(calculateRemainingQty(100, 10, 30)).toBe(60);
    });

    it('avoids double-counting allocations across multiple revisions', () => {
      const lineId = 'line-101';
      const plans: WeeklyPlan[] = [
        {
          id: 'p1',
          weekStart: '2026-07-20',
          weekEnd: '2026-07-25',
          revisionNumber: 'R00',
          status: PlanStatus.SUPERSEDED,
          allocations: [
            {
              allocationId: 'a1',
              planId: 'p1',
              sourceType: SourceType.FG,
              salesOrderLineId: lineId,
              roomId: 'R1',
              productionDate: '2026-07-20',
              plannedQty: 50,
              unit: 'ถุง',
              status: ProductionStatus.NOT_STARTED,
              createdAt: '',
              updatedAt: '',
            },
          ],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'p2',
          weekStart: '2026-07-20',
          weekEnd: '2026-07-25',
          revisionNumber: 'R01',
          status: PlanStatus.PUBLISHED,
          allocations: [
            {
              allocationId: 'a2',
              planId: 'p2',
              sourceType: SourceType.FG,
              salesOrderLineId: lineId,
              roomId: 'R1',
              productionDate: '2026-07-20',
              plannedQty: 60,
              unit: 'ถุง',
              fgOutputQty: 60,
              fgOutputUnit: 'ถุง',
              status: ProductionStatus.NOT_STARTED,
              createdAt: '',
              updatedAt: '',
            },
          ],
          createdAt: '',
          updatedAt: '',
        },
      ];

      const activeQty = calculateActivePlannedQtyForLine(lineId, plans);
      expect(activeQty).toBe(60); // Only counts active R01 revision

      const remaining = calculateRemainingQty(100, 0, activeQty);
      expect(remaining).toBe(40);
    });
  });

  describe('5. getDueStatus()', () => {
    const refDate = '2026-07-20';

    it('returns PLANNED_COMPLETE when remainingQty is 0', () => {
      expect(getDueStatus('2026-07-15', 0, refDate)).toBe(DueStatus.PLANNED_COMPLETE);
    });

    it('returns OVERDUE when due date is before reference date', () => {
      expect(getDueStatus('2026-07-19', 50, refDate)).toBe(DueStatus.OVERDUE);
    });
  });

  describe('6. deriveProductionStatus()', () => {
    it('returns NOT_STARTED when there are no actual entries', () => {
      expect(deriveProductionStatus([], 100)).toBe(ProductionStatus.NOT_STARTED);
    });

    it('returns IN_PROGRESS when only PARTIAL entries exist', () => {
      const entries: ProductionActualEntry[] = [
        {
          actualEntryId: '1',
          allocationId: 'a1',
          entryType: ActualEntryType.PARTIAL,
          goodQty: 40,
          wasteQty: 0,
          reworkQty: 0,
          shortfallQty: 0,
          recordedAt: '2026-07-20T10:00:00Z',
        },
      ];
      expect(deriveProductionStatus(entries, 100)).toBe(ProductionStatus.IN_PROGRESS);
    });

    it('returns COMPLETED when FINAL entry exists and total goodQty >= targetQty', () => {
      const entries: ProductionActualEntry[] = [
        {
          actualEntryId: '1',
          allocationId: 'a1',
          entryType: ActualEntryType.FINAL,
          goodQty: 100,
          wasteQty: 5,
          reworkQty: 0,
          shortfallQty: 0,
          recordedAt: '2026-07-20T16:00:00Z',
        },
      ];
      expect(deriveProductionStatus(entries, 100)).toBe(ProductionStatus.COMPLETED);
    });

    it('returns CLOSED_SHORTFALL when FINAL entry exists but total goodQty < targetQty', () => {
      const entries: ProductionActualEntry[] = [
        {
          actualEntryId: '1',
          allocationId: 'a1',
          entryType: ActualEntryType.FINAL,
          goodQty: 80,
          wasteQty: 5,
          reworkQty: 0,
          shortfallQty: 20,
          shortfallReason: 'วัตถุดิบหมด',
          recordedAt: '2026-07-20T16:00:00Z',
        },
      ];
      expect(deriveProductionStatus(entries, 100)).toBe(ProductionStatus.CLOSED_SHORTFALL);
    });
  });
});
