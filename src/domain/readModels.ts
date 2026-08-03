import { Priority, DueStatus, SourceType, ActualEntryType, SalesOrderLine, SalesOrder, PlanAllocation, ProductionActualEntry } from './types';
import { calculateActivePlannedQtyForLine, calculateRemainingQty, getDueStatus } from './calculations';
import { DatabaseEntities } from '@/services/databaseSchema';

export interface OverviewSnapshot {
  entities: DatabaseEntities;
}

export interface OverviewLineItemRow {
  salesOrderId: string;
  salesOrderLineId: string;
  poNumber: string;
  customerName: string;
  productCode: string;
  productName: string;
  orderedQty: number;
  activePlannedQty: number;
  remainingQty: number;
  unit: string;
  dueDate: string;
  priority: Priority;
  dueStatus: DueStatus;
}

export interface OverviewShortfallRow {
  allocationId: string;
  planId: string;
  productionDate: string;
  displayName: string;
  plannedQty: number;
  totalGoodQty: number;
  shortfallQty: number;
  shortfallReason?: string;
  recordedAt: string;
}

export interface OverviewMetricsSummary {
  allLines: OverviewLineItemRow[];
  activePoCount: number;
  totalPoLineCount: number;
  unplannedLines: OverviewLineItemRow[];
  urgentLines: OverviewLineItemRow[];
  dueSoonLines: OverviewLineItemRow[];
  overdueLines: OverviewLineItemRow[];
  shortfallRows: OverviewShortfallRow[];
  totalActualProducedBoxQty: number;
  totalOrderedBoxQty: number;
  totalRemainingBoxQty: number;
  completionRatePct: number;
}

/**
 * Single Source of Truth helper function to calculate line item rows and Overview KPI metrics.
 * Ensures Overview Page KPI Cards and Drilldown Modals use the exact same calculation logic.
 */
export function buildOverviewReadModel(
  snapshot: OverviewSnapshot,
  referenceDate?: string
): OverviewMetricsSummary {
  const refDate = referenceDate || new Date().toISOString().slice(0, 10);
  const plans = snapshot.entities.weeklyPlans;

  // Build all sales order line rows
  const allLines: OverviewLineItemRow[] = snapshot.entities.salesOrderLines
    .map((line: SalesOrderLine): OverviewLineItemRow | null => {
      const order = snapshot.entities.salesOrders.find((o: SalesOrder) => o.id === line.orderId);
      if (!order) return null;

      const activePlannedQty = calculateActivePlannedQtyForLine(line.id, plans);
      const remainingQty = calculateRemainingQty(line.orderedQty, line.cancelledQty, activePlannedQty);
      const dueStatus = getDueStatus(line.dueDate, remainingQty, refDate);

      return {
        salesOrderId: line.orderId,
        salesOrderLineId: line.id,
        poNumber: order.orderNo,
        customerName: order.customerName,
        productCode: line.skuCode,
        productName: line.skuName,
        orderedQty: line.orderedQty,
        activePlannedQty,
        remainingQty,
        unit: line.unit,
        dueDate: line.dueDate,
        priority: line.priority,
        dueStatus,
      };
    })
    .filter((row: OverviewLineItemRow | null): row is OverviewLineItemRow => row !== null);

  const activePoCount = snapshot.entities.salesOrders.length;
  const totalPoLineCount = allLines.length;

  // Calculate actual produced box quantity from FG Production Actuals
  let totalActualProducedBoxQty = 0;
  (snapshot.entities.productionActualEntries || []).forEach((e: ProductionActualEntry) => {
    const alloc = snapshot.entities.planAllocations.find((a: PlanAllocation) => a.allocationId === e.allocationId);
    if (alloc && alloc.sourceType === SourceType.FG) {
      const boxVal = e.boxQty && e.boxQty > 0 ? e.boxQty : e.goodQty;
      totalActualProducedBoxQty += boxVal;
    }
  });

  const totalOrderedBoxQty = snapshot.entities.salesOrderLines.reduce(
    (sum: number, line: SalesOrderLine) => sum + Math.max(0, line.orderedQty - (line.cancelledQty || 0)),
    0
  );
  const totalRemainingBoxQty = Math.max(0, totalOrderedBoxQty - totalActualProducedBoxQty);
  const completionRatePct =
    totalOrderedBoxQty > 0
      ? Math.min(100, Math.round((totalActualProducedBoxQty / totalOrderedBoxQty) * 100))
      : 0;

  // Exact card predicates
  const unplannedLines = allLines.filter((l: OverviewLineItemRow) => l.remainingQty > 0);
  const urgentLines = allLines.filter((l: OverviewLineItemRow) => l.priority === Priority.URGENT);
  const dueSoonLines = allLines.filter((l: OverviewLineItemRow) => l.dueStatus === DueStatus.DUE_SOON);
  const overdueLines = allLines.filter((l: OverviewLineItemRow) => l.dueStatus === DueStatus.OVERDUE);

  // Shortfall rows from final actual entries with shortfall > 0
  const shortfallRows: OverviewShortfallRow[] = snapshot.entities.productionActualEntries
    .filter((e: ProductionActualEntry) => e.entryType === ActualEntryType.FINAL && e.shortfallQty > 0)
    .map((e: ProductionActualEntry): OverviewShortfallRow => {
      const alloc = snapshot.entities.planAllocations.find((a: PlanAllocation) => a.allocationId === e.allocationId);
      let displayName = 'Unknown Item';
      if (alloc) {
        if (alloc.sourceType === SourceType.FG && alloc.salesOrderLineId) {
          const line = snapshot.entities.salesOrderLines.find((l: SalesOrderLine) => l.id === alloc.salesOrderLineId);
          if (line) displayName = line.skuName;
        } else if (alloc.wipPrepItemId) {
          const item = snapshot.entities.wipPrepItems.find((i) => i.itemId === alloc.wipPrepItemId);
          if (item) displayName = item.itemName;
        }
      }

      return {
        allocationId: e.allocationId,
        planId: alloc ? alloc.planId : '',
        productionDate: alloc ? alloc.productionDate : '',
        displayName,
        plannedQty: alloc ? alloc.plannedQty : 0,
        totalGoodQty: e.goodQty,
        shortfallQty: e.shortfallQty,
        shortfallReason: e.shortfallReason,
        recordedAt: e.recordedAt,
      };
    })
    .sort((a: OverviewShortfallRow, b: OverviewShortfallRow) => b.recordedAt.localeCompare(a.recordedAt));

  return {
    allLines,
    activePoCount,
    totalPoLineCount,
    unplannedLines,
    urgentLines,
    dueSoonLines,
    overdueLines,
    shortfallRows,
    totalActualProducedBoxQty,
    totalOrderedBoxQty,
    totalRemainingBoxQty,
    completionRatePct,
  };
}
