import {
  WeeklyPlan,
  PlanStatus,
  ProductionActualEntry,
  ActualEntryType,
  ProductionStatus,
  DueStatus,
} from './types';

/**
 * Format a Date object to YYYY-MM-DD string format (local time zone)
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string or Date into a normalized Date object at midnight 00:00:00 local time
 */
export function parseDateOnly(dateInput: Date | string): Date {
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  }

  const dateStr = String(dateInput);
  const isoPart = dateStr.split('T')[0] ?? dateStr;
  const parts = isoPart.split('-');

  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }

  const d = new Date(dateInput);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * 1. getProductionWeek(date)
 * Calculates Monday-Saturday production week for a given date.
 * Returns weekStart (Monday) and weekEnd (Saturday) in YYYY-MM-DD format.
 */
export function getProductionWeek(dateInput: Date | string): {
  weekStart: string;
  weekEnd: string;
} {
  const date = parseDateOnly(dateInput);
  const dayOfWeek = date.getDay(); // Sunday=0, Monday=1, ..., Saturday=6

  // Monday = 1, Saturday = 6, Sunday = 7 (belongs to preceding week starting previous Monday)
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(date);
  monday.setDate(date.getDate() - daysSinceMonday);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  return {
    weekStart: formatDateISO(monday),
    weekEnd: formatDateISO(saturday),
  };
}

/**
 * 2. getNextRevisionNumber(current)
 * Increments revision number string (e.g. "R00" -> "R01", "R09" -> "R10").
 */
export function getNextRevisionNumber(current: string): string {
  const cleaned = current.trim();
  const match = cleaned.match(/^R?(\d+)$/i);

  if (!match || !match[1]) {
    return 'R00';
  }

  const num = parseInt(match[1], 10);
  const nextNum = num + 1;
  return `R${String(nextNum).padStart(2, '0')}`;
}

/**
 * 3. getActivePlanRevision(plans)
 * Selects the active plan revision from an array of WeeklyPlan items:
 * - Prioritizes the latest DRAFT plan if available.
 * - If no DRAFT exists, selects the latest PUBLISHED plan.
 * - Filters out SUPERSEDED or CANCELLED plans.
 */
export function getActivePlanRevision(plans: WeeklyPlan[]): WeeklyPlan | null {
  if (!plans || plans.length === 0) return null;

  // Filter out invalid statuses
  const validPlans = plans.filter(
    (p) => p.status === PlanStatus.DRAFT || p.status === PlanStatus.PUBLISHED
  );

  if (validPlans.length === 0) return null;

  // Search for latest DRAFT
  const drafts = validPlans
    .filter((p) => p.status === PlanStatus.DRAFT)
    .sort((a, b) => b.revisionNumber.localeCompare(a.revisionNumber));

  if (drafts.length > 0 && drafts[0]) {
    return drafts[0];
  }

  // Search for latest PUBLISHED
  const published = validPlans
    .filter((p) => p.status === PlanStatus.PUBLISHED)
    .sort((a, b) => b.revisionNumber.localeCompare(a.revisionNumber));

  return published.length > 0 && published[0] ? published[0] : null;
}

/**
 * Helper: Calculate total active allocated quantity for a specific sales order line across active plans.
 * Ensures allocations from PUBLISHED and SUPERSEDED revisions are not double counted!
 */
export function calculateActivePlannedQtyForLine(
  salesOrderLineId: string,
  plans: WeeklyPlan[]
): number {
  const activePlan = getActivePlanRevision(plans);
  if (!activePlan) return 0;

  return activePlan.allocations
    .filter((alloc) => alloc.salesOrderLineId === salesOrderLineId && alloc.fgOutputQty !== undefined)
    .reduce((sum, alloc) => sum + alloc.fgOutputQty!, 0);
}

/**
 * 4. calculateRemainingQty()
 * orderedQty - cancelledQty - activePlannedQty
 * Ensures result is never below 0.
 */
export function calculateRemainingQty(
  orderedQty: number,
  cancelledQty: number,
  activePlannedQty: number
): number {
  const remaining = orderedQty - cancelledQty - activePlannedQty;
  return Math.max(0, remaining);
}

/**
 * 5. getDueStatus()
 * Returns due status based on remaining qty and date-only comparison:
 * - Remaining = 0 -> PLANNED_COMPLETE
 * - Due date before reference date (today) -> OVERDUE
 * - Due date within reference date to +3 days -> DUE_SOON
 * - Due date > 3 days after reference date -> UPCOMING
 */
export function getDueStatus(
  dueDateInput: Date | string,
  remainingQty: number,
  referenceDateInput: Date | string = new Date()
): DueStatus {
  if (remainingQty <= 0) {
    return DueStatus.PLANNED_COMPLETE;
  }

  const dueDate = parseDateOnly(dueDateInput);
  const refDate = parseDateOnly(referenceDateInput);

  const diffTime = dueDate.getTime() - refDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return DueStatus.OVERDUE;
  } else if (diffDays <= 3) {
    return DueStatus.DUE_SOON;
  } else {
    return DueStatus.UPCOMING;
  }
}

/**
 * Validates a ProductionActualEntry according to domain rules:
 * - Quantities (goodQty, wasteQty, reworkQty, shortfallQty) must not be negative (< 0)
 * - FINAL entry with shortfallQty > 0 requires a valid non-empty shortfallReason
 */
export function validateProductionActualEntry(entry: ProductionActualEntry): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (entry.goodQty < 0) errors.push('goodQty must be non-negative');
  if (entry.wasteQty < 0) errors.push('wasteQty must be non-negative');
  if (entry.reworkQty < 0) errors.push('reworkQty must be non-negative');
  if (entry.shortfallQty < 0) errors.push('shortfallQty must be non-negative');

  if (
    entry.entryType === ActualEntryType.FINAL &&
    entry.shortfallQty > 0 &&
    (!entry.shortfallReason || entry.shortfallReason.trim() === '')
  ) {
    errors.push('FINAL entry with shortfallQty > 0 requires a shortfallReason');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 6. deriveProductionStatus()
 * Derives production status from actual entries against target quantity:
 * - No actual entries -> NOT_STARTED
 * - Partial entries only -> IN_PROGRESS
 * - Final entry present:
 *     - Total good qty >= targetQty -> COMPLETED
 *     - Total good qty < targetQty -> CLOSED_SHORTFALL
 */
export function deriveProductionStatus(
  actualEntries: ProductionActualEntry[],
  targetQty: number
): ProductionStatus {
  if (!actualEntries || actualEntries.length === 0) {
    return ProductionStatus.NOT_STARTED;
  }

  const hasFinal = actualEntries.some((e) => e.entryType === ActualEntryType.FINAL);
  const totalGoodQty = actualEntries.reduce((sum, e) => sum + e.goodQty, 0);

  if (!hasFinal) {
    return ProductionStatus.IN_PROGRESS;
  }

  if (totalGoodQty >= targetQty) {
    return ProductionStatus.COMPLETED;
  } else {
    return ProductionStatus.CLOSED_SHORTFALL;
  }
}
