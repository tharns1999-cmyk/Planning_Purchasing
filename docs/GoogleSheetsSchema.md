# Google Sheets Schema Specification — Prototype v1.2 Baseline

This schema defines the columns, data types, primary keys, and relationships for the Google Sheets backend integration.

---

## 📊 1. Customers Sheet

Stores customer master data.

| Column | Data Type | Key Type | Description |
| :--- | :--- | :--- | :--- |
| `customerId` | String (UUID) | Primary Key | Unique ID |
| `customerCode` | String | Unique Key | Business code (e.g. CUST-001) |
| `customerName` | String | - | Customer business name |
| `active` | Boolean | - | Status (TRUE/FALSE) |
| `createdAt` | DateTime (ISO) | - | Creation timestamp |
| `updatedAt` | DateTime (ISO) | - | Last update timestamp |

---

## 📊 2. Products Sheet

Stores product master data. Every product must link to a customer.

| Column | Data Type | Key Type | Description |
| :--- | :--- | :--- | :--- |
| `productId` | String (UUID) | Primary Key | Unique ID |
| `productCode` | String | Unique Key | Business code (e.g. PROD-001) |
| `productName` | String | - | Product description |
| `defaultUnit` | String | - | Base unit (e.g. kg, pcs) |
| `customerId` | String (UUID) | Foreign Key | Link to `Customers.customerId` |
| `active` | Boolean | - | Status (TRUE/FALSE) |
| `createdAt` | DateTime (ISO) | - | Creation timestamp |
| `updatedAt` | DateTime (ISO) | - | Last update timestamp |

---

## 📊 3. SalesOrders Sheet

Stores Sales Order headers.

| Column | Data Type | Key Type | Description |
| :--- | :--- | :--- | :--- |
| `salesOrderId` | String (UUID) | Primary Key | Unique ID |
| `poNumber` | String | Unique Key | Purchase Order Number |
| `customerId` | String (UUID) | Foreign Key | Link to `Customers.customerId` |
| `orderDate` | Date (YYYY-MM-DD) | - | Order placement date |
| `dueDate` | Date (YYYY-MM-DD) | - | Order delivery deadline |
| `priority` | String | - | Order priority (NORMAL / URGENT) |
| `status` | String | - | Order workflow status |
| `createdAt` | DateTime (ISO) | - | Creation timestamp |
| `updatedAt` | DateTime (ISO) | - | Last update timestamp |

---

## 📊 4. SalesOrderLines Sheet

Stores items ordered within each Sales Order.

| Column | Data Type | Key Type | Description |
| :--- | :--- | :--- | :--- |
| `salesOrderLineId` | String (UUID) | Primary Key | Unique ID |
| `salesOrderId` | String (UUID) | Foreign Key | Link to `SalesOrders.salesOrderId` |
| `productId` | String (UUID) | Foreign Key | Link to `Products.productId` |
| `orderedQty` | Number | - | Quantity ordered |
| `unit` | String | - | Product unit |
| `plannedQty` | Number | - | Allocated/planned qty (auto-updated) |
| `remainingQty` | Number | - | Quantity left to plan (auto-updated) |
| `createdAt` | DateTime (ISO) | - | Creation timestamp |
| `updatedAt` | DateTime (ISO) | - | Last update timestamp |

---

## 📊 5. WeeklyPlans Sheet

Stores plan versions for each production week.

| Column | Data Type | Key Type | Description |
| :--- | :--- | :--- | :--- |
| `planId` | String (UUID) | Primary Key | Unique ID |
| `weekStartIso` | Date (YYYY-MM-DD) | - | Monday date of the production week |
| `revisionNumber` | Number | - | Revision count (0, 1, 2...) |
| `status` | String | - | Plan lifecycle status (DRAFT / PUBLISHED / CANCELLED) |
| `createdAt` | DateTime (ISO) | - | Creation timestamp |
| `updatedAt` | DateTime (ISO) | - | Last update timestamp |

