# Release Notes — Prototype v1.2 (Customer-Linked Product Master & Autocomplete)

**วันที่ปล่อยเวอร์ชัน**: 20 กรกฎาคม 2026  
**เวอร์ชัน**: Prototype v1.2 (LocalStorage Baseline)

---

## 🎯 สรุปภาพรวมเวอร์ชัน
ระบบ Weekly Production Planner (Prototype v1.2) ปรับปรุงโครงสร้างข้อมูลหลักสินค้า (Product Master) ให้ผูกตรงกับลูกค้า (`customerId`) พร้อมพัฒนาระบบ Autocomplete สำหรับเลือกลูกค้าและค้นหาสินค้าตามลูกค้ารายนั้นในหน้าสร้างใบสั่งซื้อ (Create PO Modal)

---

## ✨ ฟีเจอร์ที่เพิ่มเข้ามาและปรับปรุง (New & Enhanced Features)

1. **Customer-Linked Product Master (`ProductMaster.customerId`)**
   - สินค้าทุกรายการใน Product Master ต้องเลือกและผูกกับลูกค้า (`customerId`) เสมอ
   - สินค้าเดิมในระบบที่ไม่ระบุลูกค้า (Legacy Product) ถูกปรับเป็นสถานะ `ยังไม่ผูกลูกค้า` และจะถูกบังคับให้เลือกผูกลูกค้าเมื่อทำการแก้ไข
   - เพิ่มคอลัมน์ชื่อลูกค้า ตัวกรองตามลูกค้า (Customer Filter) และช่องค้นหาสินค้าในหน้า **ข้อมูลหลัก (`/masters`)**

2. **Create PO Modal Autocomplete System**
   - ช่องเลือกลูกค้าใน PO Header ปรับเป็น **Autocomplete Dropdown** ค้นหาได้จากทั้งรหัสลูกค้า และชื่อลูกค้า
   - ช่องรายการสินค้าใน PO ปรับเป็น **Autocomplete Dropdown ในช่องชื่อสินค้าโดยตรง** (ยกเลิกฟิลด์ `เลือกสินค้าจากข้อมูลหลัก` เดิม)
   - รายการสินค้าใน Autocomplete จะถูกกรองแสดงเฉพาะสินค้าของลูกค้ารายที่เลือกเท่านั้น (`listProductsByCustomer`)
   - หากยังไม่ได้เลือกลูกค้า ช่องรายการสินค้าจะถูกล็อกปิดการใช้งานพร้อมข้อความ `กรุณาเลือกลูกค้าก่อน`
   - หากเลือกลูกค้าที่ยังไม่มีรายการสินค้า จะแสดงข้อความเตือน `ยังไม่มีรายการสินค้าของลูกค้านี้ กรุณาเพิ่มในข้อมูลหลักก่อน`
   - หากเปลี่ยนตัวเลือกลูกค้าหลังมีรายการสินค้าใน PO ระบบจะแสดงกล่องยืนยันภาษาไทย เพื่อล้างรายการสินค้าเดิมก่อนสลับลูกค้า

3. **Repository & Data Tools Verification**
   - เพิ่มเมธอด `listProductsByCustomer(customerId, includeInactive?)` สำหรับดึงสินค้าเฉพาะลูกค้านั้น
   - ระบบ Import ใน Data Tools ตรวจสอบความถูกต้องของอ้างอิง `customerId` ของสินค้าว่ามีอยู่จริงใน `customers`
