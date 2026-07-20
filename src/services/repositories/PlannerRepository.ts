import { DatabaseSchema } from '../databaseSchema';
import {
  Priority,
  SalesOrder,
  SalesOrderLine,
  SourceType,
  WipPrepItem,
  WeeklyPlan,
  PlanAllocation,
  ProductionActualEntry,
  ActualEntryType,
  ProductionStatus,
  DueStatus,
  Room,
  BoardNote,
  CustomerMaster,
  ProductMaster,
} from '../../domain/types';

export interface CreateCustomerInput {
  customerCode: string;
  customerName: string;
}

export interface UpdateCustomerInput {
  customerCode?: string;
  customerName?: string;
}

export interface CreateCustomerResult {
  success: boolean;
  customer?: CustomerMaster;
  errors?: string[];
}

export interface UpdateCustomerResult {
  success: boolean;
  customer?: CustomerMaster;
  errors?: string[];
}

export interface SetCustomerActiveResult {
  success: boolean;
  customer?: CustomerMaster;
  errors?: string[];
}

export interface CreateProductInput {
  customerId: string;
  productCode: string;
  productName: string;
  defaultUnit: string;
}

export interface UpdateProductInput {
  customerId?: string;
  productCode?: string;
  productName?: string;
  defaultUnit?: string;
}


export interface CreateProductResult {
  success: boolean;
  product?: ProductMaster;
  errors?: string[];
}

export interface UpdateProductResult {
  success: boolean;
  product?: ProductMaster;
  errors?: string[];
}

export interface SetProductActiveResult {
  success: boolean;
  product?: ProductMaster;
  errors?: string[];
}


export interface CreateSalesOrderHeaderInput {
  poNumber: string;
  customerName: string;
  receivedDate: string; // ISO YYYY-MM-DD
  priority: Priority;
  note?: string;
}

export interface CreateSalesOrderLineInput {
  productCode?: string;
  productName: string;
  orderedQty: number;
  unit: string;
  dueDate: string; // ISO YYYY-MM-DD
  priority?: Priority;
  note?: string;
}

export interface SalesOrderWithLinesDetail {
  order: SalesOrder;
  lines: SalesOrderLine[];
  totalLines: number;
  totalOrderedQty: number;
  totalRemainingQty: number;
}

export interface CreateSalesOrderResult {
  success: boolean;
  order?: SalesOrder;
  errors?: string[];
}

export interface CreateWipPrepItemInput {
  itemType: SourceType.WIP | SourceType.PREP;
  itemCode?: string;
  itemName: string;
  defaultUnit: string;
  relatedProduct?: string;
  note?: string;
}

export interface UpdateWipPrepItemInput {
  itemType?: SourceType.WIP | SourceType.PREP;
  itemCode?: string;
  itemName?: string;
  defaultUnit?: string;
  relatedProduct?: string;
  note?: string;
}

export interface CreateWipPrepItemResult {
  success: boolean;
  item?: WipPrepItem;
  errors?: string[];
}

export interface UpdateWipPrepItemResult {
  success: boolean;
  item?: WipPrepItem;
  errors?: string[];
}

export interface CreateDraftPlanResult {
  success: boolean;
  plan?: WeeklyPlan;
  errors?: string[];
}

export interface PublishPlanResult {
  success: boolean;
  plan?: WeeklyPlan;
  errors?: string[];
}

export interface CancelDraftPlanResult {
  success: boolean;
  plan?: WeeklyPlan;
  errors?: string[];
}

export interface CreateFgAllocationInput {
  planId: string;
  salesOrderId: string;
  salesOrderLineId: string;
  productionDate: string; // ISO YYYY-MM-DD
  roomId: string; // R1, R2, R3, R4
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
}

export interface CreateWipPrepAllocationInput {
  planId: string;
  wipPrepItemId: string;
  productionDate: string; // ISO YYYY-MM-DD
  roomId: string; // R1, R2, R3, R4
  plannedQty: number;
  unit?: string;
  plannedUnit?: string;
  note?: string;
  printCustomerTag?: string;
  printNote?: string;
  highlightOnPlan?: boolean;
  displayOrder?: number;
}

export interface UpdateAllocationInput {
  productionDate?: string;
  roomId?: string;
  plannedQty?: number;
  unit?: string;
  plannedUnit?: string;
  fgOutputQty?: number;
  fgOutputUnit?: string;
  note?: string;
  printCustomerTag?: string;
  printNote?: string;
  highlightOnPlan?: boolean;
  displayOrder?: number;
}

export interface CreateBoardNoteInput {
  planId: string;
  productionDate: string; // ISO YYYY-MM-DD
  roomId: string; // R1, R2, R3, R4
  noteText: string;
  highlightOnPlan?: boolean;
  displayOrder?: number;
}

export interface UpdateBoardNoteInput {
  noteText?: string;
  highlightOnPlan?: boolean;
  displayOrder?: number;
}

export interface CreateBoardNoteResult {
  success: boolean;
  note?: BoardNote;
  errors?: string[];
}

