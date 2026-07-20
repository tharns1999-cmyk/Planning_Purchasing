import {
  Room,
  SalesOrder,
  SalesOrderLine,
  WipPrepItem,
  WeeklyPlan,
  PlanAllocation,
  ProductionActualEntry,
  BoardNote,
} from '../domain/types';

export const LOCAL_STORAGE_DB_KEY = 'weekly-production-planner-db';
export const CURRENT_SCHEMA_VERSION = 1;

export interface DatabaseEntities {
  rooms: Room[];
  salesOrders: SalesOrder[];
  salesOrderLines: SalesOrderLine[];
  wipPrepItems: WipPrepItem[];
  weeklyPlans: WeeklyPlan[];
  planAllocations: PlanAllocation[];
  productionActualEntries: ProductionActualEntry[];
  boardNotes: BoardNote[];
}

export interface DatabaseSchema {
  schemaVersion: number;
  initializedAt: string;
  updatedAt: string;
  entities: DatabaseEntities;
}
