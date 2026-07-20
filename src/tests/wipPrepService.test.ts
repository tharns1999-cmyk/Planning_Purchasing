import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRepository } from '../services/repositories/LocalStorageRepository';
import { SourceType } from '../domain/types';
import { TestIdGenerator, TestClock } from '../utils/idGenerator';
import { CreateWipPrepItemInput, UpdateWipPrepItemInput } from '../services/repositories/PlannerRepository';

describe('Phase 1D — WIP / Prep Data Service Tests', () => {
  let repository: LocalStorageRepository;
  let testIdGen: TestIdGenerator;
  let testClock: TestClock;

  beforeEach(() => {
    localStorage.clear();
    testIdGen = new TestIdGenerator('test');
    testClock = new TestClock('2026-07-20T12:00:00.000Z');
    repository = new LocalStorageRepository('weekly-production-planner-db', testIdGen, testClock);
    repository.initialize();
  });

  it('1. listWipPrepItems() displays active items by default', () => {
    const items = repository.listWipPrepItems();
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(items.every((i) => i.active)).toBe(true);
  });

  it('2. Successfully creates a WIP item', () => {
    const input: CreateWipPrepItemInput = {
      itemType: SourceType.WIP,
      itemCode: 'WIP-NEW-01',
      itemName: 'หมูหมักซอสเกาหลี (WIP)',
      defaultUnit: 'กก.',
      relatedProduct: 'SKU-MEAT-01',
      note: 'สูตรใหม่ปี 2026',
    };

    const result = repository.createWipPrepItem(input);
    expect(result.success).toBe(true);
    expect(result.item).toBeDefined();

    if (result.item) {
      expect(result.item.itemId).toBe('wip-0001');
      expect(result.item.itemType).toBe(SourceType.WIP);
      expect(result.item.itemName).toBe('หมูหมักซอสเกาหลี (WIP)');
      expect(result.item.active).toBe(true);
      expect(result.item.createdAt).toBe('2026-07-20T12:00:00.000Z');
    }
  });

  it('3. Successfully creates a PREP item', () => {
    const input: CreateWipPrepItemInput = {
      itemType: SourceType.PREP,
      itemCode: 'PREP-NEW-01',
      itemName: 'สับปะรดปอกเปลือกเตรียมหั่น (PREP)',
      defaultUnit: 'กก.',
    };

    const result = repository.createWipPrepItem(input);
    expect(result.success).toBe(true);
    expect(result.item?.itemType).toBe(SourceType.PREP);
  });

  it('4. Successfully creates item without reference quantity fields', () => {
    const input: CreateWipPrepItemInput = {
      itemType: SourceType.WIP,
      itemName: 'ไส้สังขยาใบเตย (WIP)',
      defaultUnit: 'กก.',
    };

    const result = repository.createWipPrepItem(input);
    expect(result.success).toBe(true);

    if (result.item) {
      const itemRecord = result.item as unknown as Record<string, unknown>;
      expect(itemRecord).not.toHaveProperty('requestedQty');
      expect(itemRecord).not.toHaveProperty('referenceQty');
      expect(itemRecord).not.toHaveProperty('batchQty');
      expect(itemRecord).not.toHaveProperty('maximumQty');
      expect(itemRecord).not.toHaveProperty('leadTime');
    }
  });

  it('5. Rejects creation when itemName is empty', () => {
    const input: CreateWipPrepItemInput = {
      itemType: SourceType.WIP,
      itemName: '   ',
      defaultUnit: 'กก.',
    };

    const result = repository.createWipPrepItem(input);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('itemName is required');
  });

  it('6. Rejects creation when defaultUnit is empty', () => {
    const input: CreateWipPrepItemInput = {
      itemType: SourceType.PREP,
      itemName: 'ผักกาดหอมล้างสะอาด',
      defaultUnit: '',
    };

    const result = repository.createWipPrepItem(input);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('defaultUnit is required');
  });

  it('7. Rejects duplicate itemCode (case-insensitive & trimmed)', () => {
    const duplicateInput: CreateWipPrepItemInput = {
      itemType: SourceType.WIP,
      itemCode: '  wip-chicken-prep  ', // Duplicate of existing WIP-CHICKEN-PREP
      itemName: 'ไก่หมักซ้ำ',
      defaultUnit: 'กก.',
    };

    const result = repository.createWipPrepItem(duplicateInput);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("itemCode 'wip-chicken-prep' already exists (must be unique)");
  });

  it('8. Successfully updates WIP/PREP item details while preserving itemId and createdAt', () => {
    const updateInput: UpdateWipPrepItemInput = {
      itemName: 'ไก่ผัดไส้พายหมักเครื่องเทศเข้มข้น (WIP Updated)',
      defaultUnit: 'ถุง',
    };

    const result = repository.updateWipPrepItem('wip-01', updateInput);
    expect(result.success).toBe(true);

    if (result.item) {
      expect(result.item.itemId).toBe('wip-01'); // Preserved
      expect(result.item.itemName).toBe('ไก่ผัดไส้พายหมักเครื่องเทศเข้มข้น (WIP Updated)');
      expect(result.item.defaultUnit).toBe('ถุง');
      expect(result.item.updatedAt).toBe('2026-07-20T12:00:00.000Z');
    }
  });

  it('9. Soft-deletes item by setting active to false while keeping item in database', () => {
    const toggled = repository.setWipPrepItemActive('wip-01', false);
    expect(toggled).toBe(true);

    // Active list does not include deactivated item
    const activeItems = repository.listWipPrepItems(false);
    expect(activeItems.some((i) => i.itemId === 'wip-01')).toBe(false);

    // Full list still contains deactivated item
    const allItems = repository.listWipPrepItems(true);
    const itemInDb = allItems.find((i) => i.itemId === 'wip-01');
    expect(itemInDb).toBeDefined();
    expect(itemInDb?.active).toBe(false);
  });

  it('10. Atomic failure: failed creation does NOT modify the database', () => {
    const countBefore = repository.listWipPrepItems(true).length;

    const invalidInput: CreateWipPrepItemInput = {
      itemType: SourceType.WIP,
      itemName: '',
      defaultUnit: '',
    };

    const result = repository.createWipPrepItem(invalidInput);
    expect(result.success).toBe(false);

    const countAfter = repository.listWipPrepItems(true).length;
    expect(countAfter).toBe(countBefore);
  });
});
