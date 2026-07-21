// Api.gs
// Database logic stubs for customers, products, orders, and weekly planning.
// Currently returns mock data to isolate connectivity testing.

function getCustomers() {
  return [
    {
      customerId: "cust-mock-uuid-1",
      customerCode: "MOCK-CUST-A",
      customerName: "Mock Customer Corporation A",
      active: true
    },
    {
      customerId: "cust-mock-uuid-2",
      customerCode: "MOCK-CUST-B",
      customerName: "Mock Customer Corporation B",
      active: true
    }
  ];
}

function getProducts() {
  return [
    {
      productId: "prod-mock-uuid-1",
      productCode: "MOCK-PROD-A1",
      productName: "Mock Product Description A1",
      defaultUnit: "kg",
      customerId: "cust-mock-uuid-1",
      active: true
    },
    {
      productId: "prod-mock-uuid-2",
      productCode: "MOCK-PROD-B1",
      productName: "Mock Product Description B1",
      defaultUnit: "pcs",
      customerId: "cust-mock-uuid-2",
      active: true
    }
  ];
}

function getOrders() {
  return [
    {
      salesOrderId: "order-mock-uuid-1",
      poNumber: "PO-MOCK-0001",
      customerId: "cust-mock-uuid-1",
      orderDate: "2026-07-20",
      dueDate: "2026-07-24",
      priority: "NORMAL",
      status: "UNPLANNED",
      items: [
        {
          salesOrderLineId: "line-mock-uuid-1",
          productId: "prod-mock-uuid-1",
          orderedQty: 1000,
          unit: "kg",
          plannedQty: 0,
          remainingQty: 1000
        }
      ]
    }
  ];
}

function getPlanning(weekStartIso) {
  return {
    weekStartIso: weekStartIso || "2026-07-20",
    plans: [
      {
        planId: "plan-mock-uuid-1",
        revisionNumber: 0,
        status: "DRAFT",
        allocations: []
      }
    ]
  };
}

function createOrder(payload) {
  return {
    salesOrderId: "order-mock-uuid-" + Date.now(),
    poNumber: payload.poNumber || "PO-MOCK-NEW",
    success: true
  };
}

function createAllocation(payload) {
  return {
    allocationId: "alloc-mock-uuid-" + Date.now(),
    success: true
  };
}

function createActual(payload) {
  return {
    actualEntryId: "actual-mock-uuid-" + Date.now(),
    success: true
  };
}