---

## 📊 6. PlanAllocations Sheet

Stores production scheduling cards assigned to a day and room.

| Column | Data Type | Key Type | Description |
| :--- | :--- | :--- | :--- |
| `allocationId` | String (UUID) | Primary Key | Unique ID |
| `planId` | String (UUID) | Foreign Key | Link to `WeeklyPlans.planId` |
| `sourceType` | String | - | Card type (FG / WIP) |
| `salesOrderLineId` | String (UUID) | Foreign Key (Optional) | Link to `SalesOrderLines` |
| `wipPrepId` | String (UUID) | Foreign Key (Optional) | Link to `WIPItems` |
| `productionDate` | Date (YYYY-MM-DD) | - | Scheduled day of production |
| `roomId` | String | - | Room assignment (R1, R2, R3, R4) |
| `plannedQty` | Number | - | Scheduled volume |
| `plannedUnit` | String | - | Allocation unit |
| `fgOutputQty` | Number | - | Output quantity actual (Optional) |
| `fgOutputUnit` | String | - | Output unit (Optional) |
| `printNote` | String | - | Special printable note |
| `printCustomerTag` | String | - | Specific customer reference tag |
| `highlightOnPlan` | Boolean | - | Visual highlight check |
| `displayOrder` | Number | - | Sequence index for room cell sorting |
| `createdAt` | DateTime (ISO) | - | Creation timestamp |
| `updatedAt` | DateTime (ISO) | - | Last update timestamp |

---

## 📊 7. ProductionActuals Sheet

Stores daily production performance results.

| Column | Data Type | Key Type | Description |
| :--- | :--- | :--- | :--- |
| `actualEntryId` | String (UUID) | Primary Key | Unique ID |
| `planId` | String (UUID) | Foreign Key | Link to `WeeklyPlans.planId` |
| `allocationId` | String (UUID) | Foreign Key | Link to `PlanAllocations.allocationId` |
| `goodQty` | Number | - | Completed volume |
| `wasteQty` | Number | - | Defective volume |
| `reworkQty` | Number | - | Volume requiring rework |
| `shortfallReason` | String | - | Explanation if goodQty < plannedQty |
| `recordedBy` | String | - | Operator/planner identifier |
| `createdAt` | DateTime (ISO) | - | Creation timestamp |
| `updatedAt` | DateTime (ISO) | - | Last update timestamp |

---

## 📊 8. WIPItems Sheet

Stores WIP items master list.

| Column | Data Type | Key Type | Description |
| :--- | :--- | :--- | :--- |
| `wipPrepId` | String (UUID) | Primary Key | Unique ID |
| `itemCode` | String | Unique Key | WIP unique code (e.g. WIP-0001) |
| `itemName` | String | - | Name of WIP item |
| `defaultUnit` | String | - | Base unit |
| `relatedProductIds` | String (Comma-separated) | - | Associated Product IDs |
| `note` | String | - | Additional descriptions |
| `active` | Boolean | - | Status (TRUE/FALSE) |
| `createdAt` | DateTime (ISO) | - | Creation timestamp |
| `updatedAt` | DateTime (ISO) | - | Last update timestamp |

---

## 📊 9. BoardNotes Sheet

Stores manual notes annotated on the Planning Board cells.

| Column | Data Type | Key Type | Description |
| :--- | :--- | :--- | :--- |
| `noteId` | String (UUID) | Primary Key | Unique ID |
| `planId` | String (UUID) | Foreign Key | Link to `WeeklyPlans.planId` |
| `productionDate` | Date (YYYY-MM-DD) | - | Day of note |
| `roomId` | String | - | Room of note |
| `content` | String | - | Body text |
| `displayOrder` | Number | - | Sort order |
| `createdAt` | DateTime (ISO) | - | Creation timestamp |
| `updatedAt` | DateTime (ISO) | - | Last update timestamp |
