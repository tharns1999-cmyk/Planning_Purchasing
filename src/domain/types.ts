export enum Priority {
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
}

export enum PlanStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  SUPERSEDED = 'SUPERSEDED',
  CANCELLED = 'CANCELLED',
}

export enum SourceType {
  FG = 'FG',
  WIP = 'WIP',
  PREP = 'PREP',
}

export enum ActualEntryType {
  PARTIAL = 'PARTIAL',
  FINAL = 'FINAL',
}

export enum ProductionStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED_SHORTFALL = 'CLOSED_SHORTFALL',
}

export enum DueStatus {
  UPCOMING = 'UPCOMING',
  DUE_SOON = 'DUE_SOON',
  OVERDUE = 'OVERDUE',
  PLANNED_COMPLETE = 'PLANNED_COMPLETE',
}

export interface Room {
  id: string;
  name: string;
  description?: string;
}

export interface SalesOrderLine {
  id: string;
  orderId: string;
  skuCode: string;
  skuName: string;
  orderedQty: number;
  cancelledQty: number;
  unit: string;
  dueDate: string; // ISO Date YYYY-MM-DD
  priority: Priority;
  notes?: string;
  packaging?: string;
  completedQty?: number | string;
  shortageQty?: number | string;
  boxQty?: number | string;
}

export interface SalesOrder {
  id: string;
  orderNo: string;
  customerName: string;
  orderDate: string;
  note?: string;
  lines: SalesOrderLine[];
  status?: ProductionStatus | string;
  createdAt: string;
  updatedAt: string;
}


export interface WipPrepItem {
  itemId: string;
  itemType: SourceType.WIP | SourceType.PREP;
  itemCode?: string;
  itemName: string;
  shortName?: string;
  defaultUnit: string;
  relatedProduct?: string;
  note?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanAllocation {
  allocationId: string;
  planId: string;
  sourceType: SourceType;
  salesOrderId?: string;
  salesOrderLineId?: string;
  wipPrepItemId?: string;
  productionDate: string; // ISO Date YYYY-MM-DD
  roomId: string;
  plannedQty: number;
  unit: string;
  plannedUnit?: string;
  fgOutputQty?: number;
  fgOutputUnit?: string;
  note?: string;
  printCustomerTag?: string;
  printNote?: string;
  highlightOnPlan?: boolean;
  displayOrder?: number;
  sourceAllocationId?: string;
  status: ProductionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BoardNote {
  noteId: string;
  planId: string;
  productionDate: string; // ISO Date YYYY-MM-DD
  roomId: string;
  noteText: string;
  highlightOnPlan?: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPlan {
  id: string;
  weekStart: string; // ISO Date YYYY-MM-DD (Monday)
  weekEnd: string; // ISO Date YYYY-MM-DD (Saturday)
  revisionNumber: string; // e.g. "R00", "R01"
  status: PlanStatus;
  allocations: PlanAllocation[];
  sourcePlanId?: string;
  publishedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionActualEntry {
  actualEntryId: string;
  allocationId: string;
  entryType: ActualEntryType;
  goodQty: number;
  wasteQty: number;
  reworkQty: number;
  shortfallQty: number;
  shortfallReason?: string;
  boxQty?: number;
  recordedAt: string;
  recordedBy?: string;
}

export interface CustomerMaster {
  customerId: string;
  customerCode: string;
  customerName: string;
  shortName?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductMaster {
  productId: string;
  productCode: string;
  productName: string;
  shortName?: string;
  defaultUnit: string;
  customerId?: string; // Links product to a customer (optional for legacy products)
  estimatedYieldPerBatch?: number; // ค่าประมาณ FG ต่อ 1 ชุด (เช่น 6 กล่อง/ชุด)
  active: boolean;
  createdAt: string;
  updatedAt: string;
}



