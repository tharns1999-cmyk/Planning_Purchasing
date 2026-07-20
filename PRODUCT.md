# PRODUCT.md — ระบบวางแผนการผลิตรายสัปดาห์ (Weekly Production Planner)

> **Context**: Greenfield Internal Weekly Production Planning System for Food Manufacturing Plant.

---

## 1. Product Purpose & Overview

**ระบบวางแผนการผลิตรายสัปดาห์ (Weekly Production Planner)** คือระบบดิจิทัลสำหรับบริหารจัดการ แปรรูป และจัดตารางการผลิตอาหารประจำสัปดาห์ในโรงงานแปรรูปอาหาร เพื่อทดแทนการบันทึกกระดาษและไฟล์สเปรดชีตเดิม

### Core Value Proposition
- **ความแม่นยำและรวดเร็ว**: รวบรวมใบสั่งซื้อ (Sales Orders) วิเคราะห์ความต้องการวัตถุดิบ (WIP / Prep Requirements) และคำนวณกำลังการผลิตย่อยตามไลน์ได้อย่างรวดเร็ว
- **ลดความผิดพลาดในการสื่อสาร**: ใช้ภาษาไทยในการแสดงผล 100% ครอบคลุมคำศัพท์เฉพาะทางในโรงงานอาหาร
- **ความสะดวกในการปฏิบัติงาน (Operational Excellence)**: ออกแบบสำหรับการใช้งานบนหน้าจอคอมพิวเตอร์ตั้งโต๊ะและโน้ตบุ๊กเป็นหลัก สนับสนุนการกรอกข้อมูลอย่างรวดเร็ว (Fast Keyboard & Batch Operations)

---

## 2. Target User Personas

| กลุ่มผู้ใช้งาน | บทบาทหน้าที่ | ความต้องการหลัก |
| :--- | :--- | :--- |
| **นักวางแผนการผลิต (Planners)** | จัดตารางผลิตประจำสัปดาห์ กระจายคำสั่งซื้อลงไลน์ | ต้องการมุมมองสรุปสัปดาห์ (Weekly Board) ที่ลากวางหรือปรับเปลี่ยนได้รวดเร็ว ชัดเจน |
| **หัวหน้าฝ่ายผลิต (Production Supervisors)** | ควบคุมและจัดสรรงานประจำวัน ติดตาม WIP / Prep | ต้องการเห็นสถานะยอดวางแผนเทียบยอดผลิตจริงแบบเรียลไทม์ และพิมพ์ใบสั่งผลิตประจำวัน |
| **ผู้จัดการโรงงาน (Plant Managers)** | อนุมัติแผนการผลิต ติดตามภาพรวมประสิทธิภาพ (OEE / Yield) | ต้องการ Dashboard สรุปภาพรวมรายสัปดาห์ อัตราการใช้กำลังการผลิต และคำเตือนวัตถุดิบขาด |
| **เจ้าหน้าที่บันทึกผลการผลิต (Floor Staff)** | บันทึกยอดผลิตจริง (Actuals) และของเสีย/WIP | ต้องการฟอร์มบันทึกข้อมูลที่ปุ่มใหญ่ ตัวหนังสือชัดเจน ป้องกันการกรอกข้อมูลผิดพลาด |

---

## 3. Usage Context & Environment

- **Primary Device**: Desktop Computers & Factory Notebooks
- **Target Viewport Resolution**: **1366 × 768** (Primary Standard) and **1440 × 900**
- **User Interface Language**: **Thai Language Only (ภาษาไทย 100%)**
- **Operating Environment**: Factory Office & Production Control Desk (แสงสว่างระดับโรงงาน ต้องการความเข้มข้นสีระดับ AA/AAA Readability)

---

## 4. Operational Usability Requirements

1. **High Contrast & High Legibility**: ใช้ฟอนต์ไทยอ่านง่าย (`Noto Sans Thai` เป็นหลัก) ป้องกันสระและวรรณยุกต์จมหรือโดนตัด
2. **Dense yet Spacious Data Layout**: สามารถแสดงข้อมูลตารางการผลิต สเปกสินค้า และยอดรวมสัปดาห์ได้ครบถ้วนโดยไม่ต้องเลื่อนหน้าจอซ้ำซ้อน
3. **Keyboard & Drag Navigation**: รองรับการเปลี่ยนช่องกรอกด้วย `Tab` / `Enter` และการเลือกรายการด้วยปุ่มลัด
4. **Immediate Status Awareness**: ใช้รหัสสีและสถานะที่ชัดเจน (เช่น วางแผนแล้ว, กำลังผลิต, เสร็จสิ้น, มีปัญหา/ล่าช้า)

---

## 5. Design Philosophy & Direction

- **iOS-Inspired Fluidity & Clean Aesthetics**: เน้นความลื่นไหล โครงสร้างสัดส่วนสะอาด สัมผัสนุ่มนวล (Subtle Elevation & Smooth Radius)
- **Practicality over Pure Decoration**: ไม่ใช้ Glassmorphism ที่บดบังการอ่านตัวเลข ไม่ใช้โทนสีมืดมัว ไม่ใช้การไล่เฉดสีที่ฉูดฉาดเกินไป
- **Zero Distracting Animations**: ใช้ Transition แบบ Subtle (150ms – 250ms) เพื่อตอบสนองการกดปุ่ม สลับหน้า หรือเปิด Modal เท่านั้น
