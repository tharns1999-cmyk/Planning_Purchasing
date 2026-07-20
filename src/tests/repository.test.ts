import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRepository } from '../services/repositories/LocalStorageRepository';
import { LOCAL_STORAGE_DB_KEY } from '../services/databaseSchema';
import { Priority, SourceType } from '../domain/types';

describe('Phase 1B — Local Data Foundation & Repository Tests', () => {
  let repository: LocalStorageRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageRepository();
  });

  it('1. initialize() creates seed data on first run under exact key', () => {
    expect(localStorage.getItem(LOCAL_STORAGE_DB_KEY)).toBeNull();
    expect(repository.isInitialized()).toBe(false);

    repository.initialize();

    expect(localStorage.getItem(LOCAL_STORAGE_DB_KEY)).not.toBeNull();
    expect(repository.isInitialized()).toBe(true);
  });

  it('2. initialize() on refresh does NOT reset existing modified data', () => {
    repository.initialize();
    const snapshotBefore = repository.getSnapshot();

    // Mutate state in storage directly
    snapshotBefore.entities.rooms.push({ id: 'R5', name: 'ห้องใหม่' });
    localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(snapshotBefore));

    // Simulate page refresh calling initialize again
    repository.initialize();

    const snapshotAfter = repository.getSnapshot();
    expect(snapshotAfter.entities.rooms).toHaveLength(5);
    expect(snapshotAfter.entities.rooms.some((r) => r.id === 'R5')).toBe(true);
  });

  it('3. getSnapshot() returns a decoupled deep copy', () => {
    repository.initialize();
    const snapshot1 = repository.getSnapshot();

    // Mutate returned snapshot object directly
    snapshot1.entities.salesOrders[0]!.customerName = 'ชื่อลูกค้าใหม่สะกดผิด';

    // Fetch new snapshot
    const snapshot2 = repository.getSnapshot();
    expect(snapshot2.entities.salesOrders[0]!.customerName).not.toBe('ชื่อลูกค้าใหม่สะกดผิด');
    expect(snapshot2.entities.salesOrders[0]!.customerName).toBe('บริษัท อิ่มอร่อย พลาซ่า จำกัด');
  });

  it('4. reset() restores original seed data deterministically', () => {
    repository.initialize();
    const snapshot = repository.getSnapshot();

    // Modify schema
    snapshot.entities.salesOrders = [];
    localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(snapshot));
    expect(repository.getSnapshot().entities.salesOrders).toHaveLength(0);

    // Call reset
    repository.reset();

    const resetSnapshot = repository.getSnapshot();
    expect(resetSnapshot.entities.salesOrders).toHaveLength(3);
    expect(resetSnapshot.entities.salesOrderLines.length).toBeGreaterThanOrEqual(6);
  });

  it('5. Schema contains all 7 normalized entities tables', () => {
    repository.initialize();
    const snapshot = repository.getSnapshot();
    const entities = snapshot.entities;

    expect(entities).toHaveProperty('rooms');
    expect(entities).toHaveProperty('salesOrders');
    expect(entities).toHaveProperty('salesOrderLines');
    expect(entities).toHaveProperty('wipPrepItems');
    expect(entities).toHaveProperty('weeklyPlans');
    expect(entities).toHaveProperty('planAllocations');
    expect(entities).toHaveProperty('productionActualEntries');
  });

  it('6. WIP/Prep items do NOT contain reference quantity fields', () => {
    repository.initialize();
    const snapshot = repository.getSnapshot();
    const wipItems = snapshot.entities.wipPrepItems;

    expect(wipItems.length).toBeGreaterThanOrEqual(4);

    for (const item of wipItems) {
      const itemRecord = item as unknown as Record<string, unknown>;
      expect(itemRecord).not.toHaveProperty('requestedQty');
      expect(itemRecord).not.toHaveProperty('referenceQty');
      expect(itemRecord).not.toHaveProperty('batchQty');
      expect(itemRecord).not.toHaveProperty('maximumQty');
      expect(itemRecord).not.toHaveProperty('leadTime');

      expect([SourceType.WIP, SourceType.PREP]).toContain(item.itemType);
      expect(typeof item.itemId).toBe('string');
      expect(typeof item.itemName).toBe('string');
      expect(typeof item.defaultUnit).toBe('string');
    }
  });

  it('7. Contains exact 4 fixed rooms (R1 to R4)', () => {
    repository.initialize();
    const snapshot = repository.getSnapshot();
    const rooms = snapshot.entities.rooms;

    expect(rooms).toHaveLength(4);
    expect(rooms.map((r) => r.id)).toEqual(['R1', 'R2', 'R3', 'R4']);
    expect(rooms[0]!.name).toBe('ห้องขนม 1');
    expect(rooms[1]!.name).toBe('ห้องขนม 2');
    expect(rooms[2]!.name).toBe('ห้องผลไม้');
    expect(rooms[3]!.name).toBe('ห้องแพ็ค');
  });

  it('8. Seed data has 3 Sales Orders, lines >= 2 each, and both Priority levels', () => {
    repository.initialize();
    const snapshot = repository.getSnapshot();
    const orders = snapshot.entities.salesOrders;
    const lines = snapshot.entities.salesOrderLines;

    expect(orders).toHaveLength(3);
    for (const order of orders) {
      const orderLines = lines.filter((l) => l.orderId === order.id);
      expect(orderLines.length).toBeGreaterThanOrEqual(2);
    }

    const priorities = lines.map((l) => l.priority);
    expect(priorities).toContain(Priority.NORMAL);
    expect(priorities).toContain(Priority.URGENT);
  });
});