export interface UpdateBoardNoteResult {
  success: boolean;
  note?: BoardNote;
  errors?: string[];
}

export interface RemoveBoardNoteResult {
  success: boolean;
  errors?: string[];
}

export interface CreateAllocationResult {
  success: boolean;
  allocation?: PlanAllocation;
  errors?: string[];
}

export interface UpdateAllocationResult {
  success: boolean;
  allocation?: PlanAllocation;
  errors?: string[];
}

export interface RemoveAllocationResult {
  success: boolean;
  errors?: string[];
}

export interface CreatePlanRevisionResult {
  success: boolean;
  plan?: WeeklyPlan;
  errors?: string[];
}

export interface PublishPlanRevisionResult {
  success: boolean;
  plan?: WeeklyPlan;
  errors?: string[];
}

export interface CancelPlanRevisionResult {
  success: boolean;
  plan?: WeeklyPlan;
  errors?: string[];
}

export interface AppendProductionActualInput {
  allocationId: string;
  entryType: ActualEntryType;
  goodQty: number;
  wasteQty: number;
  reworkQty: number;
  shortfallQty: number;
  shortfallReason?: string;
  recordedBy?: string;
}

export interface AppendProductionActualResult {
  success: boolean;
  actualEntry?: ProductionActualEntry;
  errors?: string[];
}

export interface AllocationActualSummaryDetail {
  plannedQty: number;
  totalGoodQty: number;
  totalWasteQty: number;
  totalReworkQty: number;
  totalShortfallQty: number;
  remainingToProduce: number;
  status: ProductionStatus;
}

export interface PlanningQueueFgItem {
  salesOrderId: string;
  salesOrderLineId: string;
  poNumber: string;
  customerName: string;
  productCode: string;
  productName: string;
  orderedQty: number;
  plannedQty: number;
  remainingQty: number;
  unit: string;
  dueDate: string;
  priority: Priority;
  dueStatus: DueStatus;
}

export interface RecentShortfallItem {
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

export interface DashboardSummaryDetail {
  activePoCount: number;
  totalPoLineCount: number;
  unplannedLineCount: number;
  partiallyPlannedLineCount: number;
  fullyPlannedLineCount: number;
  urgentLineCount: number;
  draftPlanCount: number;
  publishedPlanCount: number;
  inProgressActualCount: number;
  shortfallCount: number;
  urgentFgLines: PlanningQueueFgItem[];
  recentShortfalls: RecentShortfallItem[];
}

export interface PlanningQueueDataDetail {
  fgItems: PlanningQueueFgItem[];
  wipPrepItems: WipPrepItem[];
}

export interface PlanningBoardStatusSummary {
  totalAllocations: number;
  notStartedCount: number;
  inProgressCount: number;
  completedCount: number;
  shortfallCount: number;
}

export interface PlanningBoardDataDetail {
  activePlan: WeeklyPlan | null;
  plansInWeek: WeeklyPlan[];
  allocations: PlanAllocation[];
  boardNotes: BoardNote[];
  rooms: Room[];
  days: string[];
  statusSummary: PlanningBoardStatusSummary;
}

export interface ProductionActualAllocationItemDetail {
  allocation: PlanAllocation;
  actualSummary: AllocationActualSummaryDetail;
  room: Room | null;
  productionDate: string;
  displayName: string;
  sourceType: SourceType;
}

export interface ProductionActualWeekDataDetail {
  activePublishedPlan: WeeklyPlan | null;
  allocations: ProductionActualAllocationItemDetail[];
}

export interface PlannerRepository {
  /**
   * Initializes the repository with seed data if no data exists.
   */
  initialize(): void;

  /**
   * Returns a complete, decoupled deep-copy snapshot of the database schema.
   */
  getSnapshot(): DatabaseSchema;

  /**
   * Deterministically resets the database back to original seed data.
   */
  reset(): void;

  /**
   * Returns true if the database key exists and is valid.
   */
  isInitialized(): boolean;

  /**
   * Returns list of all Sales Orders.
   */
  listSalesOrders(): SalesOrder[];

  /**
   * Retrieves a Sales Order with its lines and calculated totals.
   */
  getSalesOrderWithLines(salesOrderId: string): SalesOrderWithLinesDetail | null;

  /**
   * Validates and atomically creates a new Sales Order with its lines.
   */
  createSalesOrderWithLines(
    header: CreateSalesOrderHeaderInput,
    lines: CreateSalesOrderLineInput[]
  ): CreateSalesOrderResult;

  /**
   * Returns list of WIP/PREP items.
   */
  listWipPrepItems(includeInactive?: boolean): WipPrepItem[];

  /**
   * Retrieves a WIP/PREP item by ID.
   */
  getWipPrepItem(itemId: string): WipPrepItem | null;

  /**
   * Validates and creates a new WIP/PREP item.
   */
  createWipPrepItem(input: CreateWipPrepItemInput): CreateWipPrepItemResult;

  /**
   * Validates and updates an existing WIP/PREP item.
   */
  updateWipPrepItem(itemId: string, input: UpdateWipPrepItemInput): UpdateWipPrepItemResult;

