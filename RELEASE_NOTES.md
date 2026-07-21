# Release Notes — Prototype v1.2 Freeze Baseline

**วันที่ปล่อยเวอร์ชัน**: 21 กรกฎาคม 2026  
**เวอร์ชัน**: Prototype v1.2 (LocalStorage Baseline — Frozen)

---

## 🎯 สรุปภาพรวมเวอร์ชัน
ระบบ Weekly Production Planner (Prototype v1.2 Freeze Baseline) สมบูรณ์พร้อมใช้งานสำหรับการทดสอบและนำเสนอ (Prototype Demonstration) ครอบคลุมการเชื่อมโยงข้อมูลหลักสินค้ากับลูกค้า, การสร้าง PO ด้วย Autocomplete, การเจาะลึกข้อมูล Drilldown, การจัดการรายการ WIP งานแปรรูปด้วย Card UI, เมนูแถบข้างย่ออัตโนมัติ (Sidebar Auto Collapse), การขยายพื้นที่หน้าจอ (Full Width Layout) และการปรับปรุงความอ่านง่ายบนกระดานวางแผน

---

## ✨ ฟีเจอร์ที่สมบูรณ์ใน Prototype v1.2

1. **Customer-Linked Product Master (`ProductMaster.customerId`)**
   - สินค้าทุกรายการใน Product Master เลือกและผูกกับลูกค้า (`customerId`)
   - สินค้าเดิมในระบบที่ไม่ระบุลูกค้า แสดงป้าย `ยังไม่ผูกลูกค้า` สีส้มชัดเจน
   - เพิ่มคอลัมน์ชื่อลูกค้า ตัวกรองตามลูกค้า และช่องค้นหาสินค้าในหน้า **ข้อมูลหลัก (`/masters`)**

2. **Create PO Modal Autocomplete System**
   - ช่องเลือกลูกค้าใน PO Header ปรับเป็น **Autocomplete Dropdown** ค้นหาจากรหัสและชื่อลูกค้า
   - ช่องรายการสินค้าใน PO ปรับเป็น **Autocomplete Dropdown** ในช่องชื่อสินค้าโดยตรง กรองแสดงเฉพาะสินค้าของลูกค้ารายที่เลือกเท่านั้น (`listProductsByCustomer`)
   - ยืนยันเตือนภาษาไทยเมื่อมีการเปลี่ยนตัวเลือกลูกค้าเพื่อล้างรายการสินค้าเดิมก่อนสลับลูกค้า

3. **Overview & PO Detail Drilldown Engine**
   - หน้า **ภาพรวม (Overview)**: คลิก KPI Cards (PO ทั้งหมด, รอดำเนินการ, ด่วน, จัดสรรแล้ว, ค้างวางแผน) เปิด Modal รายการแบบเจาะลึก
   - หน้า **ใบสั่งซื้อ (Sales Orders)**: คลิก Summary Cards เพื่อเปลี่ยนตัวกรอง และคลิกปุ่ม "ดูรายละเอียด" / แถว PO เพื่อเปิด PO Detail Modal
   - แก้ไขตัวกรองเริ่มต้น (Default Filters) ให้เป็น `ทั้งหมด (ALL)` เพื่อให้จำนวน Card สอดคล้องกับจำนวนแถวใน Drilldown

4. **WIP Menu Management Card UI**
   - ในแท็บ WIP ของ Planning Queue แสดงเฉพาะ **WIP งานแปรรูป** (ซ่อนข้อมูลประวัติ PREP เก่า)
   - ปรับการเพิ่ม/แก้ไขรายการ WIP เป็น Card UI พร้อมปุ่ม `+ เพิ่มรายการ WIP` สีฟ้าปุ่มเดียว
   - รหัส WIP (`itemCode`) ถูกสร้างให้อัตโนมัติ (`WIP-0001`) และซ่อนจากหน้าการป้อนข้อมูลเพื่อความกะทัดรัด

5. **Sidebar Auto Collapse & Full Width Layout**
   - เมนูแถบข้าง (Sidebar) ย่ออัตโนมัติเป็น Default และขยายเมื่อเมาส์ชี้ (Mouse Hover) พร้อมการขยายอย่างนุ่มนวล
   - ขยายพื้นที่ทำงานทุกหน้าหลักเป็น **Full Width (`w-full max-w-none`)** พร้อมลดระยะขอบหน้าจอ (Padding) ให้อ่านง่ายบนจอ 1366x768 และ 1440x900

6. **Planning Queue Width & Board Readability Polish**
   - ปรับความกว้าง Planning Queue Panel เป็น **290px** (280–300px) พอดีสำหรับอ่านข้อมูล PO, ลูกค้า และตัวเลขคงเหลือ
   - เพิ่มขนาดตัวอักษรหัวกระดาน `วันที่ / ห้องผลิต`, `R1 - R4` และยอดผลิตใน Allocation Card (`ผลิต:`, `ได้ FG:`) ช่วยให้ผู้ปฏิบัติงานมองเห็นชัดเจน

7. **Print Preview Quantity Emphasis**
   - ในหน้า Print Preview และภาพ PNG Export เน้นย้ำตัวเลขยอดผลิต `ผลิต:` และ `ได้ FG:` ชัดเจน ไม่แสดงเลข PO บนหน้าพิมพ์

---

## 🧪 ผลการทดสอบและคุณภาพโค้ด (Quality Assurance)

- **Unit / Integration Tests**: ผ่านทั้งหมด 31 test files / 241 tests passed (`vitest`)
- **TypeScript Build**: ผ่านใน 4.98s (`tsc -b && vite build`)
- **ESLint**: 0 warnings, 0 errors
