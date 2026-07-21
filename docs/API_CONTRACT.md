# API Contract — REST-like Google Apps Script API Wrapper

This contract specifies the endpoints, request payloads, and response structures for the Google Apps Script backend integration.

---

## 📡 1. Endpoints Overview

All operations will route to the Google Apps Script Web App URL endpoint:
`https://script.google.com/macros/s/EXEC_ID/exec`

Clients will specify the operations using conventional paths.

---

## 📡 2. GET Endpoints

### 2.1 GET /customers
Fetches a list of active and inactive customers.

- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "customerId": "cust-uuid-1",
        "customerCode": "CUST-001",
        "customerName": "Customer A",
        "active": true
      }
    ]
  }
  ```

### 2.2 GET /products
Fetches a list of active and inactive product master data.

- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "productId": "prod-uuid-1",
        "productCode": "PROD-001",
        "productName": "Product description A",
        "defaultUnit": "kg",
        "customerId": "cust-uuid-1",
        "active": true
      }
    ]
  }
  ```

### 2.3 GET /orders
Fetches all sales orders with active line items.

- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "salesOrderId": "order-uuid-1",
        "poNumber": "PO-2026-0001",
        "customerId": "cust-uuid-1",
        "orderDate": "2026-07-20",
        "dueDate": "2026-07-24",
        "priority": "NORMAL",
        "status": "UNPLANNED",
        "items": [
          {
            "salesOrderLineId": "line-uuid-1",
            "productId": "prod-uuid-1",
            "orderedQty": 1000,
            "unit": "kg",
            "plannedQty": 400,
            "remainingQty": 600
          }
        ]
      }
    ]
  }
  ```

### 2.4 GET /planning
Fetches plans and revision history for a production week.

- **Request Query:** `?weekStartIso=2026-07-20`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "weekStartIso": "2026-07-20",
      "plans": [
        {
          "planId": "plan-uuid-1",
          "revisionNumber": 0,
          "status": "PUBLISHED",
          "allocations": [
            {
              "allocationId": "alloc-uuid-1",
              "sourceType": "FG",
              "salesOrderLineId": "line-uuid-1",
              "productionDate": "2026-07-20",
              "roomId": "R1",
              "plannedQty": 400,
              "plannedUnit": "kg",
              "printNote": "URGENT delivery",
              "printCustomerTag": "VIP"
            }
          ]
        }
      ]
    }
  }
  ```

---

## 📡 3. POST / PUT Endpoints

### 3.1 POST /orders
Creates a new Sales Order with line items.

- **Request Payload:**
  ```json
  {
    "poNumber": "PO-2026-0002",
    "customerId": "cust-uuid-1",
    "orderDate": "2026-07-20",
    "dueDate": "2026-07-25",
    "priority": "URGENT",
    "items": [
      {
        "productId": "prod-uuid-1",
        "orderedQty": 500,
        "unit": "kg"
      }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "salesOrderId": "order-uuid-2"
  }
  ```

### 3.2 POST /planning/allocations
Saves/Assigns a production allocation card to the board.

- **Request Payload:**
  ```json
  {
    "planId": "plan-uuid-1",
    "sourceType": "FG",
    "salesOrderLineId": "line-uuid-1",
    "productionDate": "2026-07-20",
    "roomId": "R1",
    "plannedQty": 400,
    "plannedUnit": "kg"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "allocationId": "alloc-uuid-2"
  }
  ```

### 3.3 PUT /planning/allocations/{id}
Updates an existing allocation.

- **Request Payload:**
  ```json
  {
    "productionDate": "2026-07-21",
    "roomId": "R2",
    "plannedQty": 500
  }
  ```
- **Response:**
  ```json
  {
    "success": true
  }
  ```

### 3.4 POST /actuals
Saves Production Actual entries.

- **Request Payload:**
  ```json
  {
    "planId": "plan-uuid-1",
    "allocationId": "alloc-uuid-1",
    "goodQty": 390,
    "wasteQty": 10,
    "reworkQty": 0,
    "shortfallReason": "Machine failure"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "actualEntryId": "actual-uuid-1"
  }
  ```
