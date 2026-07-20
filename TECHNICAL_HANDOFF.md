# เอกสารส่งมอบทางเทคนิค (Technical Handoff Document) — Prototype v1.2

เอกสารสำหรับนักพัฒนา (Developer) อธิบายสถาปัตยกรรม, โครงสร้างไฟล์, โมเดลข้อมูล, ฐานข้อมูล LocalStorage และกฎทางธุรกิจหลักของระบบ Weekly Production Planner (Prototype v1.2)

---

## 📂 1. โครงสร้างโฟลเดอร์ (Folder Structure)

```
src/
├── app/                      # Route Definition & Main App Layout (`/masters` & `/master-data`)
├── components/               # Common UI Components (Button, Modal, Input, Badge, Select, Autocomplete, etc.)
├── domain/                   # Domain Enums, Constants & Calculation Logic
│   ├── calculations.ts       # วันที่ผลิต/สัปดาห์, การหักยอดคงเหลือ, สถานะการจัดส่ง
│   ├── constants.ts          # ห้องผลิต FIXED_ROOMS (R1-R4), หน่วยนับ
│   └── types.ts              # Interface & Enums หลักของระบบ (CustomerMaster, ProductMaster, Priority, etc.)
├── features/                 # Page Features (Modular Design)
│   ├── actuals/              # หน้า Production Actual บันทึกผลผลิตจริง
│   ├── calendar/             # หน้า Delivery Calendar ปฏิทินส่งสินค้า
│   ├── master-data/          # หน้า ข้อมูลหลัก Master Data (Customer & Product Tabs with Customer Link)
│   ├── orders/               # หน้า Sales Orders จัดการใบสั่งซื้อ & Create PO Autocomplete Modal
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

### 2.1 CustomerMaster & ProductMaster (Customer-Linked Master Data)
- `CustomerMaster`: ข้อมูลลูกค้ามาสเตอร์ (customerId, customerCode, customerName, active, createdAt, updatedAt)
- `ProductMaster`: ข้อมูลสินค้ามาสเตอร์ (productId, productCode, productName, defaultUnit, customerId?: string, active, createdAt, updatedAt)

---

## 🛠️ 3. Repository Methods สำคัญ (`PlannerRepository`)

### Master Data Methods:
- `listCustomers(includeInactive?)` / `createCustomer(input)` / `updateCustomer(id, input)` / `setCustomerActive(id, active)`
- `listProducts(includeInactive?)` / `listProductsByCustomer(customerId, includeInactive?)` / `createProduct(input)` / `updateProduct(id, input)` / `setProductActive(id, active)`

---

## ⚖️ 4. กฎทางธุรกิจสำคัญ (Key Business Rules)

1. **Customer-Linked Product Requirement**:
   - สินค้าใหม่ทุกรายการต้องระบุ `customerId`
   - สินค้าเดิมที่ไม่มี `customerId` จะแสดงป้าย `ยังไม่ผูกลูกค้า` และไม่ปรากฏใน Create PO Autocomplete จนกว่าจะได้รับการแก้ไขระบุลูกค้า

2. **Create PO Autocomplete Filtering**:
   - Autocomplete สินค้าใน Create PO จะกรองแสดงเฉพาะสินค้า active ของลูกค้ารายที่เลือกเท่านั้น (`listProductsByCustomer`)
   - หากเปลี่ยนตัวเลือกลูกค้า ระบบจะแจ้งเตือนเพื่อล้างรายการสินค้าเดิมใน PO ออกก่อน
