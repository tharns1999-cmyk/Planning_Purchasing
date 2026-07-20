# Release Notes — Prototype v1.1 (Master Data & Baseline Freeze)

**วันที่ปล่อยเวอร์ชัน**: 20 กรกฎาคม 2026  
**เวอร์ชัน**: Prototype v1.1 (LocalStorage Baseline Freeze)

---

## 🎯 สรุปภาพรวมเวอร์ชัน
ระบบ Weekly Production Planner (Prototype v1.1) เพิ่มเติมระบบจัดการข้อมูลหลัก (Master Data) สำหรับรายชื่อลูกค้าและสินค้า พร้อมเชื่อมโยงระบบเลือก Dropdown ในการสร้างใบสั่งซื้อ (Create PO Modal) และอัปเดตเครื่องมือจัดการข้อมูล (Data Tools) ก่อนทำการล็อกเวอร์ชัน Baseline Freeze สม่ำเสมอทุกระบบ

---

## ✨ ฟีเจอร์ที่เสร็จสมบูรณ์แล้ว (Completed Features)

1. **Master Data Management (Customer & Product Master)**
   - เพิ่มหน้า **ข้อมูลหลัก (`/masters`)** แยกแท็บจัดการลูกค้า และ สินค้า
   - **Customer Master**: รหัสลูกค้า (`customerCode`), ชื่อลูกค้า (`customerName`), สถานะใช้งาน, ปุ่มแก้ไข, ปุ่มเปิด/ปิดใช้งาน (active toggle)
   - **Product Master**: รหัสสินค้า (`productCode`), ชื่อสินค้า (`productName`), หน่วยเริ่มต้น (`defaultUnit`), สถานะใช้งาน, ปุ่มแก้ไข, ปุ่มเปิด/ปิดใช้งาน (active toggle)
   - Validation ตรวจจับรหัสลูกค้า/สินค้าซ้ำ และห้ามเว้นช่องสำคัญว่าง

2. **Master Data Integration in Create PO Modal**
   - ช่องชื่อลูกค้าในหน้าสร้าง PO ดึงข้อมูลจาก active customers ใน Master Data
   - ช่องรายการสินค้าเลือกจาก active products ใน Master Data โดยเมื่อเลือกสินค้า ระบบจะเติมชื่อสินค้าและหน่วยเริ่มต้นให้อัตโนมัติ (และยังคงแก้ไขชื่อ/หน่วยได้ตามต้องการ)
   - รายการที่ถูกปิดใช้งาน (active = false) จะไม่แสดงใน Dropdown
   - มีข้อความแจ้งเตือน `ยังไม่มีข้อมูลหลัก กรุณาเพิ่มข้อมูลลูกค้าหรือสินค้าก่อน` หากไม่มีข้อมูลหลัก active

3. **Sales Order Management (PO Header & Lines)**
   - สร้าง PO ใหม่โดยเลือกลูกค้าและเพิ่มหลายรายการสินค้าจาก Master Data
   - กำหนดสถานะความสำคัญ (`Priority.URGENT` / `Priority.NORMAL`)
   - คำนวณ Remaining Quantity อัตโนมัติ

4. **Planning Board Shell & Queue Panel**
   - แสดงตารางแผนผลิตรายสัปดาห์ (จันทร์–เสาร์ x ห้องผลิต R1–R4)
   - แผงคิวรอวางแผน (Planning Queue Panel) แยกแท็บ FG และ WIP/PREP
   - รองรับ Drag & Drop ลากรายการจาก Queue มาวางบน Cell
   - ย้ายการ์ด Allocation ข้ามวัน/ห้องบนกระดานได้

5. **Multi-Allocation & fgOutputQty Deduction Rule**
   - 1 Cell (วัน/ห้องผลิต) สามารถรองรับได้หลาย Allocation Card
   - กฎการหักยอด Remaining Quantity หักจาก `fgOutputQty` เท่านั้น (`plannedQty` ใช้สำหรับจำนวนผลิตหน้างาน เช่น จำนวนลัง/ชุด)

6. **Board Note & Print Metadata**
   - เพิ่ม/แก้ไข/ลบ หมายเหตุประจำ Cell (Board Note)
   - เพิ่ม Customer Tag และ Highlight สีเหลืองสะดุดตาบนการ์ด
   - หมายเหตุประจำ Cell ไม่ส่งผลกระทบต่อยอดคงเหลือ PO

7. **Plan Lifecycle & Revision System**
   - สร้างแผนฉบับร่าง R00 -> ประกาศใช้ (Publish R00) -> สร้างฉบับแก้ไข (R01 Draft)
   - เมื่อสร้าง Revision ใหม่ ระบบจะคัดลอก (Clone) ทั้ง Allocation และ Board Note มายังฉบับใหม่โดยอัตโนมัติ
   - แผนที่ถูกประกาศใช้แล้ว (PUBLISHED) จะถูกล็อกให้อ่านได้อย่างเดียว (Read-Only)
   - เมื่อ Publish ฉบับใหม่ ฉบับเดิมจะเปลี่ยนสถานะเป็น `SUPERSEDED`

8. **Production Actual Logging**
   - บันทึกผลผลิตจริงแบบ Partial และ Final
   - คำนวณของดี (Good Qty), ของเสีย (Waste Qty), งานแก้ไข (Rework Qty)
   - บังคับระบุสาเหตุเมื่อมีของขาด (Shortfall Reason) และล็อกไม่ให้แก้ไขหลังบันทึก Final

9. **Print Preview & PNG Export**
   - หน้าแสดงตัวอย่างก่อนพิมพ์แบบแยก Route (`/print-preview`)
   - สไตล์การพิมพ์มาตรฐานกระดาษ A4 Landscape
   - Export ภาพ PNG ความละเอียดสูง (Pixel Ratio 2x) แบบเต็มหน้าโดยไม่มี scrollbars และไม่ติดองค์ประกอบส่วนเกิน (Sidebar / Header / Toolbar)

10. **Delivery Calendar**
    - ปฏิทินแสดงรายการส่งมอบอิงตาม `dueDate`
    - รวมยอด Planned Qty โดยคำนวณจาก `fgOutputQty`
    - ตัวกรองค้นหาตามชื่อสินค้า, ระดับความสำคัญ และสถานะจัดสรร

11. **Data Tools & Storage Administration**
    - สรุปจำนวนเรคคอร์ดของทั้ง 10 เอนทิตีในระบบ (รวม ลูกค้า และ สินค้า)
    - ฟังก์ชัน Export / Import JSON Backup รองรับเอนทิตี `customers` และ `products`
    - ฟังก์ชัน Reset ข้อมูลระบบ คืนค่าเริ่มต้น Seed Data ครบถ้วน (รวม SEED_CUSTOMERS 5 ราย และ SEED_PRODUCTS 10 ราย)

---

## 🧪 ผลการทดสอบและสั่งบิลด์ล่าสุด (Latest Verification Results)

- **Test Suite**: ผ่านทั้งหมด **218 tests / 28 test files** (Pass 100%)
- **Build**: `tsc -b && vite build` ผ่านสำเร็จ 100% ไร้ข้อผิดพลาด
- **Lint**: ESLint ผ่านสำเร็จ 100% (0 Errors / 0 Warnings)

---

## 🐛 ปัญหาที่พบ (Known Issues)

- **ไม่มี (None)** — ระบบมีเสถียรภาพ ผ่านการทดสอบระดับ End-to-End ครบถ้วนทุกข้อกำหนด
