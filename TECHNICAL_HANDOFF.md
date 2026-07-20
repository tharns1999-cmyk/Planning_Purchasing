# เอกสารส่งมอบทางเทคนิค (Technical Handoff Document) — Prototype v1.1

เอกสารสำหรับนักพัฒนา (Developer) อธิบายสถาปัตยกรรม, โครงสร้างไฟล์, โมเดลข้อมูล, ฐานข้อมูล LocalStorage และกฎทางธุรกิจหลักของระบบ Weekly Production Planner (Prototype v1.1)

---

## 📂 1. โครงสร้างโฟลเดอร์ (Folder Structure)

```
src/
├── app/                      # Route Definition & Main App Layout (`/masters` & `/master-data`)
├── components/               # Common UI Components (Button, Modal, Input, Badge, Select, etc.)
├── domain/                   # Domain Enums, Constants & Calculation Logic
│   ├── calculations.ts       # วันที่ผลิต/สัปดาห์, การหักยอดคงเหลือ, สถานะการจัดส่ง
│   ├── constants.ts          # ห้องผลิต FIXED_ROOMS (R1-R4), หน่วยนับ
│   └── types.ts              # Interface & Enums หลักของระบบ (CustomerMaster, ProductMaster, Priority, etc.)
├── features/                 # Page Features (Modular Design)
│   ├── actuals/              # หน้า Production Actual บันทึกผลผลิตจริง
│   ├── calendar/             # หน้า Delivery Calendar ปฏิทินส่งสินค้า
│   ├── master-data/          # หน้า ข้อมูลหลัก Master Data (Customer & Product Tabs)
│   ├── orders/               # หน้า Sales Orders จัดการใบสั่งซื้อ & Create PO Modal
│   ├── overview/             # Overview / Dashboard Page Component
│   ├── planning/             # หน้า Planning Board กระดานวางแผนการผลิต (Queue & Board)
│   ├── print-preview/        # หน้า Print Preview & PNG Export Engine
│   ├── settings/             # หน้า Data Tools Management (Export/Import/Reset)
│   └── showcase/             # Showcase UI Components (Dev)
├── services/                 # Data Layer & Repository Logic
│   ├── databaseSchema.ts     # LocalStorage Snapshot Schema Definition
│   ├── plannerService.ts     # Singleton Service Instance (`plannerRepository`)
│   └── repositories/
│       ├── LocalStorageRepository.ts # Repository Concrete Implementation
│       └── PlannerRepository.ts     # Repository Interface Definition
├── tests/                    # Vitest Integration & Unit Tests (28 Test Files)
└── utils/                    # Utility Functions (Thai Date Format, Currency, etc.)
```

---

## 📐 2. โมเดลข้อมูลหลัก (Core Domain Models)

### 2.1 CustomerMaster & ProductMaster (Master Data)
- `CustomerMaster`: ข้อมูลลูกค้ามาสเตอร์ (customerId, customerCode, customerName, active, createdAt, updatedAt)
- `ProductMaster`: ข้อมูลสินค้ามาสเตอร์ (productId, productCode, productName, defaultUnit, active, createdAt, updatedAt)

### 2.2 SalesOrder & SalesOrderLine
- `SalesOrder`: หัวเอกสารใบสั่งซื้อ (id, orderNo, customerName, orderDate, lines, createdAt, updatedAt)
- `SalesOrderLine`: รายการสินค้าใน PO (id, orderId, skuCode, skuName, orderedQty, cancelledQty, unit, dueDate, priority, notes)

### 2.3 WeeklyPlan & PlanAllocation
- `WeeklyPlan`: แผนการผลิตประจำสัปดาห์ (id, weekStart, weekEnd, revisionNumber, status: DRAFT/PUBLISHED/SUPERSEDED/CANCELLED, allocations)
- `PlanAllocation`: รายการจัดสรรการผลิตบนตาราง (allocationId, planId, sourceType: FG/WIP/PREP, salesOrderLineId, wipPrepItemId, productionDate, roomId, plannedQty, plannedUnit, fgOutputQty, fgOutputUnit, printCustomerTag, printNote, highlightOnPlan)

### 2.4 BoardNote
- `BoardNote`: หมายเหตุประจำ Cell บนตาราง (noteId, planId, productionDate, roomId, noteText, highlightOnPlan)

### 2.5 ProductionActualEntry
- `ProductionActualEntry`: ประวัติการบันทึกผลผลิตจริง (actualEntryId, allocationId, entryType: PARTIAL/FINAL, goodQty, wasteQty, reworkQty, shortfallQty, shortfallReason, recordedAt, recordedBy)

---

