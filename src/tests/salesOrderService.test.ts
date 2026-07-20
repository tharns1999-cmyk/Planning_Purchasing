import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRepository } from '../services/repositories/LocalStorageRepository';
import { Priority } from '../domain/types';
import { TestIdGenerator, TestClock } from '../utils/idGenerator';
import { CreateSalesOrderHeaderInput, CreateSalesOrderLineInput } from '../services/repositories/PlannerRepository';

describe('Phase 1C — Sales Order Data Service Tests', () => {
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

  it('1. listSalesOrders() returns list of initial POs', () => {
    const orders = repository.listSalesOrders();
    expect(orders.length).toBeGreaterThanOrEqual(3);
    expect(orders.map((o) => o.orderNo)).toContain('PO-2026-001');
    expect(orders.map((o) => o.orderNo)).toContain('PO-2026-002');
    expect(orders.map((o) => o.orderNo)).toContain('PO-2026-003');
  });

  it('2. getSalesOrderWithLines() returns PO Header, lines, totalLines, totalOrderedQty, and totalRemainingQty', () => {
    const detail = repository.getSalesOrderWithLines('so-1001');
    expect(detail).not.toBeNull();

    if (detail) {
      expect(detail.order.id).toBe('so-1001');
      expect(detail.order.orderNo).toBe('PO-2026-001');
      expect(detail.lines).toHaveLength(2);
      expect(detail.totalLines).toBe(2);
      expect(detail.totalOrderedQty).toBe(1300); // 500 + 800
      expect(detail.totalRemainingQty).toBe(1300); // no active plans yet
    }
  });

  it('3. Successfully creates a new Sales Order with 2 product lines', () => {
    const headerInput: CreateSalesOrderHeaderInput = {
      poNumber: 'PO-2026-999',
      customerName: 'บริษัท ทดสอบ การค้า จำกัด',
      receivedDate: '2026-07-20',
      priority: Priority.URGENT,
      note: 'ออเดอร์เปิดใหม่จากระบบ',
    };

    const linesInput: CreateSalesOrderLineInput[] = [
      {
        productCode: 'SKU-NEW-01',
        productName: 'เค้กช็อกโกแลต 500g',
        orderedQty: 200,
        unit: 'กล่อง',
        dueDate: '2026-07-25',
        priority: Priority.URGENT,
      },
      {
        productCode: 'SKU-NEW-02',
        productName: 'คุกกี้อัลมอนด์ 150g',
        orderedQty: 300,
        unit: 'ถุง',
        dueDate: '2026-07-26',
        priority: Priority.NORMAL,
      },
    ];

    const result = repository.createSalesOrderWithLines(headerInput, linesInput);
    expect(result.success).toBe(true);
    expect(result.order).toBeDefined();

    if (result.order) {
      expect(result.order.id).toBe('so-0001');
      expect(result.order.orderNo).toBe('PO-2026-999');
      expect(result.order.lines).toHaveLength(2);
      expect(result.order.lines[0]!.id).toBe('sol-0002');
      expect(result.order.lines[1]!.id).toBe('sol-0003');

      // Verify retrieval from repository
      const detail = repository.getSalesOrderWithLines(result.order.id);
      expect(detail).not.toBeNull();
      expect(detail?.totalLines).toBe(2);
      expect(detail?.totalOrderedQty).toBe(500);
      expect(detail?.totalRemainingQty).toBe(500);
    }
  });

  it('4. Rejects duplicate PO number (case-insensitive & trimmed)', () => {
    const headerDuplicate: CreateSalesOrderHeaderInput = {
      poNumber: '  po-2026-001  ', // Duplicate of existing PO-2026-001
      customerName: 'บริษัท ลูกค้าใหม่ จำกัด',
      receivedDate: '2026-07-20',
      priority: Priority.NORMAL,
    };

    const lines: CreateSalesOrderLineInput[] = [
      {
        productCode: 'SKU-001',
        productName: 'สินค้าทดสอบ',
        orderedQty: 100,
        unit: 'ชิ้น',
        dueDate: '2026-07-25',
        priority: Priority.NORMAL,
      },
    ];

    const result = repository.createSalesOrderWithLines(headerDuplicate, lines);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("poNumber 'po-2026-001' already exists (must be unique)");
  });

  it('5. Rejects PO creation when lines array is empty', () => {
    const header: CreateSalesOrderHeaderInput = {
      poNumber: 'PO-EMPTY-01',
      customerName: 'บริษัท ไม่มีสินค้า จำกัด',
      receivedDate: '2026-07-20',
      priority: Priority.NORMAL,
    };

    const result = repository.createSalesOrderWithLines(header, []);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('At least 1 product line is required');
  });

  it('6. Rejects orderedQty = 0, negative (-10), or NaN', () => {
    const header: CreateSalesOrderHeaderInput = {
      poNumber: 'PO-INVALID-QTY',
      customerName: 'บริษัท ปริมาณผิดพลาด จำกัด',
      receivedDate: '2026-07-20',
      priority: Priority.NORMAL,
    };

    const invalidLines: CreateSalesOrderLineInput[] = [
      {
        productCode: 'SKU-001',
        productName: 'สินค้า Qty 0',
        orderedQty: 0,
        unit: 'ชิ้น',
        dueDate: '2026-07-25',
        priority: Priority.NORMAL,
      },
      {
        productCode: 'SKU-002',
        productName: 'สินค้า Qty ติดลบ',
        orderedQty: -10,
        unit: 'ชิ้น',
        dueDate: '2026-07-25',
        priority: Priority.NORMAL,
      },
      {
        productCode: 'SKU-003',
        productName: 'สินค้า Qty NaN',
        orderedQty: NaN,
        unit: 'ชิ้น',
        dueDate: '2026-07-25',
        priority: Priority.NORMAL,
      },
    ];

    const result = repository.createSalesOrderWithLines(header, invalidLines);
    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThanOrEqual(3);
  });

  it('7. Guarantees atomic persistence: failed validation does NOT alter the database', () => {
    const ordersCountBefore = repository.listSalesOrders().length;

    const invalidHeader: CreateSalesOrderHeaderInput = {
      poNumber: '', // Invalid empty PO
      customerName: 'ลูกค้าทดสอบ',
      receivedDate: '2026-07-20',
      priority: Priority.NORMAL,
    };

    const result = repository.createSalesOrderWithLines(invalidHeader, [
      {
        productCode: 'SKU-01',
        productName: 'สินค้า 1',
        orderedQty: 10,
        unit: 'ชิ้น',
        dueDate: '2026-07-25',
        priority: Priority.NORMAL,
      },
    ]);

    expect(result.success).toBe(false);
    const ordersCountAfter = repository.listSalesOrders().length;
    expect(ordersCountAfter).toBe(ordersCountBefore);
  });

  it('8. Correctly computes totalLines and totalOrderedQty in getSalesOrderWithLines', () => {
    const header: CreateSalesOrderHeaderInput = {
      poNumber: 'PO-TOTALS-CHECK',
      customerName: 'บริษัท คำนวณยอด จำกัด',
      receivedDate: '2026-07-20',
      priority: Priority.NORMAL,
    };

    const lines: CreateSalesOrderLineInput[] = [
      {
        productCode: 'SKU-A',
        productName: 'สินค้า A',
        orderedQty: 150,
        unit: 'ชิ้น',
        dueDate: '2026-07-25',
        priority: Priority.NORMAL,
      },
      {
        productCode: 'SKU-B',
        productName: 'สินค้า B',
        orderedQty: 250,
        unit: 'ชิ้น',
        dueDate: '2026-07-26',
        priority: Priority.NORMAL,
      },
      {
        productCode: 'SKU-C',
        productName: 'สินค้า C',
        orderedQty: 100,
        unit: 'ชิ้น',
        dueDate: '2026-07-27',
        priority: Priority.URGENT,
      },
    ];

    const createResult = repository.createSalesOrderWithLines(header, lines);
    expect(createResult.success).toBe(true);

    if (createResult.order) {
      const detail = repository.getSalesOrderWithLines(createResult.order.id);
      expect(detail).not.toBeNull();
      expect(detail?.totalLines).toBe(3);
      expect(detail?.totalOrderedQty).toBe(500); // 150 + 250 + 100
      expect(detail?.totalRemainingQty).toBe(500);
    }
  });
});
