# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **นักวางแผนการผลิต (Planners)**: จัดตารางผลิตประจำสัปดาห์ กระจายคำสั่งซื้อลงไลน์ ต้องการมุมมองสรุปสัปดาห์ (Weekly Board)
- **หัวหน้าฝ่ายผลิต (Production Supervisors)**: ควบคุมและจัดสรรงานประจำวัน ติดตาม WIP / Prep ต้องการเห็นสถานะเรียลไทม์
- **ผู้จัดการโรงงาน (Plant Managers)**: อนุมัติแผนการผลิต ติดตามภาพรวมประสิทธิภาพ (OEE / Yield) ต้องการ Dashboard สรุปภาพรวม
- **เจ้าหน้าที่บันทึกผลการผลิต (Floor Staff)**: บันทึกยอดผลิตจริง (Actuals) และของเสีย/WIP ต้องการฟอร์มบันทึกข้อมูลที่ปุ่มใหญ่ ตัวหนังสือชัดเจน ป้องกันการกรอกข้อมูลผิดพลาด

## Product Purpose

**ระบบวางแผนการผลิตรายสัปดาห์ (Weekly Production Planner)** คือระบบดิจิทัลสำหรับบริหารจัดการ แปรรูป และจัดตารางการผลิตอาหารประจำสัปดาห์ในโรงงานแปรรูปอาหาร ทดแทนการบันทึกกระดาษและไฟล์สเปรดชีตเดิม เน้นความแม่นยำ ลดความผิดพลาดในการสื่อสาร และความสะดวกในการปฏิบัติงาน

## Positioning

ระบบ Internal Tool ที่ออกแบบเพื่อบริบทของโรงงานผลิตอาหารในไทยโดยเฉพาะ รองรับภาษาไทย 100% ครอบคลุมคำศัพท์เฉพาะทาง และรองรับการทำงานแบบหน้าจอเดียวด้วยความเร็วสูง (Fast Keyboard & Batch Operations)

## Operating Context

- ทำงานผ่าน Desktop Computers & Factory Notebooks ในออฟฟิศโรงงานและโต๊ะควบคุมการผลิต (แสงสว่างระดับโรงงาน)
- Target Viewport: 1366 × 768 (Primary) และ 1440 × 900

## Capabilities and Constraints

- ใช้การแสดงผลแบบ High Contrast และ High Legibility
- ใช้ฟอนต์ **IBM Plex Sans Thai** (เพิ่งอัปเดตใหม่เพื่อให้ดูคลีน สบายตา ทรงเดียวกับ Apple / Sukhumvit Set)
- รองรับการเปลี่ยนช่องกรอกด้วย `Tab` / `Enter` และการเลือกรายการด้วยปุ่มลัด
- ต้องมีรหัสสีและสถานะที่ชัดเจน (วางแผนแล้ว, กำลังผลิต, เสร็จสิ้น, มีปัญหา/ล่าช้า)
- Data Layout มีความหนาแน่น (Dense yet Spacious) แต่ดูง่าย ไม่ต้องเลื่อนจอซ้ำซ้อน

## Brand Commitments

- **iOS-Inspired Fluidity & Clean Aesthetics**: เน้นความลื่นไหล โครงสร้างสัดส่วนสะอาด สัมผัสนุ่มนวล (Subtle Elevation & Smooth Radius)
- **Practicality over Pure Decoration**: ไม่ใช้ Glassmorphism ที่บดบังการอ่านตัวเลข ไม่ใช้โทนสีมืดมัว หรือสีเหลือบ (Gradients) ที่ฉูดฉาดเกินไป
- **Zero Distracting Animations**: ใช้ Transition แบบ Subtle (150ms – 250ms) ตอบสนองการกดปุ่มเท่านั้น

## Evidence on Hand

- ข้อมูล Mockup สำหรับการทดสอบ (Suppliers, RM Items, Defect Matrix)
- โครงสร้างฐานข้อมูลบน Google Apps Script (`DB_ReceivingRecords`, `DB_IssueLogs`, `DB_Suppliers`, `DB_RMItems`)
- โค้ด Frontend ที่เชื่อมกับ Local Storage และส่งไปบันทึกที่ Google Apps Script

## Product Principles

1. ใช้งานง่าย รวดเร็ว พิมพ์โต้ตอบได้ฉับไว (Keyboard-friendly)
2. ข้อมูลชัดเจนแม่นยำ ไม่สับสนด้วยภาษาไทย 100% 
3. หน้าตาโปรเฟสชันนอล โมเดิร์น และดูพรีเมียม (Apple-like aesthetics) แต่ต้องเหมาะกับบริบทข้อมูลที่หนาแน่นในโรงงาน

## Accessibility & Inclusion

- ความเข้มข้นสีระดับ AA/AAA Readability สำหรับใช้งานในสภาพแวดล้อมโรงงาน
- ไม่พึ่งพาการแยกแยะด้วยสีเพียงอย่างเดียว (มี Text Label หรือ Icon กำกับเสมอ)