  /**
   * Toggles active status of a WIP/PREP item.
   */
  setWipPrepItemActive(itemId: string, active: boolean): boolean;

  /**
   * Lists all plans for a given Monday weekStart date.
   */
  listWeekPlans(weekStart: string): WeeklyPlan[];

  /**
   * Returns the active WeeklyPlan revision for a given weekStart date.
   */
  getActivePlanForWeek(weekStart: string): WeeklyPlan | null;

  /**
   * Creates initial R00 DRAFT WeeklyPlan for a given Monday weekStart date.
   */
  createDraftPlan(weekStart: string): CreateDraftPlanResult;

  /**
   * Publishes a DRAFT plan.
   */
  publishPlan(planId: string): PublishPlanResult;

  /**
   * Cancels a DRAFT plan.
   */
  cancelDraftPlan(planId: string): CancelDraftPlanResult;

  /**
   * Lists all allocations for a specific plan ID.
   */
  listPlanAllocations(planId: string): PlanAllocation[];

  /**
   * Validates and creates an FG allocation in a DRAFT plan.
   */
  createFgAllocation(input: CreateFgAllocationInput): CreateAllocationResult;

  /**
   * Validates and creates a WIP/PREP allocation in a DRAFT plan.
   */
  createWipPrepAllocation(input: CreateWipPrepAllocationInput): CreateAllocationResult;

  /**
   * Validates and updates an allocation in a DRAFT plan.
   */
  updateAllocation(allocationId: string, input: UpdateAllocationInput): UpdateAllocationResult;

  /**
   * Removes an allocation from a DRAFT plan.
   */
  removeAllocation(allocationId: string): RemoveAllocationResult;

  /**
   * Creates a new DRAFT revision plan (R01+) from a PUBLISHED plan, cloning all allocations.
   */
  createPlanRevision(publishedPlanId: string): CreatePlanRevisionResult;

  /**
   * Publishes a DRAFT revision plan and transitions the source plan to SUPERSEDED.
   */
  publishPlanRevision(draftPlanId: string): PublishPlanRevisionResult;

  /**
   * Cancels a DRAFT revision plan, leaving the source PUBLISHED plan intact.
   */
  cancelPlanRevision(draftPlanId: string): CancelPlanRevisionResult;

  /**
   * Lists all actual entries for an allocation ID.
   */
  listProductionActuals(allocationId: string): ProductionActualEntry[];

  /**
   * Appends an actual production entry to an allocation in a PUBLISHED plan.
   */
  appendProductionActual(input: AppendProductionActualInput): AppendProductionActualResult;

  /**
   * Calculates actual production summary and derives status for an allocation.
   */
  getAllocationActualSummary(allocationId: string): AllocationActualSummaryDetail | null;

  /**
   * Assembles high-level metrics, urgent items, and recent shortfalls for Dashboard view.
   */
  getDashboardSummary(referenceDate?: string): DashboardSummaryDetail;

  /**
   * Assembles unallocated FG lines (remainingQty > 0) and active WIP/PREP items for Planning Queue.
   */
  getPlanningQueueData(referenceDate?: string): PlanningQueueDataDetail;

  /**
   * Assembles active plan, rooms, days, allocations, and status summary for Planning Board.
   */
  getPlanningBoardData(weekStart: string): PlanningBoardDataDetail;

  /**
   * Lists all board notes for a specific plan ID.
   */
  listBoardNotes(planId: string): BoardNote[];

  /**
   * Validates and creates a manual board note for a DRAFT plan.
   */
  createBoardNote(input: CreateBoardNoteInput): CreateBoardNoteResult;

  /**
   * Validates and updates a manual board note for a DRAFT plan.
   */
  updateBoardNote(noteId: string, input: UpdateBoardNoteInput): UpdateBoardNoteResult;

  /**
   * Removes a manual board note from a DRAFT plan.
   */
  removeBoardNote(noteId: string): RemoveBoardNoteResult;

  /**
   * Assembles active Published plan allocations with actual summaries for Production Actual screen.
   */
  getProductionActualWeekData(weekStart: string): ProductionActualWeekDataDetail;

  /**
   * Validates and imports full JSON database schema.
   */
  importDatabase(data: unknown): { success: boolean; errors?: string[] };

  /**
   * Customer Master Data Methods
   */
  listCustomers(includeInactive?: boolean): CustomerMaster[];
  createCustomer(input: CreateCustomerInput): CreateCustomerResult;
  updateCustomer(customerId: string, input: UpdateCustomerInput): UpdateCustomerResult;
  setCustomerActive(customerId: string, active: boolean): SetCustomerActiveResult;

  /**
   * Product Master Data Methods
   */
  listProducts(includeInactive?: boolean): ProductMaster[];
  listProductsByCustomer(customerId: string, includeInactive?: boolean): ProductMaster[];
  createProduct(input: CreateProductInput): CreateProductResult;
  updateProduct(productId: string, input: UpdateProductInput): UpdateProductResult;
  setProductActive(productId: string, active: boolean): SetProductActiveResult;
}


