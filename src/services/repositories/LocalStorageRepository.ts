import {
  PlannerRepository,
  CreateSalesOrderHeaderInput,
  CreateSalesOrderLineInput,
  SalesOrderWithLinesDetail,
  CreateSalesOrderResult,
  CreateWipPrepItemInput,
  UpdateWipPrepItemInput,
  CreateWipPrepItemResult,
  UpdateWipPrepItemResult,
  CreateDraftPlanResult,
  PublishPlanResult,
  CancelDraftPlanResult,
  CreateFgAllocationInput,
  CreateWipPrepAllocationInput,
  UpdateAllocationInput,
  CreateAllocationResult,
  UpdateAllocationResult,
  RemoveAllocationResult,
  CreatePlanRevisionResult,
  PublishPlanRevisionResult,
  CancelPlanRevisionResult,
  CreateBoardNoteInput,
  UpdateBoardNoteInput,
  CreateBoardNoteResult,
  UpdateBoardNoteResult,
  RemoveBoardNoteResult,
  AppendProductionActualInput,
  AppendProductionActualResult,
  AllocationActualSummaryDetail,
  DashboardSummaryDetail,
  PlanningQueueDataDetail,
  PlanningQueueFgItem,
  RecentShortfallItem,
  PlanningBoardDataDetail,
  ProductionActualWeekDataDetail,
  ProductionActualAllocationItemDetail,
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateCustomerResult,
  UpdateCustomerResult,
  SetCustomerActiveResult,
  CreateProductInput,
  UpdateProductInput,
  CreateProductResult,
  UpdateProductResult,
  SetProductActiveResult,
} from './PlannerRepository';
import {
  DatabaseSchema,
  DatabaseEntities,
  LOCAL_STORAGE_DB_KEY,
  CURRENT_SCHEMA_VERSION,
} from '../databaseSchema';
import { INITIAL_SEED_DATABASE, SEED_CUSTOMERS, SEED_PRODUCTS } from '../../data/seedData';
import {
  SalesOrder,
  SalesOrderLine,
  SourceType,
  WipPrepItem,
  WeeklyPlan,
  PlanStatus,
  PlanAllocation,
  ProductionStatus,
  ProductionActualEntry,
  ActualEntryType,
  Priority,
  BoardNote,
  CustomerMaster,
  ProductMaster,
} from '../../domain/types';

import {
  calculateActivePlannedQtyForLine,
  calculateRemainingQty,
  parseDateOnly,
  formatDateISO,
  getProductionWeek,
  getActivePlanRevision,
  getNextRevisionNumber,
  deriveProductionStatus,
  getDueStatus,
} from '../../domain/calculations';
import {
  IdGenerator,
  Clock,
  DefaultIdGenerator,
  DefaultClock,
} from '../../utils/idGenerator';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_ROOM_IDS = ['R1', 'R2', 'R3', 'R4'];

export class LocalStorageRepository implements PlannerRepository {
  private readonly storageKey: string;
  private readonly idGenerator: IdGenerator;
  private readonly clock: Clock;

  constructor(
    storageKey: string = LOCAL_STORAGE_DB_KEY,
    idGenerator?: IdGenerator,
    clock?: Clock
  ) {
    this.storageKey = storageKey;
    this.idGenerator = idGenerator || new DefaultIdGenerator();
    this.clock = clock || new DefaultClock();
  }