## 🛠️ 3. Repository Methods สำคัญ (`PlannerRepository`)

### Master Data Methods:
- `listCustomers(includeInactive?)` / `createCustomer(input)` / `updateCustomer(id, input)` / `setCustomerActive(id, active)`
- `listProducts(includeInactive?)` / `createProduct(input)` / `updateProduct(id, input)` / `setProductActive(id, active)`

### Sales Order & Planning Methods:
- `createSalesOrderWithLines(header, lines)`: สร้าง PO และ Lines จาก Master Data Dropdown
- `getPlanningQueueData(referenceDate)`: ดึงคิวรอวางแผน FG (คำนวณ `remainingQty`) และ WIP/PREP
- `createDraftPlan(weekStart)`: สร้างแผน R00 DRAFT สำหรับสัปดาห์ที่ระบุ
- `createFgAllocation(input)`: สร้างรายการจัดสรร FG บนแผนฉบับร่าง
- `createWipPrepAllocation(input)`: สร้างรายการจัดสรร WIP/PREP บนแผนฉบับร่าง
- `createBoardNote(input)` / `updateBoardNote(input)` / `removeBoardNote(noteId)`: จัดการหมายเหตุประจำ Cell
- `publishPlan(planId)`: ประกาศใช้แผน (เปลี่ยนสถานะเป็น PUBLISHED และล็อกการแก้ไข)
- `createPlanRevision(publishedPlanId)`: สร้างแผนฉบับแก้ไข (R01 DRAFT) โดยคัดลอก Allocations และ Board Notes จากแผนเดิม
- `appendProductionActual(input)`: บันทึกผลผลิตจริง (PARTIAL / FINAL)
- `importDatabase(data)` / `getSnapshot()` / `reset()`: จัดการข้อมูลใน LocalStorage (รองรับ 10 เอนทิตี)

---

## 💾 4. โครงสร้าง LocalStorage Schema

ข้อมูลทั้งหมดจัดเก็บภายใต้คีย์ `weekly-production-planner-db` ในรูปแบบ JSON Snapshot:
```json
{
  "schemaVersion": 1,
  "initializedAt": "2026-07-20T00:00:00.000Z",
  "updatedAt": "2026-07-20T08:00:00.000Z",
  "entities": {
    "rooms": [],
    "salesOrders": [],
    "salesOrderLines": [],
    "wipPrepItems": [],
    "weeklyPlans": [],
    "planAllocations": [],
    "productionActualEntries": [],
    "boardNotes": [],
    "customers": [],
    "products": []
  }
}
```

---

## ⚖️ 5. กฎทางธุรกิจสำคัญ (Key Business Rules)

1. **Master Data Integrity**:
   - ห้ามลบข้อมูล Master Data แบบถาวร (Soft-delete เท่านั้นด้วย `active: false`)
   - `customerCode` และ `productCode` ห้ามซ้ำกัน (Case-insensitive)
   - รายการ Master Data ที่มี `active: false` จะไม่ถูกแสดงในตัวเลือก Create PO Dropdown

2. **FG Remaining Quantity Rule**:
   - การคำนวณยอดคงเหลือของ PO Line (`remainingQty`) จะถูกหักด้วยยอด **`fgOutputQty`** เท่านั้น
   - **`plannedQty`** และ **`plannedUnit`** ใช้แสดงจำนวนผลิตหน้างาน (เช่น 10 ลัง / 50 ถาด) ห้ามนำไปหักยอดคงเหลือเด็ดขาด

3. **Multiple Allocations per Cell**:
   - ใน 1 Cell (วันเดียวกัน + ห้องผลิตเดียวกัน) สามารถสร้าง Allocation ได้หลายรายการ โดยไม่เขียนทับรายการเดิม

4. **BoardNote Autonomy**:
   - BoardNote เป็นข้อความบันทึกช่วยจำบนตาราง ไม่ใช่การจัดสรรสินค้า จึงไม่ส่งผลกระทบต่อยอดคงเหลือ PO Line ใดๆ

5. **Plan Immutability (Read-Only)**:
   - แผนสถานะ `PUBLISHED` หรือ `SUPERSEDED` จะถูกล็อก ไม่สามารถเพิ่ม/ย้าย/แก้ไข/ลบ Allocation หรือ BoardNote ได้

6. **Revision Cloning**:
   - เมื่อสร้างแผนฉบับแก้ไข (เช่น R01 จาก R00) ทั้ง **`PlanAllocation`** และ **`BoardNote`** จากฉบับเดิมจะถูกคัดลอกมายังฉบับใหม่พร้อมสร้าง `id` ใหม่ โดยคงข้อมูลสเปกเดิมทั้งหมดไว้
