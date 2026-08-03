import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRepository } from '../services/repositories/LocalStorageRepository';
import { parseCompletedQtyToProgress } from '@/features/production/dashboard/DashboardPage';
import { Priority, ActualEntryType, ProductionStatus } from '../domain/types';

describe('New Features & Data Safeguards Unit Tests', () => {
  let repository: LocalStorageRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageRepository();
    repository.initialize();
  });

  describe('1. ProductMaster shortName', () => {
    it('creates product with shortName and lists it correctly', () => {
      const custRes = repository.createCustomer({
        customerCode: 'CUST-TEST',
        customerName: 'บริษัท ทดสอบ จำกัด',
      });
      expect(custRes.success).toBe(true);
      const custId = custRes.customer!.customerId;

      const prodRes = repository.createProduct({
        customerId: custId,
        productCode: 'PROD-SHORT-1',
        productName: 'ขนมปังเนยสดหอม 200g',
        shortName: 'ปังเนย 200g',
        defaultUnit: 'ชิ้น',
      });
      expect(prodRes.success).toBe(true);
      expect(prodRes.product?.shortName).toBe('ปังเนย 200g');

      const updateRes = repository.updateProduct(prodRes.product!.productId, {
        shortName: 'ปังเนยสด 200g',
      });
      expect(updateRes.success).toBe(true);
      expect(updateRes.product?.shortName).toBe('ปังเนยสด 200g');
    });
  });

  describe('2. SalesOrderLine new fields & Edit PO Data Safeguards', () => {
    it('prevents deleting line that has active allocations on the board', () => {
      // 1. Create Order with 2 lines
      const poRes = repository.createSalesOrderWithLines(
        {
          poNumber: 'PO-SAFEGUARD-01',
          customerName: 'ลูกค้าทดสอบ',
          receivedDate: '2026-07-20',
          priority: Priority.NORMAL,
        },
        [
          {
            productCode: 'SKU-01',
            productName: 'สินค้า 1',
            orderedQty: 100,
            unit: 'ชิ้น',
            dueDate: '2026-07-25',
          },
          {
            productCode: 'SKU-02',
            productName: 'สินค้า 2',
            orderedQty: 50,
            unit: 'ชิ้น',
            dueDate: '2026-07-25',
          },
        ]
      );
      expect(poRes.success).toBe(true);
      const order = poRes.order!;
      const line1 = order.lines[0]!;
      const line2 = order.lines[1]!;

      // 2. Create DRAFT plan and allocate Line 1
      const planRes = repository.createDraftPlan('2026-07-20');
      expect(planRes.success).toBe(true);
      const planId = planRes.plan!.id;

      const allocRes = repository.createFgAllocation({
        planId,
        salesOrderId: order.id,
        salesOrderLineId: line1.id,
        productionDate: '2026-07-21',
        roomId: 'R1',
        plannedQty: 100,
        unit: 'ชิ้น',
        fgOutputQty: 100,
        fgOutputUnit: 'ชิ้น',
      });
      expect(allocRes.success).toBe(true);

      // Check isLineAllocated
      expect(repository.isLineAllocated(line1.id)).toBe(true);
      expect(repository.isLineAllocated(line2.id)).toBe(false);

      // 3. Try to update PO by omitting allocated line1 (attempting deletion)
      const updateRes = repository.updateSalesOrder(
        order.id,
        { poNumber: 'PO-SAFEGUARD-01' },
        [
          {
            id: line2.id,
            productName: line2.skuName,
            orderedQty: line2.orderedQty,
            unit: line2.unit,
            dueDate: line2.dueDate,
          },
        ]
      );

      expect(updateRes.success).toBe(false);
      expect(updateRes.errors?.[0]).toContain('ไม่สามารถลบรายการ');
    });
  });

  describe('3. Production Actual Auto-Reconciliation Steps 1-3', () => {
    it('reconciles goodQty into SalesOrderLine completedQty and sets SalesOrder Completed', () => {
      // 1. Create Order
      const poRes = repository.createSalesOrderWithLines(
        {
          poNumber: 'PO-RECON-01',
          customerName: 'ลูกค้าทดสอบ',
          receivedDate: '2026-07-20',
          priority: Priority.NORMAL,
        },
        [
          {
            productCode: 'SKU-RECON-1',
            productName: 'สินค้า Recon',
            orderedQty: 100,
            unit: 'ชิ้น',
            dueDate: '2026-07-25',
          },
        ]
      );
      const order = poRes.order!;
      const line = order.lines[0]!;

      // 2. Create and Publish Plan
      const planRes = repository.createDraftPlan('2026-07-20');
      const planId = planRes.plan!.id;

      const allocRes = repository.createFgAllocation({
        planId,
        salesOrderId: order.id,
        salesOrderLineId: line.id,
        productionDate: '2026-07-21',
        roomId: 'R1',
        plannedQty: 100,
        unit: 'ชิ้น',
        fgOutputQty: 100,
        fgOutputUnit: 'ชิ้น',
      });
      const allocId = allocRes.allocation!.allocationId;

      const pubRes = repository.publishPlan(planId);
      expect(pubRes.success).toBe(true);

      // 3. Append Actual Entry (Step 1, 2, 3)
      const actRes = repository.appendProductionActual({
        allocationId: allocId,
        entryType: ActualEntryType.FINAL,
        goodQty: 100,
        wasteQty: 0,
        reworkQty: 0,
        shortfallQty: 0,
      });

      expect(actRes.success).toBe(true);

      // Verify Step 2 & 3
      const updatedSnap = repository.getSnapshot();
      const updatedLine = updatedSnap.entities.salesOrderLines.find((l) => l.id === line.id);
      expect(updatedLine?.completedQty).toBe(100);
      expect(updatedLine?.shortageQty).toBe(0);

      const updatedOrder = updatedSnap.entities.salesOrders.find((o) => o.id === order.id);
      expect(updatedOrder?.status).toBe(ProductionStatus.COMPLETED);
    });
  });

  describe('4. Dashboard parseCompletedQtyToProgress safe parsing', () => {
    it('handles numeric and string values safely without returning NaN', () => {
      expect(parseCompletedQtyToProgress(50, 100)).toBe(50);
      expect(parseCompletedQtyToProgress('100', 100)).toBe(100);
      expect(parseCompletedQtyToProgress('✅', 100)).toBe(100);
      expect(parseCompletedQtyToProgress('ครบ', 100)).toBe(100);
      expect(parseCompletedQtyToProgress('done', 100)).toBe(100);
      expect(parseCompletedQtyToProgress('complete', 100)).toBe(100);
      expect(parseCompletedQtyToProgress(undefined, 100)).toBe(0);
      expect(parseCompletedQtyToProgress('invalid', 100)).toBe(0);
    });
  });
});