  public isInitialized(): boolean {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as DatabaseSchema;
      return (
        typeof parsed === 'object' &&
        parsed !== null &&
        parsed.schemaVersion === CURRENT_SCHEMA_VERSION &&
        Boolean(parsed.entities)
      );
    } catch {
      return false;
    }
  }

  public initialize(): void {
    if (!this.isInitialized()) {
      const now = this.clock.nowISO();
      const initialDb: DatabaseSchema = {
        ...structuredClone(INITIAL_SEED_DATABASE),
        initializedAt: now,
        updatedAt: now,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialDb));
    }
  }

  public getSnapshot(): DatabaseSchema {
    if (!this.isInitialized()) {
      this.initialize();
    }
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      throw new Error('Database failed to initialize');
    }
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (parsed.entities) {
      if (!parsed.entities.boardNotes) {
        parsed.entities.boardNotes = [];
      }
      if (!parsed.entities.customers) {
        parsed.entities.customers = structuredClone(SEED_CUSTOMERS);
      }
      if (!parsed.entities.products) {
        parsed.entities.products = structuredClone(SEED_PRODUCTS);
      }
    }
    return structuredClone(parsed);
  }

  public reset(): void {
    const now = this.clock.nowISO();
    const resetDb: DatabaseSchema = {
      ...structuredClone(INITIAL_SEED_DATABASE),
      initializedAt: now,
      updatedAt: now,
    };
    localStorage.setItem(this.storageKey, JSON.stringify(resetDb));
  }

  public importDatabase(data: unknown): { success: boolean; errors?: string[] } {
    if (!data || typeof data !== 'object') {
      return { success: false, errors: ['ไฟล์ข้อมูลไม่ถูกต้อง ไม่พบโครงสร้าง JSON'] };
    }

    const parsed = data as Partial<DatabaseSchema>;

    if (!parsed.entities || typeof parsed.entities !== 'object') {
      return { success: false, errors: ['โครงสร้างไฟล์ JSON ไม่ถูกต้อง ไม่พบส่วน entities'] };
    }

    const requiredKeys: (keyof DatabaseEntities)[] = [
      'rooms',
      'salesOrders',
      'salesOrderLines',
      'wipPrepItems',
      'weeklyPlans',
      'planAllocations',
      'productionActualEntries',
      'boardNotes',
      'customers',
      'products',
    ];


    const missingOrInvalidKeys = requiredKeys.filter(
      (key) => !Array.isArray(parsed.entities![key])
    );

    if (missingOrInvalidKeys.length > 0) {
      return {
        success: false,
        errors: [`ขาดข้อมูลโครงสร้างหลักหรือรูปแบบผิดพลาด: ${missingOrInvalidKeys.join(', ')}`],
      };
    }

    // Validate customerId reference for non-legacy products
    const customerIds = new Set((parsed.entities!.customers || []).map((c) => c.customerId));
    const invalidProductRef = (parsed.entities!.products || []).find(
      (p) => p.customerId && !customerIds.has(p.customerId)
    );
    if (invalidProductRef) {
      return {
        success: false,
        errors: [`รหัสลูกค้า '${invalidProductRef.customerId}' สำหรับสินค้า '${invalidProductRef.productCode}' ไม่มีในระบบ`],
      };
    }

    const now = this.clock.nowISO();

    const importedSchema: DatabaseSchema = {
      schemaVersion: parsed.schemaVersion || CURRENT_SCHEMA_VERSION,
      initializedAt: parsed.initializedAt || now,
      updatedAt: now,
      entities: {
        rooms: parsed.entities.rooms!,
        salesOrders: parsed.entities.salesOrders!,
        salesOrderLines: parsed.entities.salesOrderLines!,
        wipPrepItems: parsed.entities.wipPrepItems!,
        weeklyPlans: parsed.entities.weeklyPlans!,
        planAllocations: parsed.entities.planAllocations!,
        productionActualEntries: parsed.entities.productionActualEntries!,
        boardNotes: parsed.entities.boardNotes!,
        customers: parsed.entities.customers!,
        products: parsed.entities.products!,
      },

    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(importedSchema));
      return { success: true };
    } catch {
      return { success: false, errors: ['ไม่สามารถบันทึกข้อมูลลง LocalStorage ได้'] };
    }
  }

  public listSalesOrders(): SalesOrder[] {
    const snapshot = this.getSnapshot();
    return snapshot.entities.salesOrders;
  }

  public getSalesOrderWithLines(salesOrderId: string): SalesOrderWithLinesDetail | null {
    const snapshot = this.getSnapshot();
    const order = snapshot.entities.salesOrders.find((o) => o.id === salesOrderId);
    if (!order) return null;

    const lines = snapshot.entities.salesOrderLines.filter((l) => l.orderId === salesOrderId);
    const totalLines = lines.length;
    const totalOrderedQty = lines.reduce((sum, l) => sum + l.orderedQty, 0);

    const totalRemainingQty = lines.reduce((sum, l) => {
      const activePlannedQty = calculateActivePlannedQtyForLine(
        l.id,
        snapshot.entities.weeklyPlans
      );
      const remaining = calculateRemainingQty(l.orderedQty, l.cancelledQty, activePlannedQty);
      return sum + remaining;
    }, 0);

    return {
      order,
      lines,
      totalLines,
      totalOrderedQty,
      totalRemainingQty,
    };
  }

  public createSalesOrderWithLines(
    header: CreateSalesOrderHeaderInput,
    linesInput: CreateSalesOrderLineInput[]
  ): CreateSalesOrderResult {
    const errors: string[] = [];

    if (!header.poNumber || header.poNumber.trim() === '') {
      errors.push('poNumber is required');
    }

    if (!header.customerName || header.customerName.trim() === '') {
      errors.push('customerName is required');
    }

    if (!header.receivedDate || !ISO_DATE_REGEX.test(header.receivedDate.trim())) {
      errors.push('receivedDate is required and must be YYYY-MM-DD ISO format');
    }

    if (!linesInput || linesInput.length === 0) {
      errors.push('At least 1 product line is required');
    } else {
      linesInput.forEach((line, index) => {
        if (!line.productName || line.productName.trim() === '') {
          errors.push(`Line [${index}]: productName is required`);
        }
        if (!Number.isFinite(line.orderedQty) || line.orderedQty <= 0) {
          errors.push(`Line [${index}]: orderedQty must be a finite positive number (> 0)`);
        }
        if (!line.unit || line.unit.trim() === '') {
          errors.push(`Line [${index}]: unit is required`);
        }
        if (!line.dueDate || !ISO_DATE_REGEX.test(line.dueDate.trim())) {
          errors.push(`Line [${index}]: dueDate is required and must be YYYY-MM-DD ISO format`);
        }
      });
    }

    const snapshot = this.getSnapshot();

    if (header.poNumber && header.poNumber.trim() !== '') {
      const cleanPoNumber = header.poNumber.trim().toLowerCase();
      const duplicate = snapshot.entities.salesOrders.some(
        (existing) => existing.orderNo.trim().toLowerCase() === cleanPoNumber
      );
      if (duplicate) {
        errors.push(`poNumber '${header.poNumber.trim()}' already exists (must be unique)`);
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const now = this.clock.nowISO();
    const salesOrderId = this.idGenerator.generateId('so');

    const createdLines: SalesOrderLine[] = linesInput.map((line) => ({
      id: this.idGenerator.generateId('sol'),
      orderId: salesOrderId,
      skuCode: (line.productCode || '').trim(),
      skuName: line.productName.trim(),
      orderedQty: line.orderedQty,
      cancelledQty: 0,
      unit: line.unit.trim(),
      dueDate: line.dueDate.trim(),
      priority: line.priority || header.priority,
      notes: line.note?.trim(),
    }));

    const createdOrder: SalesOrder = {
      id: salesOrderId,
      orderNo: header.poNumber.trim(),
      customerName: header.customerName.trim(),
      orderDate: header.receivedDate.trim(),
      lines: createdLines,
      createdAt: now,
      updatedAt: now,
    };

    snapshot.entities.salesOrders.push(createdOrder);
    snapshot.entities.salesOrderLines.push(...createdLines);
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      order: createdOrder,
    };
  }

  public listWipPrepItems(includeInactive: boolean = false): WipPrepItem[] {
    const snapshot = this.getSnapshot();
    if (includeInactive) {
      return snapshot.entities.wipPrepItems;
    }
    return snapshot.entities.wipPrepItems.filter((item) => item.active);
  }

  public getWipPrepItem(itemId: string): WipPrepItem | null {
    const snapshot = this.getSnapshot();
    const item = snapshot.entities.wipPrepItems.find((i) => i.itemId === itemId);
    return item || null;
  }

  public createWipPrepItem(input: CreateWipPrepItemInput): CreateWipPrepItemResult {
    const errors: string[] = [];

    if (!input.itemType || (input.itemType !== SourceType.WIP && input.itemType !== SourceType.PREP)) {
      errors.push('itemType must be WIP or PREP');
    }

    if (!input.itemName || input.itemName.trim() === '') {
      errors.push('itemName is required');
    }

    if (!input.defaultUnit || input.defaultUnit.trim() === '') {
      errors.push('defaultUnit is required');
    }

    const snapshot = this.getSnapshot();

    if (input.itemCode && input.itemCode.trim() !== '') {
      const cleanCode = input.itemCode.trim().toLowerCase();
      const duplicate = snapshot.entities.wipPrepItems.some(
        (existing) => existing.itemCode && existing.itemCode.trim().toLowerCase() === cleanCode
      );
      if (duplicate) {
        errors.push(`itemCode '${input.itemCode.trim()}' already exists (must be unique)`);
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const now = this.clock.nowISO();
    const newItemId = this.idGenerator.generateId('wip');

    const createdItem: WipPrepItem = {
      itemId: newItemId,
      itemType: input.itemType,
      itemCode: input.itemCode?.trim() || undefined,
      itemName: input.itemName.trim(),
      defaultUnit: input.defaultUnit.trim(),
      relatedProduct: input.relatedProduct?.trim() || undefined,
      note: input.note?.trim() || undefined,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    snapshot.entities.wipPrepItems.push(createdItem);
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      item: createdItem,
    };
  }

  public updateWipPrepItem(itemId: string, input: UpdateWipPrepItemInput): UpdateWipPrepItemResult {
    const snapshot = this.getSnapshot();
    const existing = snapshot.entities.wipPrepItems.find((i) => i.itemId === itemId);

    if (!existing) {
      return { success: false, errors: [`WipPrepItem with id '${itemId}' not found`] };
    }

    const errors: string[] = [];

    if (input.itemType && input.itemType !== SourceType.WIP && input.itemType !== SourceType.PREP) {
      errors.push('itemType must be WIP or PREP');
    }

    if (input.itemName !== undefined && input.itemName.trim() === '') {
      errors.push('itemName cannot be empty');
    }

    if (input.defaultUnit !== undefined && input.defaultUnit.trim() === '') {
      errors.push('defaultUnit cannot be empty');
    }

    if (input.itemCode && input.itemCode.trim() !== '') {
      const cleanCode = input.itemCode.trim().toLowerCase();
      const duplicate = snapshot.entities.wipPrepItems.some(
        (i) => i.itemId !== itemId && i.itemCode && i.itemCode.trim().toLowerCase() === cleanCode
      );
      if (duplicate) {
        errors.push(`itemCode '${input.itemCode.trim()}' already exists (must be unique)`);
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const now = this.clock.nowISO();

    if (input.itemType) existing.itemType = input.itemType;
    if (input.itemName !== undefined) existing.itemName = input.itemName.trim();
    if (input.defaultUnit !== undefined) existing.defaultUnit = input.defaultUnit.trim();
    if (input.itemCode !== undefined) {
      existing.itemCode = input.itemCode.trim() !== '' ? input.itemCode.trim() : undefined;
    }
    if (input.relatedProduct !== undefined) {
      existing.relatedProduct = input.relatedProduct.trim() !== '' ? input.relatedProduct.trim() : undefined;
    }
    if (input.note !== undefined) {
      existing.note = input.note.trim() !== '' ? input.note.trim() : undefined;
    }

    existing.updatedAt = now;
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      item: existing,
    };
  }

  public setWipPrepItemActive(itemId: string, active: boolean): boolean {
    const snapshot = this.getSnapshot();
    const item = snapshot.entities.wipPrepItems.find((i) => i.itemId === itemId);

    if (!item) return false;

    const now = this.clock.nowISO();
    item.active = active;
    item.updatedAt = now;
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
    return true;
  }

  public listWeekPlans(weekStart: string): WeeklyPlan[] {
    const snapshot = this.getSnapshot();
    const cleanWeek = weekStart.trim();
    return snapshot.entities.weeklyPlans.filter((p) => p.weekStart === cleanWeek);
  }

  public getActivePlanForWeek(weekStart: string): WeeklyPlan | null {
    const plans = this.listWeekPlans(weekStart);
    return getActivePlanRevision(plans);
  }

  public createDraftPlan(weekStart: string): CreateDraftPlanResult {
    const cleanWeek = weekStart.trim();
    const errors: string[] = [];

    if (!ISO_DATE_REGEX.test(cleanWeek)) {
      errors.push('weekStart must be YYYY-MM-DD ISO format');
    } else {
      const date = parseDateOnly(cleanWeek);
      if (date.getDay() !== 1) {
        errors.push('weekStart must be a Monday');
      }
    }

    const existingPlans = this.listWeekPlans(cleanWeek);
    const hasDraft = existingPlans.some((p) => p.status === PlanStatus.DRAFT);
    if (hasDraft) {
      errors.push(`A DRAFT plan already exists for week starting ${cleanWeek}`);
    }

    const hasPublished = existingPlans.some((p) => p.status === PlanStatus.PUBLISHED);
    if (hasPublished) {
      errors.push(`A PUBLISHED plan already exists for week starting ${cleanWeek}. New revision creation must be handled explicitly.`);
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const snapshot = this.getSnapshot();
    const weekInfo = getProductionWeek(cleanWeek);
    const now = this.clock.nowISO();
    const planId = this.idGenerator.generateId('plan');

    const newPlan: WeeklyPlan = {
      id: planId,
      weekStart: cleanWeek,
      weekEnd: weekInfo.weekEnd,
      revisionNumber: 'R00',
      status: PlanStatus.DRAFT,
      allocations: [],
      createdAt: now,
      updatedAt: now,
    };

    snapshot.entities.weeklyPlans.push(newPlan);
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      plan: newPlan,
    };
  }

  public publishPlan(planId: string): PublishPlanResult {
    const snapshot = this.getSnapshot();
    const plan = snapshot.entities.weeklyPlans.find((p) => p.id === planId);

    if (!plan) {
      return { success: false, errors: [`WeeklyPlan with id '${planId}' not found`] };
    }

    if (plan.status !== PlanStatus.DRAFT) {
      return { success: false, errors: [`Only DRAFT plans can be published (current status: ${plan.status})`] };
    }

    const now = this.clock.nowISO();
    plan.status = PlanStatus.PUBLISHED;
    plan.publishedAt = now;
    plan.updatedAt = now;
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      plan,
    };
  }

  public cancelDraftPlan(planId: string): CancelDraftPlanResult {
    const snapshot = this.getSnapshot();
    const plan = snapshot.entities.weeklyPlans.find((p) => p.id === planId);

    if (!plan) {
      return { success: false, errors: [`WeeklyPlan with id '${planId}' not found`] };
    }

    if (plan.status !== PlanStatus.DRAFT) {
      return { success: false, errors: [`Only DRAFT plans can be cancelled (current status: ${plan.status})`] };
    }

    const now = this.clock.nowISO();
    plan.status = PlanStatus.CANCELLED;
    plan.cancelledAt = now;
    plan.updatedAt = now;
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      plan,
    };
  }

  public listPlanAllocations(planId: string): PlanAllocation[] {
    const snapshot = this.getSnapshot();
    const plan = snapshot.entities.weeklyPlans.find((p) => p.id === planId);
    return plan ? plan.allocations : [];
  }

  private validateCommonAllocation(
    plan: WeeklyPlan,
    productionDate: string,
    roomId: string,
    plannedQty: number,
    unit: string
  ): string[] {
    const errors: string[] = [];

    if (plan.status !== PlanStatus.DRAFT) {
      errors.push(`Plan must be in DRAFT status to modify allocations (current status: ${plan.status})`);
    }

    const cleanDate = productionDate.trim();
    if (!ISO_DATE_REGEX.test(cleanDate)) {
      errors.push('productionDate must be YYYY-MM-DD ISO format');
    } else if (cleanDate < plan.weekStart || cleanDate > plan.weekEnd) {
      errors.push(`productionDate (${cleanDate}) must be between plan weekStart (${plan.weekStart}) and weekEnd (${plan.weekEnd})`);
    }

    const cleanRoom = roomId.trim();
    if (!VALID_ROOM_IDS.includes(cleanRoom)) {
      errors.push(`roomId '${cleanRoom}' must be one of R1, R2, R3, R4`);
    }

    if (!Number.isFinite(plannedQty) || plannedQty <= 0) {
      errors.push('plannedQty must be a finite positive number (> 0)');
    }

    if (!unit || unit.trim() === '') {
      errors.push('unit is required');
    }

    return errors;
  }

  public createFgAllocation(input: CreateFgAllocationInput): CreateAllocationResult {
    const snapshot = this.getSnapshot();
    const plan = snapshot.entities.weeklyPlans.find((p) => p.id === input.planId);

    if (!plan) {
      return { success: false, errors: [`WeeklyPlan with id '${input.planId}' not found`] };
    }

    const errors = this.validateCommonAllocation(
      plan,
      input.productionDate,
      input.roomId,
      input.plannedQty,
      input.unit
    );

    const order = snapshot.entities.salesOrders.find((o) => o.id === input.salesOrderId);
    if (!order) {
      errors.push(`SalesOrder with id '${input.salesOrderId}' not found`);
    }

    const line = snapshot.entities.salesOrderLines.find((l) => l.id === input.salesOrderLineId);
    if (!line) {
      errors.push(`SalesOrderLine with id '${input.salesOrderLineId}' not found`);
    } else if (line.orderId !== input.salesOrderId) {
      errors.push(`SalesOrderLine '${input.salesOrderLineId}' does not belong to SalesOrder '${input.salesOrderId}'`);
    }

    const outputQty = input.fgOutputQty;
    const outputUnit = (input.fgOutputUnit || input.unit)?.trim();

    if (outputQty === undefined || outputQty === null) {
      errors.push('fgOutputQty is required for FG allocations');
    } else if (!Number.isFinite(outputQty) || outputQty <= 0) {
      errors.push('fgOutputQty must be a finite positive number (> 0)');
    }

    if (!outputUnit || outputUnit === '') {
      errors.push('fgOutputUnit is required for FG allocations');
    }

    if (line) {
      if (outputUnit && outputUnit !== line.unit.trim()) {
        errors.push(`fgOutputUnit must match PO Line unit (${line.unit})`);
      }

      if (outputQty !== undefined && Number.isFinite(outputQty) && outputQty > 0) {
        const activePlannedQty = calculateActivePlannedQtyForLine(line.id, snapshot.entities.weeklyPlans);
        const remainingQty = calculateRemainingQty(line.orderedQty, line.cancelledQty, activePlannedQty);

        if (outputQty > remainingQty) {
          errors.push(`fgOutputQty (${outputQty}) exceeds remaining unallocated quantity (${remainingQty})`);
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const now = this.clock.nowISO();
    const allocId = this.idGenerator.generateId('alloc');

    const newAlloc: PlanAllocation = {
      allocationId: allocId,
      planId: plan.id,
      sourceType: SourceType.FG,
      salesOrderId: input.salesOrderId,
      salesOrderLineId: input.salesOrderLineId,
      productionDate: input.productionDate.trim(),
      roomId: input.roomId.trim(),
      plannedQty: input.plannedQty,
      unit: line ? line.unit : outputUnit!,
      plannedUnit: (input.plannedUnit || input.unit || 'ชุด').trim(),
      fgOutputQty: outputQty!,
      fgOutputUnit: line ? line.unit : outputUnit!,
      note: input.note?.trim() || undefined,
      printCustomerTag: input.printCustomerTag?.trim() || undefined,
      printNote: input.printNote?.trim() || undefined,
      highlightOnPlan: Boolean(input.highlightOnPlan),
      displayOrder: input.displayOrder,
      status: ProductionStatus.NOT_STARTED,
      createdAt: now,
      updatedAt: now,
    };

    plan.allocations.push(newAlloc);
    snapshot.entities.planAllocations.push(newAlloc);
    plan.updatedAt = now;
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      allocation: newAlloc,
    };
  }

  public createWipPrepAllocation(input: CreateWipPrepAllocationInput): CreateAllocationResult {
    const snapshot = this.getSnapshot();
    const plan = snapshot.entities.weeklyPlans.find((p) => p.id === input.planId);

    if (!plan) {
      return { success: false, errors: [`WeeklyPlan with id '${input.planId}' not found`] };
    }

    const masterItem = snapshot.entities.wipPrepItems.find((i) => i.itemId === input.wipPrepItemId);
    if (!masterItem || !masterItem.active) {
      return { success: false, errors: [`WipPrepItem with id '${input.wipPrepItemId}' not found or inactive`] };
    }

    const unit = input.unit?.trim() || masterItem.defaultUnit;

    const errors = this.validateCommonAllocation(
      plan,
      input.productionDate,
      input.roomId,
      input.plannedQty,
      unit
    );

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const now = this.clock.nowISO();
    const allocId = this.idGenerator.generateId('alloc');

    const newAlloc: PlanAllocation = {
      allocationId: allocId,
      planId: plan.id,
      sourceType: masterItem.itemType,
      wipPrepItemId: input.wipPrepItemId,
      productionDate: input.productionDate.trim(),
      roomId: input.roomId.trim(),
      plannedQty: input.plannedQty,
      unit,
      plannedUnit: (input.plannedUnit || unit).trim(),
      note: input.note?.trim() || undefined,
      printCustomerTag: input.printCustomerTag?.trim() || undefined,
      printNote: input.printNote?.trim() || undefined,
      highlightOnPlan: Boolean(input.highlightOnPlan),
      displayOrder: input.displayOrder,
      status: ProductionStatus.NOT_STARTED,
      createdAt: now,
      updatedAt: now,
    };

    plan.allocations.push(newAlloc);
    snapshot.entities.planAllocations.push(newAlloc);
    plan.updatedAt = now;
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      allocation: newAlloc,
    };
  }

  public updateAllocation(allocationId: string, input: UpdateAllocationInput): UpdateAllocationResult {
    const snapshot = this.getSnapshot();
    const alloc = snapshot.entities.planAllocations.find((a) => a.allocationId === allocationId);

    if (!alloc) {
      return { success: false, errors: [`PlanAllocation with id '${allocationId}' not found`] };
    }

    const plan = snapshot.entities.weeklyPlans.find((p) => p.id === alloc.planId);
    if (!plan) {
      return { success: false, errors: ['Parent WeeklyPlan not found'] };
    }

    if (plan.status !== PlanStatus.DRAFT) {
      return { success: false, errors: [`Cannot modify allocation in a ${plan.status} plan`] };
    }

    const newDate = input.productionDate !== undefined ? input.productionDate.trim() : alloc.productionDate;
    const newRoom = input.roomId !== undefined ? input.roomId.trim() : alloc.roomId;
    const newQty = input.plannedQty !== undefined ? input.plannedQty : alloc.plannedQty;
    const currentAllocOutputQty = alloc.fgOutputQty ?? alloc.plannedQty;
    const newOutputQty =
      input.fgOutputQty !== undefined
        ? input.fgOutputQty
        : currentAllocOutputQty;

    const errors: string[] = [];

    if (!ISO_DATE_REGEX.test(newDate) || newDate < plan.weekStart || newDate > plan.weekEnd) {
      errors.push(`productionDate (${newDate}) must be between plan weekStart (${plan.weekStart}) and weekEnd (${plan.weekEnd})`);
    }

    if (!VALID_ROOM_IDS.includes(newRoom)) {
      errors.push(`roomId '${newRoom}' must be one of R1, R2, R3, R4`);
    }

    if (!Number.isFinite(newQty) || newQty <= 0) {
      errors.push('plannedQty must be a finite positive number (> 0)');
    }

    if (alloc.sourceType === SourceType.FG && alloc.salesOrderLineId) {
      if (newOutputQty <= 0) {
        errors.push('fgOutputQty must be a finite positive number (> 0)');
      }

      const line = snapshot.entities.salesOrderLines.find((l) => l.id === alloc.salesOrderLineId);
      if (line) {
        const activePlannedQty = calculateActivePlannedQtyForLine(line.id, snapshot.entities.weeklyPlans);
        const currentRemaining = calculateRemainingQty(line.orderedQty, line.cancelledQty, activePlannedQty);
        const maxAllowed = currentRemaining + currentAllocOutputQty;

        if (newOutputQty > maxAllowed) {
          errors.push(`fgOutputQty (${newOutputQty}) exceeds available remaining quantity (${maxAllowed})`);
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const now = this.clock.nowISO();
    alloc.productionDate = newDate;
    alloc.roomId = newRoom;
    alloc.plannedQty = newQty;
    if (alloc.sourceType === SourceType.FG) {
      alloc.fgOutputQty = newOutputQty;
      if (input.fgOutputUnit !== undefined) {
        alloc.fgOutputUnit = input.fgOutputUnit.trim();
      }
    }
    if (input.plannedUnit !== undefined) {
      alloc.plannedUnit = input.plannedUnit.trim();
    }
    if (input.unit !== undefined) {
      alloc.unit = input.unit.trim();
    }
    if (input.note !== undefined) {
      alloc.note = input.note.trim() !== '' ? input.note.trim() : undefined;
    }
    if (input.printCustomerTag !== undefined) {
      alloc.printCustomerTag = input.printCustomerTag.trim() !== '' ? input.printCustomerTag.trim() : undefined;
    }
    if (input.printNote !== undefined) {
      alloc.printNote = input.printNote.trim() !== '' ? input.printNote.trim() : undefined;
    }
    if (input.highlightOnPlan !== undefined) {
      alloc.highlightOnPlan = Boolean(input.highlightOnPlan);
    }
    if (input.displayOrder !== undefined) {
      alloc.displayOrder = input.displayOrder;
    }
    alloc.updatedAt = now;

    const planAllocIndex = plan.allocations.findIndex((a) => a.allocationId === allocationId);
    if (planAllocIndex !== -1) {
      plan.allocations[planAllocIndex] = alloc;
    }

    plan.updatedAt = now;
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      allocation: alloc,
    };
  }

  public removeAllocation(allocationId: string): RemoveAllocationResult {
    const snapshot = this.getSnapshot();
    const alloc = snapshot.entities.planAllocations.find((a) => a.allocationId === allocationId);

    if (!alloc) {
      return { success: false, errors: [`PlanAllocation with id '${allocationId}' not found`] };
    }

    const plan = snapshot.entities.weeklyPlans.find((p) => p.id === alloc.planId);
    if (!plan) {
      return { success: false, errors: ['Parent WeeklyPlan not found'] };
    }

    if (plan.status !== PlanStatus.DRAFT) {
      return { success: false, errors: [`Cannot remove allocation from a ${plan.status} plan`] };
    }

    const now = this.clock.nowISO();
    snapshot.entities.planAllocations = snapshot.entities.planAllocations.filter((a) => a.allocationId !== allocationId);
    plan.allocations = plan.allocations.filter((a) => a.allocationId !== allocationId);

    plan.updatedAt = now;
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return { success: true };
  }

  public createPlanRevision(publishedPlanId: string): CreatePlanRevisionResult {
    const snapshot = this.getSnapshot();
    const sourcePlan = snapshot.entities.weeklyPlans.find((p) => p.id === publishedPlanId);

    if (!sourcePlan) {
      return { success: false, errors: [`WeeklyPlan with id '${publishedPlanId}' not found`] };
    }

    if (sourcePlan.status !== PlanStatus.PUBLISHED) {
      return { success: false, errors: [`Revisions can only be created from a PUBLISHED plan (current status: ${sourcePlan.status})`] };
    }

    const weekPlans = snapshot.entities.weeklyPlans.filter((p) => p.weekStart === sourcePlan.weekStart);

    const publishedPlans = weekPlans
      .filter((p) => p.status === PlanStatus.PUBLISHED)
      .sort((a, b) => b.revisionNumber.localeCompare(a.revisionNumber));

    if (!publishedPlans[0] || publishedPlans[0].id !== sourcePlan.id) {
      return { success: false, errors: [`Can only create revision from the latest PUBLISHED plan of week ${sourcePlan.weekStart}`] };
    }

    const hasDraft = weekPlans.some((p) => p.status === PlanStatus.DRAFT);
    if (hasDraft) {
      return { success: false, errors: [`A DRAFT plan already exists for week starting ${sourcePlan.weekStart}`] };
    }

    const newRevNum = getNextRevisionNumber(sourcePlan.revisionNumber);
    const newPlanId = this.idGenerator.generateId('plan');
    const now = this.clock.nowISO();

    const clonedAllocations: PlanAllocation[] = sourcePlan.allocations.map((alloc) => {
      const newAllocId = this.idGenerator.generateId('alloc');
      return {
        ...structuredClone(alloc),
        allocationId: newAllocId,
        planId: newPlanId,
        sourceAllocationId: alloc.allocationId,
        createdAt: now,
        updatedAt: now,
      };
    });

    const sourceBoardNotes = (snapshot.entities.boardNotes || []).filter((n) => n.planId === sourcePlan.id);
    const clonedBoardNotes: BoardNote[] = sourceBoardNotes.map((note) => {
      const newNoteId = this.idGenerator.generateId('note');
      return {
        ...structuredClone(note),
        noteId: newNoteId,
        planId: newPlanId,
        createdAt: now,
        updatedAt: now,
      };
    });

    const newPlan: WeeklyPlan = {
      id: newPlanId,
      weekStart: sourcePlan.weekStart,
      weekEnd: sourcePlan.weekEnd,
      revisionNumber: newRevNum,
      status: PlanStatus.DRAFT,
      allocations: clonedAllocations,
      sourcePlanId: sourcePlan.id,
      createdAt: now,
      updatedAt: now,
    };

    snapshot.entities.weeklyPlans.push(newPlan);
    snapshot.entities.planAllocations.push(...clonedAllocations);
    if (!snapshot.entities.boardNotes) {
      snapshot.entities.boardNotes = [];
    }
    snapshot.entities.boardNotes.push(...clonedBoardNotes);
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      plan: newPlan,
    };
  }

  public publishPlanRevision(draftPlanId: string): PublishPlanRevisionResult {
    const snapshot = this.getSnapshot();
    const draftPlan = snapshot.entities.weeklyPlans.find((p) => p.id === draftPlanId);

    if (!draftPlan) {
      return { success: false, errors: [`WeeklyPlan with id '${draftPlanId}' not found`] };
    }

    if (draftPlan.status !== PlanStatus.DRAFT) {
      return { success: false, errors: [`Only DRAFT plans can be published (current status: ${draftPlan.status})`] };
    }

    const now = this.clock.nowISO();

    if (draftPlan.sourcePlanId) {
      const sourcePlan = snapshot.entities.weeklyPlans.find((p) => p.id === draftPlan.sourcePlanId);
      if (sourcePlan && sourcePlan.status === PlanStatus.PUBLISHED) {
        sourcePlan.status = PlanStatus.SUPERSEDED;
        sourcePlan.updatedAt = now;
      }
    }

    draftPlan.status = PlanStatus.PUBLISHED;
    draftPlan.publishedAt = now;
    draftPlan.updatedAt = now;
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      plan: draftPlan,
    };
  }

  public cancelPlanRevision(draftPlanId: string): CancelPlanRevisionResult {
    const snapshot = this.getSnapshot();
    const draftPlan = snapshot.entities.weeklyPlans.find((p) => p.id === draftPlanId);

    if (!draftPlan) {
      return { success: false, errors: [`WeeklyPlan with id '${draftPlanId}' not found`] };
    }

    if (draftPlan.status !== PlanStatus.DRAFT) {
      return { success: false, errors: [`Only DRAFT plans can be cancelled (current status: ${draftPlan.status})`] };
    }

    const now = this.clock.nowISO();
    draftPlan.status = PlanStatus.CANCELLED;
    draftPlan.cancelledAt = now;
    draftPlan.updatedAt = now;
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      plan: draftPlan,
    };
  }

  public listProductionActuals(allocationId: string): ProductionActualEntry[] {
    const snapshot = this.getSnapshot();
    return snapshot.entities.productionActualEntries.filter((e) => e.allocationId === allocationId);
  }

  public appendProductionActual(input: AppendProductionActualInput): AppendProductionActualResult {
    const errors: string[] = [];

    const snapshot = this.getSnapshot();
    const alloc = snapshot.entities.planAllocations.find((a) => a.allocationId === input.allocationId);

    if (!alloc) {
      return { success: false, errors: [`PlanAllocation with id '${input.allocationId}' not found`] };
    }

    const plan = snapshot.entities.weeklyPlans.find((p) => p.id === alloc.planId);
    if (!plan) {
      return { success: false, errors: ['Parent WeeklyPlan not found'] };
    }

    if (plan.status !== PlanStatus.PUBLISHED) {
      errors.push(`Actual entries can only be appended to allocations in a PUBLISHED plan (current plan status: ${plan.status})`);
    }

    if (!input.entryType || (input.entryType !== ActualEntryType.PARTIAL && input.entryType !== ActualEntryType.FINAL)) {
      errors.push('entryType must be PARTIAL or FINAL');
    }

    const { goodQty, wasteQty, reworkQty, shortfallQty } = input;
    if (
      !Number.isFinite(goodQty) || goodQty < 0 ||
      !Number.isFinite(wasteQty) || wasteQty < 0 ||
      !Number.isFinite(reworkQty) || reworkQty < 0 ||
      !Number.isFinite(shortfallQty) || shortfallQty < 0
    ) {
      errors.push('Quantities (goodQty, wasteQty, reworkQty, shortfallQty) must be finite non-negative numbers (>= 0)');
    }

    const totalQty = goodQty + wasteQty + reworkQty + shortfallQty;
    if (totalQty <= 0) {
      errors.push('Sum of goodQty, wasteQty, reworkQty, and shortfallQty must be greater than 0');
    }

    if (input.entryType === ActualEntryType.FINAL && shortfallQty > 0 && (!input.shortfallReason || input.shortfallReason.trim() === '')) {
      errors.push('FINAL entry with shortfallQty > 0 requires a shortfallReason');
    }

    const existingEntries = this.listProductionActuals(input.allocationId);
    const hasFinal = existingEntries.some((e) => e.entryType === ActualEntryType.FINAL);
    if (hasFinal) {
      errors.push('Allocation already has a FINAL actual entry. No further entries allowed.');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const now = this.clock.nowISO();
    const actId = this.idGenerator.generateId('act');

    const newEntry: ProductionActualEntry = {
      actualEntryId: actId,
      allocationId: input.allocationId,
      entryType: input.entryType,
      goodQty,
      wasteQty,
      reworkQty,
      shortfallQty,
      shortfallReason: input.shortfallReason?.trim() || undefined,
      recordedAt: now,
      recordedBy: input.recordedBy?.trim() || undefined,
    };

    snapshot.entities.productionActualEntries.push(newEntry);

    // Derive and update allocation status
    const allEntriesForAlloc = [...existingEntries, newEntry];
    alloc.status = deriveProductionStatus(allEntriesForAlloc, alloc.plannedQty);
    alloc.updatedAt = now;

    // Also update plan allocation inside plan.allocations
    const planAlloc = plan.allocations.find((a) => a.allocationId === input.allocationId);
    if (planAlloc) {
      planAlloc.status = alloc.status;
      planAlloc.updatedAt = now;
    }

    plan.updatedAt = now;
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      actualEntry: newEntry,
    };
  }

  public getAllocationActualSummary(allocationId: string): AllocationActualSummaryDetail | null {
    const snapshot = this.getSnapshot();
    const alloc = snapshot.entities.planAllocations.find((a) => a.allocationId === allocationId);

    if (!alloc) return null;

    const entries = snapshot.entities.productionActualEntries.filter((e) => e.allocationId === allocationId);

    const plannedQty = alloc.plannedQty;
    const totalGoodQty = entries.reduce((sum, e) => sum + e.goodQty, 0);
    const totalWasteQty = entries.reduce((sum, e) => sum + e.wasteQty, 0);
    const totalReworkQty = entries.reduce((sum, e) => sum + e.reworkQty, 0);
    const totalShortfallQty = entries.reduce((sum, e) => sum + e.shortfallQty, 0);
    const remainingToProduce = Math.max(0, plannedQty - totalGoodQty);
    const status = deriveProductionStatus(entries, plannedQty);

    return {
      plannedQty,
      totalGoodQty,
      totalWasteQty,
      totalReworkQty,
      totalShortfallQty,
      remainingToProduce,
      status,
    };
  }

  public getPlanningQueueData(referenceDate?: string): PlanningQueueDataDetail {
    const snapshot = this.getSnapshot();
    const refDate = referenceDate || this.clock.nowISO().slice(0, 10);

    const fgItems: PlanningQueueFgItem[] = snapshot.entities.salesOrderLines
      .map((line) => {
        const order = snapshot.entities.salesOrders.find((o) => o.id === line.orderId);
        const activePlannedQty = calculateActivePlannedQtyForLine(line.id, snapshot.entities.weeklyPlans);
        const remainingQty = calculateRemainingQty(line.orderedQty, line.cancelledQty, activePlannedQty);
        const dueStatus = getDueStatus(line.dueDate, remainingQty, refDate);

        return {
          salesOrderId: line.orderId,
          salesOrderLineId: line.id,
          poNumber: order ? order.orderNo : '',
          customerName: order ? order.customerName : '',
          productCode: line.skuCode,
          productName: line.skuName,
          orderedQty: line.orderedQty,
          plannedQty: activePlannedQty,
          remainingQty,
          unit: line.unit,
          dueDate: line.dueDate,
          priority: line.priority,
          dueStatus,
        };
      })
      .filter((item) => item.remainingQty > 0)
      .sort((a, b) => {
        // 1. URGENT priority comes first
        if (a.priority === Priority.URGENT && b.priority !== Priority.URGENT) return -1;
        if (a.priority !== Priority.URGENT && b.priority === Priority.URGENT) return 1;
        // 2. Earliest dueDate comes first
        return a.dueDate.localeCompare(b.dueDate);
      });

    const wipPrepItems = snapshot.entities.wipPrepItems.filter((item) => item.active);

    return {
      fgItems,
      wipPrepItems,
    };
  }

  public getDashboardSummary(referenceDate?: string): DashboardSummaryDetail {
    const snapshot = this.getSnapshot();
    const refDate = referenceDate || this.clock.nowISO().slice(0, 10);

    const queueData = this.getPlanningQueueData(refDate);

    const activePoCount = snapshot.entities.salesOrders.length;
    const totalPoLineCount = snapshot.entities.salesOrderLines.length;

    let unplannedLineCount = 0;
    let partiallyPlannedLineCount = 0;
    let fullyPlannedLineCount = 0;

    snapshot.entities.salesOrderLines.forEach((l) => {
      const activePlanned = calculateActivePlannedQtyForLine(l.id, snapshot.entities.weeklyPlans);
      const effectiveOrdered = l.orderedQty - l.cancelledQty;

      if (activePlanned === 0) {
        unplannedLineCount++;
      } else if (activePlanned >= effectiveOrdered) {
        fullyPlannedLineCount++;
      } else {
        partiallyPlannedLineCount++;
      }
    });

    const urgentLineCount = queueData.fgItems.filter((i) => i.priority === Priority.URGENT).length;
    const draftPlanCount = snapshot.entities.weeklyPlans.filter((p) => p.status === PlanStatus.DRAFT).length;
    const publishedPlanCount = snapshot.entities.weeklyPlans.filter((p) => p.status === PlanStatus.PUBLISHED).length;

    let inProgressActualCount = 0;
    let shortfallCount = 0;

    snapshot.entities.planAllocations.forEach((alloc) => {
      const summary = this.getAllocationActualSummary(alloc.allocationId);
      if (summary?.status === ProductionStatus.IN_PROGRESS) inProgressActualCount++;
      if (summary?.status === ProductionStatus.CLOSED_SHORTFALL) shortfallCount++;
    });

    const recentShortfalls: RecentShortfallItem[] = snapshot.entities.productionActualEntries
      .filter((e) => e.entryType === ActualEntryType.FINAL && e.shortfallQty > 0)
      .map((e) => {
        const alloc = snapshot.entities.planAllocations.find((a) => a.allocationId === e.allocationId);
        let displayName = 'Unknown';
        if (alloc) {
          if (alloc.sourceType === SourceType.FG && alloc.salesOrderLineId) {
            const line = snapshot.entities.salesOrderLines.find((l) => l.id === alloc.salesOrderLineId);
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
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

    const urgentFgLines = queueData.fgItems.filter((i) => i.priority === Priority.URGENT);

    return {
      activePoCount,
      totalPoLineCount,
      unplannedLineCount,
      partiallyPlannedLineCount,
      fullyPlannedLineCount,
      urgentLineCount,
      draftPlanCount,
      publishedPlanCount,
      inProgressActualCount,
      shortfallCount,
      urgentFgLines,
      recentShortfalls,
    };
  }

  public getPlanningBoardData(weekStart: string): PlanningBoardDataDetail {
    const snapshot = this.getSnapshot();
    const cleanWeek = weekStart.trim();

    const plansInWeek = this.listWeekPlans(cleanWeek);
    const activePlan = this.getActivePlanForWeek(cleanWeek);

    const allocations = activePlan ? activePlan.allocations : [];
    const boardNotes = activePlan ? this.listBoardNotes(activePlan.id) : [];
    const rooms = snapshot.entities.rooms;

    // Generate 6 days: Monday to Saturday
    const mondayDate = parseDateOnly(cleanWeek);
    const days: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      days.push(formatDateISO(d));
    }

    let notStartedCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let shortfallCount = 0;

    allocations.forEach((alloc) => {
      if (alloc.status === ProductionStatus.NOT_STARTED) notStartedCount++;
      else if (alloc.status === ProductionStatus.IN_PROGRESS) inProgressCount++;
      else if (alloc.status === ProductionStatus.COMPLETED) completedCount++;
      else if (alloc.status === ProductionStatus.CLOSED_SHORTFALL) shortfallCount++;
    });

    return {
      activePlan,
      plansInWeek,
      allocations,
      boardNotes,
      rooms,
      days,
      statusSummary: {
        totalAllocations: allocations.length,
        notStartedCount,
        inProgressCount,
        completedCount,
        shortfallCount,
      },
    };
  }

  public listBoardNotes(planId: string): BoardNote[] {
    const snapshot = this.getSnapshot();
    return (snapshot.entities.boardNotes || [])
      .filter((n) => n.planId === planId)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }

  public createBoardNote(input: CreateBoardNoteInput): CreateBoardNoteResult {
    const snapshot = this.getSnapshot();
    const plan = snapshot.entities.weeklyPlans.find((p) => p.id === input.planId);

    if (!plan) {
      return { success: false, errors: [`WeeklyPlan with id '${input.planId}' not found`] };
    }

    if (plan.status !== PlanStatus.DRAFT) {
      return { success: false, errors: [`Cannot add note to a non-draft plan (current status: ${plan.status})`] };
    }

    const trimmedDate = input.productionDate.trim();
    if (!ISO_DATE_REGEX.test(trimmedDate)) {
      return { success: false, errors: ['productionDate must be in YYYY-MM-DD format'] };
    }

    if (trimmedDate < plan.weekStart || trimmedDate > plan.weekEnd) {
      return { success: false, errors: [`productionDate '${trimmedDate}' is outside plan week (${plan.weekStart} to ${plan.weekEnd})`] };
    }

    const trimmedRoomId = input.roomId.trim();
    if (!VALID_ROOM_IDS.includes(trimmedRoomId)) {
      return { success: false, errors: [`roomId '${trimmedRoomId}' is invalid`] };
    }

    const cleanNoteText = input.noteText.trim();
    if (!cleanNoteText) {
      return { success: false, errors: ['noteText cannot be empty'] };
    }

    const now = this.clock.nowISO();
    const noteId = this.idGenerator.generateId('note');

    const newNote: BoardNote = {
      noteId,
      planId: plan.id,
      productionDate: trimmedDate,
      roomId: trimmedRoomId,
      noteText: cleanNoteText,
      highlightOnPlan: Boolean(input.highlightOnPlan),
      displayOrder: input.displayOrder,
      createdAt: now,
      updatedAt: now,
    };

    if (!snapshot.entities.boardNotes) {
      snapshot.entities.boardNotes = [];
    }
    snapshot.entities.boardNotes.push(newNote);
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      note: newNote,
    };
  }

  public updateBoardNote(noteId: string, input: UpdateBoardNoteInput): UpdateBoardNoteResult {
    const snapshot = this.getSnapshot();
    const notes = snapshot.entities.boardNotes || [];
    const note = notes.find((n) => n.noteId === noteId);

    if (!note) {
      return { success: false, errors: [`BoardNote with id '${noteId}' not found`] };
    }

    const plan = snapshot.entities.weeklyPlans.find((p) => p.id === note.planId);
    if (!plan) {
      return { success: false, errors: ['Parent WeeklyPlan not found'] };
    }

    if (plan.status !== PlanStatus.DRAFT) {
      return { success: false, errors: [`Cannot update note in a non-draft plan (current status: ${plan.status})`] };
    }

    if (input.noteText !== undefined) {
      const cleanText = input.noteText.trim();
      if (!cleanText) {
        return { success: false, errors: ['noteText cannot be empty'] };
      }
      note.noteText = cleanText;
    }

    if (input.highlightOnPlan !== undefined) {
      note.highlightOnPlan = Boolean(input.highlightOnPlan);
    }

    if (input.displayOrder !== undefined) {
      note.displayOrder = input.displayOrder;
    }

    const now = this.clock.nowISO();
    note.updatedAt = now;
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return {
      success: true,
      note,
    };
  }

  public removeBoardNote(noteId: string): RemoveBoardNoteResult {
    const snapshot = this.getSnapshot();
    const notes = snapshot.entities.boardNotes || [];
    const note = notes.find((n) => n.noteId === noteId);

    if (!note) {
      return { success: false, errors: [`BoardNote with id '${noteId}' not found`] };
    }

    const plan = snapshot.entities.weeklyPlans.find((p) => p.id === note.planId);
    if (!plan) {
      return { success: false, errors: ['Parent WeeklyPlan not found'] };
    }

    if (plan.status !== PlanStatus.DRAFT) {
      return { success: false, errors: [`Cannot remove note from a non-draft plan (current status: ${plan.status})`] };
    }

    const now = this.clock.nowISO();
    snapshot.entities.boardNotes = notes.filter((n) => n.noteId !== noteId);
    snapshot.updatedAt = now;

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return { success: true };
  }

  public getProductionActualWeekData(weekStart: string): ProductionActualWeekDataDetail {
    const snapshot = this.getSnapshot();
    const cleanWeek = weekStart.trim();

    const plansInWeek = this.listWeekPlans(cleanWeek);
    const publishedPlans = plansInWeek
      .filter((p) => p.status === PlanStatus.PUBLISHED)
      .sort((a, b) => b.revisionNumber.localeCompare(a.revisionNumber));

    const activePublishedPlan = publishedPlans[0] || null;

    if (!activePublishedPlan) {
      return {
        activePublishedPlan: null,
        allocations: [],
      };
    }

    const allocationsDetail: ProductionActualAllocationItemDetail[] = activePublishedPlan.allocations.map((alloc) => {
      const summary = this.getAllocationActualSummary(alloc.allocationId) || {
        plannedQty: alloc.plannedQty,
        totalGoodQty: 0,
        totalWasteQty: 0,
        totalReworkQty: 0,
        totalShortfallQty: 0,
        remainingToProduce: alloc.plannedQty,
        status: ProductionStatus.NOT_STARTED,
      };

      const room = snapshot.entities.rooms.find((r) => r.id === alloc.roomId) || null;

      let displayName = 'Unknown Item';
      if (alloc.sourceType === SourceType.FG && alloc.salesOrderLineId) {
        const line = snapshot.entities.salesOrderLines.find((l) => l.id === alloc.salesOrderLineId);
        if (line) displayName = line.skuName;
      } else if (alloc.wipPrepItemId) {
        const item = snapshot.entities.wipPrepItems.find((i) => i.itemId === alloc.wipPrepItemId);
        if (item) displayName = item.itemName;
      }

      return {
        allocation: alloc,
        actualSummary: summary,
        room,
        productionDate: alloc.productionDate,
        displayName,
        sourceType: alloc.sourceType,
      };
    });

    return {
      activePublishedPlan,
      allocations: allocationsDetail,
    };
  }

  // --- CUSTOMER MASTER DATA METHODS ---
  public listCustomers(includeInactive = false): CustomerMaster[] {
    const snapshot = this.getSnapshot();
    const list = snapshot.entities.customers || [];
    if (includeInactive) return list;
    return list.filter((c) => c.active);
  }

  public createCustomer(input: CreateCustomerInput): CreateCustomerResult {
    const errors: string[] = [];
    const code = (input.customerCode || '').trim();
    const name = (input.customerName || '').trim();

    if (!code) errors.push('customerCode is required');
    if (!name) errors.push('customerName is required');

    const snapshot = this.getSnapshot();
    if (!snapshot.entities.customers) snapshot.entities.customers = [];

    if (code && snapshot.entities.customers.some((c) => c.customerCode.toLowerCase() === code.toLowerCase())) {
      errors.push(`รหัสลูกค้า '${code}' มีในระบบแล้ว`);
    }

    if (errors.length > 0) return { success: false, errors };

    const now = this.clock.nowISO();
    const newCustomer: CustomerMaster = {
      customerId: this.idGenerator.generateId('cust'),
      customerCode: code,
      customerName: name,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    snapshot.entities.customers.push(newCustomer);
    snapshot.updatedAt = now;
    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return { success: true, customer: newCustomer };
  }

  public updateCustomer(customerId: string, input: UpdateCustomerInput): UpdateCustomerResult {
    const snapshot = this.getSnapshot();
    if (!snapshot.entities.customers) snapshot.entities.customers = [];

    const cust = snapshot.entities.customers.find((c) => c.customerId === customerId);
    if (!cust) return { success: false, errors: ['Customer not found'] };

    const errors: string[] = [];
    const newCode = input.customerCode !== undefined ? input.customerCode.trim() : cust.customerCode;
    const newName = input.customerName !== undefined ? input.customerName.trim() : cust.customerName;

    if (!newCode) errors.push('customerCode is required');
    if (!newName) errors.push('customerName is required');

    if (
      newCode &&
      snapshot.entities.customers.some(
        (c) => c.customerId !== customerId && c.customerCode.toLowerCase() === newCode.toLowerCase()
      )
    ) {
      errors.push(`รหัสลูกค้า '${newCode}' มีในระบบแล้ว`);
    }

    if (errors.length > 0) return { success: false, errors };

    const now = this.clock.nowISO();
    cust.customerCode = newCode;
    cust.customerName = newName;
    cust.updatedAt = now;

    snapshot.updatedAt = now;
    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return { success: true, customer: cust };
  }

  public setCustomerActive(customerId: string, active: boolean): SetCustomerActiveResult {
    const snapshot = this.getSnapshot();
    if (!snapshot.entities.customers) snapshot.entities.customers = [];

    const cust = snapshot.entities.customers.find((c) => c.customerId === customerId);
    if (!cust) return { success: false, errors: ['Customer not found'] };

    const now = this.clock.nowISO();
    cust.active = active;
    cust.updatedAt = now;

    snapshot.updatedAt = now;
    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return { success: true, customer: cust };
  }

  // --- PRODUCT MASTER DATA METHODS ---
  public listProducts(includeInactive = false): ProductMaster[] {
    const snapshot = this.getSnapshot();
    const list = snapshot.entities.products || [];
    if (includeInactive) return list;
    return list.filter((p) => p.active);
  }

  public listProductsByCustomer(customerId: string, includeInactive = false): ProductMaster[] {
    const snapshot = this.getSnapshot();
    const list = (snapshot.entities.products || []).filter((p) => p.customerId === customerId);
    if (includeInactive) return list;
    return list.filter((p) => p.active);
  }

  public createProduct(input: CreateProductInput): CreateProductResult {
    const errors: string[] = [];
    const custId = (input.customerId || '').trim();
    const code = (input.productCode || '').trim();
    const name = (input.productName || '').trim();
    const unit = (input.defaultUnit || '').trim();

    if (!custId) errors.push('กรุณาเลือกลูกค้า');
    if (!code) errors.push('กรุณากรอกรหัสสินค้า');
    if (!name) errors.push('กรุณากรอกชื่อสินค้า');
    if (!unit) errors.push('กรุณากรอกหน่วยเริ่มต้น');

    const snapshot = this.getSnapshot();
    if (!snapshot.entities.products) snapshot.entities.products = [];

    if (code && snapshot.entities.products.some((p) => p.productCode.toLowerCase() === code.toLowerCase())) {
      errors.push(`รหัสสินค้า '${code}' มีในระบบแล้ว`);
    }

    if (errors.length > 0) return { success: false, errors };

    const now = this.clock.nowISO();
    const newProduct: ProductMaster = {
      productId: this.idGenerator.generateId('prod'),
      customerId: custId,
      productCode: code,
      productName: name,
      defaultUnit: unit,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    snapshot.entities.products.push(newProduct);
    snapshot.updatedAt = now;
    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return { success: true, product: newProduct };
  }

  public updateProduct(productId: string, input: UpdateProductInput): UpdateProductResult {
    const snapshot = this.getSnapshot();
    if (!snapshot.entities.products) snapshot.entities.products = [];

    const prod = snapshot.entities.products.find((p) => p.productId === productId);
    if (!prod) return { success: false, errors: ['Product not found'] };

    const errors: string[] = [];
    const newCustId = input.customerId !== undefined ? input.customerId.trim() : (prod.customerId || '');
    const newCode = input.productCode !== undefined ? input.productCode.trim() : prod.productCode;
    const newName = input.productName !== undefined ? input.productName.trim() : prod.productName;
    const newUnit = input.defaultUnit !== undefined ? input.defaultUnit.trim() : prod.defaultUnit;

    if (!newCustId) errors.push('กรุณาเลือกลูกค้า');
    if (!newCode) errors.push('กรุณากรอกรหัสสินค้า');
    if (!newName) errors.push('กรุณากรอกชื่อสินค้า');
    if (!newUnit) errors.push('กรุณากรอกหน่วยเริ่มต้น');

    if (
      newCode &&
      snapshot.entities.products.some(
        (p) => p.productId !== productId && p.productCode.toLowerCase() === newCode.toLowerCase()
      )
    ) {
      errors.push(`รหัสสินค้า '${newCode}' มีในระบบแล้ว`);
    }

    if (errors.length > 0) return { success: false, errors };

    const now = this.clock.nowISO();
    prod.customerId = newCustId;
    prod.productCode = newCode;
    prod.productName = newName;
    prod.defaultUnit = newUnit;
    prod.updatedAt = now;

    snapshot.updatedAt = now;
    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return { success: true, product: prod };
  }


  public setProductActive(productId: string, active: boolean): SetProductActiveResult {
    const snapshot = this.getSnapshot();
    if (!snapshot.entities.products) snapshot.entities.products = [];

    const prod = snapshot.entities.products.find((p) => p.productId === productId);
    if (!prod) return { success: false, errors: ['Product not found'] };

    const now = this.clock.nowISO();
    prod.active = active;
    prod.updatedAt = now;

    snapshot.updatedAt = now;
    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    return { success: true, product: prod };
  }
}

