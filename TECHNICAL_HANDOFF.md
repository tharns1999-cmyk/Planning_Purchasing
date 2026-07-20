# เอกสารส่งมอบทางเทคนิค (Technical Handoff Document)

เอกสารสำหรับนักพัฒนา (Developer) อธิบายสถาปัตยกรรม, โครงสร้างไฟล์, โมเดลข้อมูล, ฐานข้อมูล LocalStorage และกฎทางธุรกิจหลักของระบบ Weekly Production Planner (Prototype v1.0)

---

## 📂 1. โครงสร้างโฟลเดอร์ (Folder Structure)

```
src/
├── app/                      # Route Definition & Main App Layout
├── components/               # Common UI Components (Button, Modal, Input, Badge, Select, etc.)
├── domain/                   # Domain Enums, Constants & Calculation Logic
│   ├── calculations.ts       # วันที่ผลิต/สัปดาห์, การหักยอดคงเหลือ, สถานะการจัดส่ง
│   ├── constants.ts          # ห้องผลิต FIXED_ROOMS (R1-R4), หน่วยนับ
│   └── types.ts              # Interface & Enums หลักของระบบ (Priority, PlanStatus, etc.)
├── features/                 # Page Features (Modular Design)
│   ├── dashboard/            # หน้า Dashboard ภาพรวมระบบ
│   ├── data-tools/           # หน้า Data Tools Management (Export/Import/Reset)
│   ├── delivery-calendar/    # หน้า Delivery Calendar ปฏิทินส่งสินค้า
│   ├── overview/             # Overview Page Component
│   ├── planning/             # หน้า Planning Board กระดานวางแผนการผลิต (Queue & Board)
│   ├── print-preview/        # หน้า Print Preview & PNG Export Engine
│   ├── production-actual/    # หน้า Production Actual บันทึกผลผลิตจริง
│   └── sales-orders/         # หน้า Sales Orders จัดการใบสั่งซื้อ & Create PO Modal
├── services/                 # Data Layer & Repository Logic
│   ├── databaseSchema.ts     # LocalStorage Snapshot Schema Definition
│   ├── plannerService.ts     # Singleton Service Instance (`plannerRepository`)
│   └── repositories/
│       ├── LocalStorageRepository.ts # Repository Concrete Implementation
│       └── PlannerRepository.ts     # Repository Interface Definition
├── tests/                    # Vitest Integration & Unit Tests (27 Test Files)
└── utils/                    # Utility Functions (Thai Date Format, Currency, etc.)
```

---

## 📐 2. โมเดลข้อมูลหลัก (Core Domain Models)

### 2.1 SalesOrder & SalesOrderLine
- `SalesOrder`: หัวเอกสารใบสั่งซื้อ (id, poNumber, customerName, receivedDate, priority, status)
- `SalesOrderLine`: รายการสินค้าใน PO (id, salesOrderId, productName, orderedQty, unit, dueDate, priority)

### 2.2 WeeklyPlan & PlanAllocation
- `WeeklyPlan`: แผนการผลิตประจำสัปดาห์ (id, weekStart, weekEnd, revisionNumber, status: DRAFT/PUBLISHED/SUPERSEDED/CANCELLED, allocations)
- `PlanAllocation`: รายการจัดสรรการผลิตบนตาราง (allocationId, planId, sourceType: FG/WIP/PREP, salesOrderLineId, wipPrepItemId, productionDate, roomId, plannedQty, plannedUnit, fgOutputQty, fgOutputUnit, printCustomerTag, printNote, highlightOnPlan)

### 2.3 BoardNote
- `BoardNote`: หมายเหตุประจำ Cell บนตาราง (noteId, planId, productionDate, roomId, noteText, highlightOnPlan)

### 2.4 ProductionActualEntry
- `ProductionActualEntry`: ประวัติการบันทึกผลผลิตจริง (id, allocationId, entryType: PARTIAL/FINAL, goodQty, wasteQty, reworkQty, shortfallQty, shortfallReason, loggedAt)

---

## 🛠️ 3. Repository Methods สำคัญ (`PlannerRepository`)

- `getPlanningQueueData(weekStart)`: ดึงคิวรอวางแผน FG (คำนวณ `remainingQty`) และ WIP/PREP
- `createDraftPlan(weekStart)`: สร้างแผน R00 DRAFT สำหรับสัปดาห์ที่ระบุ
- `createFgAllocation(input)`: สร้างรายการจัดสรร FG บนแผนฉบับร่าง
- `createWipPrepAllocation(input)`: สร้างรายการจัดสรร WIP/PREP บนแผนฉบับร่าง
- `createBoardNote(input)` / `updateBoardNote(input)` / `deleteBoardNote(noteId)`: จัดการหมายเหตุประจำ Cell
- `publishPlan(planId)`: ประกาศใช้แผน (เปลี่ยนสถานะเป็น PUBLISHED และล็อกการแก้ไข)
- `createPlanRevision(publishedPlanId)`: สร้างแผนฉบับแก้ไข (R01 DRAFT) โดยคัดลอก Allocations และ Board Notes จากแผนเดิม
- `appendProductionActual(input)`: บันทึกผลผลิตจริง (PARTIAL / FINAL)
- `exportDatabaseJson()` / `importDatabaseJson(jsonStr)` / `reset()`: จัดการข้อมูลใน LocalStorage

---

## 💾 4. โครงสร้าง LocalStorage Schema

ข้อมูลทั้งหมดจัดเก็บภายใต้คีย์ `weekly_production_planner_db_v1` ในรูปแบบ JSON Snapshot:
```json
{
  "version": 1,
  "updatedAt": "2026-07-20T08:00:00.000Z",
  "entities": {
    "salesOrders": [],
    "salesOrderLines": [],
    "wipPrepItems": [],
    "weeklyPlans": [],
    "planAllocations": [],
    "boardNotes": [],
    "productionActualEntries": [],
    "customers": []
  }
}
```

---

## ⚖️ 5. กฎทางธุรกิจสำคัญ (Key Business Rules)

1. **FG Remaining Quantity Rule**:
   - การคำนวณยอดคงเหลือของ PO Line (`remainingQty`) จะถูกหักด้วยยอด **`fgOutputQty`** เท่านั้น
   - **`plannedQty`** และ **`plannedUnit`** ใช้แสดงจำนวนผลิตหน้างาน (เช่น 10 ลัง / 50 ถาด) ห้ามนำไปหักยอดคงเหลือเด็ดขาด

2. **Multiple Allocations per Cell**:
   - ใน 1 Cell (วันเดียวกัน + ห้องผลิตเดียวกัน) สามารถสร้าง Allocation ได้หลายรายการ โดยไม่เขียนทับรายการเดิม

3. **BoardNote Autonomy**:
   - BoardNote เป็นข้อความบันทึกช่วยจำบนตาราง ไม่ใช่การจัดสรรสินค้า จึงไม่ส่งผลกระทบต่อยอดคงเหลือ PO Line ใดๆ

4. **Plan Immutability (Read-Only)**:
   - แผนสถานะ `PUBLISHED` หรือ `SUPERSEDED` จะถูกล็อก ไม่สามารถเพิ่ม/ย้าย/แก้ไข/ลบ Allocation หรือ BoardNote ได้

5. **Revision Cloning**:
   - เมื่อสร้างแผนฉบับแก้ไข (เช่น R01 จาก R00) ทั้ง **`PlanAllocation`** และ **`BoardNote`** จากฉบับเดิมจะถูกคัดลอกมายังฉบับใหม่พร้อมสร้าง `id` ใหม่ โดยคงข้อมูลสเปกเดิมทั้งหมดไว้
