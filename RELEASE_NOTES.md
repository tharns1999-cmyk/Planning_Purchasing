# Release Notes — Prototype v1.0 (Baseline Freeze)

**วันที่ปล่อยเวอร์ชัน**: 20 กรกฎาคม 2026  
**เวอร์ชัน**: Prototype v1.0 (LocalStorage Baseline Freeze)

---

## 🎯 สรุปภาพรวมเวอร์ชัน
ระบบ Weekly Production Planner ได้ผ่านกระบวนการพัฒนาและทดสอบ UAT & Regression Hardening (Phase 5A) ครบถ้วนทุกโมดูลหลัก โดยถูกล็อกเวอร์ชันไว้เป็น Baseline ที่มีเสถียรภาพสูงสุด ก่อนเริ่มพัฒนาโมดูล Google Sheets Integration ในอนาคต

---

## ✨ ฟีเจอร์ที่เสร็จสมบูรณ์แล้ว (Completed Features)

1. **Sales Order Management (PO Header & Lines)**
   - สร้าง PO ใหม่โดยเลือกลูกค้าและเพิ่มหลายรายการสินค้า
   - กำหนดสถานะความสำคัญ (`Priority.URGENT` / `Priority.NORMAL`)
   - คำนวณ Remaining Quantity อัตโนมัติ

2. **Planning Board Shell & Queue Panel**
   - แสดงตารางแผนผลิตรายสัปดาห์ (จันทร์–เสาร์ x ห้องผลิต R1–R4)
   - แผงคิวรอวางแผน (Planning Queue Panel) แยกแท็บ FG และ WIP/PREP
   - รองรับ Drag & Drop ลากรายการจาก Queue มาวางบน Cell
   - ย้ายการ์ด Allocation ข้ามวัน/ห้องบนกระดานได้

3. **Multi-Allocation & fgOutputQty Deduction Rule**
   - 1 Cell (วัน/ห้องผลิต) สามารถรองรับได้หลาย Allocation Card
   - กฎการหักยอด Remaining Quantity หักจาก `fgOutputQty` เท่านั้น (`plannedQty` ใช้สำหรับจำนวนผลิตหน้างาน เช่น จำนวนลัง/ชุด)

4. **Board Note & Print Metadata**
   - เพิ่ม/แก้ไข/ลบ หมายเหตุประจำ Cell (Board Note)
   - เพิ่ม Customer Tag และ Highlight สีเหลืองสะดุดตาบนการ์ด
   - หมายเหตุประจำ Cell ไม่ส่งผลกระทบต่อยอดคงเหลือ PO

5. **Plan Lifecycle & Revision System**
   - สร้างแผนฉบับร่าง R00 -> ประกาศใช้ (Publish R00) -> สร้างฉบับแก้ไข (R01 Draft)
   - เมื่อสร้าง Revision ใหม่ ระบบจะคัดลอก (Clone) ทั้ง Allocation และ Board Note มายังฉบับใหม่โดยอัตโนมัติ
   - แผนที่ถูกประกาศใช้แล้ว (PUBLISHED) จะถูกล็อกให้อ่านได้อย่างเดียว (Read-Only)
   - เมื่อ Publish ฉบับใหม่ ฉบับเดิมจะเปลี่ยนสถานะเป็น `SUPERSEDED`

6. **Production Actual Logging**
   - บันทึกผลผลิตจริงแบบ Partial และ Final
   - คำนวณของดี (Good Qty), ของเสีย (Waste Qty), งานแก้ไข (Rework Qty)
   - บังคับระบุสาเหตุเมื่อมีของขาด (Shortfall Reason) และล็อกไม่ให้แก้ไขหลังบันทึก Final

7. **Print Preview & PNG Export**
   - หน้าแสดงตัวอย่างก่อนพิมพ์แบบแยก Route (`/print-preview`)
   - สไตล์การพิมพ์มาตรฐานกระดาษ A4 Landscape
   - Export ภาพ PNG ความละเอียดสูง (Pixel Ratio 2x) แบบเต็มหน้าโดยไม่มี scrollbars และไม่ติดองค์ประกอบส่วนเกิน (Sidebar / Header / Toolbar)

8. **Delivery Calendar**
   - ปฏิทินแสดงรายการส่งมอบอิงตาม `dueDate`
   - รวมยอด Planned Qty โดยคำนวณจาก `fgOutputQty`
   - ตัวกรองค้นหาตามชื่อสินค้า, ระดับความสำคัญ และสถานะจัดสรร

9. **Data Tools & Storage Administration**
   - สรุปจำนวนเรคคอร์ดของทั้ง 8 เอนทิตีในระบบ
   - ฟังก์ชัน Export / Import JSON Backup สำหรับสำรองและย้ายข้อมูล
   - ฟังก์ชัน Reset ข้อมูลระบบ ป้องกันความผิดพลาดด้วยการบังคับพิมพ์คำว่า `RESET`

---

## 🧪 ผลการทดสอบและสั่งบิลด์ล่าสุด (Latest Verification Results)

- **Test Suite**: ผ่านทั้งหมด **213 tests / 27 test files** (Pass 100%)
- **Build**: `tsc -b && vite build` ผ่านสำเร็จ 100% ไร้ข้อผิดพลาด
- **Lint**: ESLint ผ่านสำเร็จ 100% (0 Errors / 0 Warnings)

---

## 🐛 ปัญหาที่พบ (Known Issues)

- **ไม่มี (None)** — ระบบมีเสถียรภาพ ผ่านการทดสอบระดับ End-to-End ครบถ้วนทุกข้อกำหนด
