# เอกสารส่งมอบทางเทคนิค (Technical Handoff Document) — Prototype v1.2 Freeze Baseline

เอกสารสำหรับนักพัฒนา (Developer) อธิบายสถาปัตยกรรม, โครงสร้างไฟล์, โมเดลข้อมูล, ฐานข้อมูล LocalStorage และกฎทางธุรกิจหลักของระบบ Weekly Production Planner (Prototype v1.2 Freeze Baseline)

---

## 📂 1. โครงสร้างโฟลเดอร์ (Folder Structure)

```
src/
├── app/                      # Route Definition & Main App Layout (`/masters` & `/master-data`)
├── components/               # Common UI Components (Button, Modal, Input, Badge, Select, Autocomplete, etc.)
│   └── layout/               # AppShell, Header, Sidebar (Auto-collapse on hover)
├── domain/                   # Domain Enums, Constants & Calculation Logic
│   ├── calculations.ts       # วันที่ผลิต/สัปดาห์, การหักยอดคงเหลือ, สถานะการจัดส่ง
│   ├── constants.ts          # ห้องผลิต FIXED_ROOMS (R1-R4), หน่วยนับ
│   └── types.ts              # Interface & Enums หลักของระบบ (CustomerMaster, ProductMaster, Priority, etc.)
├── features/                 # Page Features (Modular Design)
│   ├── actuals/              # หน้า Production Actual บันทึกผลผลิตจริง
│   ├── calendar/             # หน้า Delivery Calendar ปฏิทินส่งสินค้า
│   ├── master-data/          # หน้า ข้อมูลหลัก Master Data (Customer & Product Tabs with Customer Link)
│   ├── orders/               # หน้า Sales Orders จัดการใบสั่งซื้อ & Create PO Autocomplete Modal & PO Detail Modal
│   ├── overview/             # Overview / Dashboard Page Component & Overview Drilldown Modal
│   ├── planning/             # หน้า Planning Board กระดานวางแผนการผลิต (Queue & Board & WipItemModal)
│   ├── print-preview/        # หน้า Print Preview & PNG Export Engine
│   └── settings/             # หน้า Data Tools Management (Export/Import/Reset)
├── services/                 # Data Layer & Repository Logic
│   ├── databaseSchema.ts     # LocalStorage Snapshot Schema Definition
│   ├── plannerService.ts     # Singleton Service Instance (`plannerRepository`)
│   └── repositories/
│       ├── LocalStorageRepository.ts # Repository Concrete Implementation (Auto itemCode generation)
│       └── PlannerRepository.ts     # Repository Interface Definition
├── tests/                    # Vitest Integration & Unit Tests (31 Test Files / 241 Tests)
└── utils/                    # Utility Functions (Thai Date Format, Currency, etc.)
```

---

## 📐 2. โมเดลข้อมูลหลัก (Core Domain Models)

### 2.1 CustomerMaster & ProductMaster (Customer-Linked Master Data)
- `CustomerMaster`: ข้อมูลลูกค้ามาสเตอร์ (`customerId`, `customerCode`, `customerName`, `active`, `createdAt`, `updatedAt`)
- `ProductMaster`: ข้อมูลสินค้ามาสเตอร์ (`productId`, `productCode`, `productName`, `defaultUnit`, `customerId?: string`, `active`, `createdAt`, `updatedAt`)

### 2.2 WipPrepItem (WIP งานแปรรูป)
- `WipPrepItem`: ข้อมูลรายการ WIP (`wipPrepId`, `itemCode`, `itemName`, `defaultUnit`, `relatedProductIds`, `note`, `active`, `createdAt`, `updatedAt`)
- Note: `itemCode` ถูกสร้างให้อัตโนมัติ (`WIP-0001`, `WIP-0002`...) โดย `LocalStorageRepository`

---

## 🛠️ 3. Repository Methods สำคัญ (`PlannerRepository`)

### Master Data & WIP Methods:
- `listCustomers(includeInactive?)` / `createCustomer(input)` / `updateCustomer(id, input)` / `setCustomerActive(id, active)`
- `listProducts(includeInactive?)` / `listProductsByCustomer(customerId, includeInactive?)` / `createProduct(input)` / `updateProduct(id, input)` / `setProductActive(id, active)`
- `listWipPrepItems(includeInactive?)` / `createWipPrepItem(input)` / `updateWipPrepItem(id, input)` / `setWipPrepItemActive(id, active)`

---

## ⚖️ 4. กฎทางธุรกิจสำคัญ (Key Business Rules)

1. **Customer-Linked Product Requirement**:
   - สินค้าใหม่ทุกรายการต้องระบุ `customerId`
   - สินค้าเดิมที่ไม่มี `customerId` จะแสดงป้าย `ยังไม่ผูกลูกค้า` และไม่ปรากฏใน Create PO Autocomplete จนกว่าจะได้รับการแก้ไขระบุลูกค้า

2. **Create PO Autocomplete Filtering**:
   - Autocomplete สินค้าใน Create PO จะกรองแสดงเฉพาะสินค้า active ของลูกค้ารายที่เลือกเท่านั้น (`listProductsByCustomer`)
   - หากเปลี่ยนตัวเลือกลูกค้า ระบบจะแจ้งเตือนเพื่อล้างรายการสินค้าเดิมใน PO ออกก่อน

3. **WIP Queue Filtering**:
   - หน้าวางแผนการผลิตฝั่ง Queue จะกรองแสดงเฉพาะ `WIP งานแปรรูป` (ซ่อนข้อมูลประวัติ `PREP` เก่า)
   - ห้ามสร้างรายการ `PREP` ใหม่ แต่ยังรักษา historical data ในแผนเก่าไว้อย่างปลอดภัย

4. **Planning Queue & Board Layout**:
   - Queue Panel กว้าง `290px` (280–300px)
   - Board Grid ใช้ `flex-1 min-w-0` รองรับจอ 1366x768 สมบูรณ์แบบ
