# Weekly Production Planner (ระบบวางแผนการผลิตประจำสัปดาห์) — Prototype v1.2

ระบบเว็บแอปพลิเคชันสำหรับวางแผนการผลิตรายสัปดาห์ (Weekly Production Planner) รองรับการจัดการใบสั่งซื้อ (Sales Orders), ข้อมูลหลักลูกค้าและสินค้าผูกตรงตามลูกค้า (Customer-Linked Master Data), การจัดสรรแผนบนกระดานวางแผน (Planning Board Shell), การจัดการฉบับแก้ไขแผน (Plan Revisions R00/R01/...), การบันทึกผลผลิตจริง (Production Actual), การแสดงตัวอย่างก่อนพิมพ์/ส่งออกภาพ PNG (Print Preview), ปฏิทินการจัดส่ง (Delivery Calendar) และเครื่องมือจัดการข้อมูล (Data Tools)

---

## 🚀 Tech Stack

- **Framework & UI Library**: React 19 + TypeScript
- **Build Tool**: Vite (v6)
- **Styling**: Tailwind CSS (v4)
- **Icons**: Lucide React
- **Exporting**: `html-to-image` (สำหรับดาวน์โหลด PNG คุณภาพสูงแบบเต็มตาราง)
- **Testing**: Vitest + React Testing Library
- **Linting & Code Quality**: ESLint

---

## 🛠️ การติดตั้งและการใช้งาน (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. รันระบบในโหมดพัฒนา (Development Server)
```bash
npm run dev
```
เข้าใช้งานผ่านเบราว์เซอร์ที่: `http://localhost:3000`

### 3. รันชุดทดสอบ (Tests)
```bash
npm run test
```

### 4. ตรวจสอบ Linting
```bash
npm run lint
```

### 5. บิลด์สำหรับ Production
```bash
npm run build
```

---

## 📱 รายชื่อหน้าหลักของระบบ (Main Pages)

1. **Dashboard (ภาพรวมระบบ)**: สรุป KPI ตัวเลขสำคัญ รายการ PO ด่วน และสถิติการวางแผน
2. **Sales Orders (รายการสั่งซื้อ)**: จัดการและค้นหาใบสั่งซื้อ (PO Header & Line Items) พร้อมสร้าง PO ใหม่โดยเลือกลูกค้าและสินค้าแบบ Autocomplete
3. **Master Data (ข้อมูลหลัก - `/masters`)**: จัดการรายชื่อลูกค้า (Customer Master) และสินค้าผูกตามลูกค้า (Product Master with `customerId`) รองรับการค้นหา กรอง และเปิด/ปิดใช้งาน
4. **Planning Board (กระดานวางแผนการผลิต)**: วางแผนรายสัปดาห์ (จันทร์–เสาร์ x 4 ห้องผลิต R1–R4) รองรับการลากวาง (Drag & Drop), เพิ่ม Board Note, กำหนด Customer Tag & Highlight
5. **Production Actual (บันทึกผลผลิตจริง)**: บันทึกของดี (Good Qty), ของเสีย (Waste Qty), งานแก้ไข (Rework Qty) และสาเหตุของขาด (Shortfall Reason)
6. **Print Preview (ตัวอย่างก่อนพิมพ์ & Export PNG)**: แสดงแผนแบบเต็มหน้าสำหรับพิมพ์ A4 Landscape และดาวน์โหลด PNG ความละเอียดสูงแบบไม่มี scrollbar
7. **Delivery Calendar (ปฏิทินส่งสินค้า)**: สรุปรายการจัดส่งตาม `dueDate` คำนวณยอดจัดสรรจาก `fgOutputQty`
8. **Data Tools (เครื่องมือจัดการข้อมูล)**: ดูสถิติข้อมูล, Export / Import JSON Backup และ Reset ข้อมูลระบบ

---

## ⚠️ ข้อจำกัดปัจจุบัน (Current Limitations)

- ระบบในเวอร์ชันนี้เป็น **LocalStorage Prototype (v1.2 Customer-Linked Master Data)** ข้อมูลทั้งหมดถูกจัดเก็บใน `localStorage` ของเบราว์เซอร์
- ยังไม่ได้เชื่อมต่อกับ **Google Sheets API / Backend Database** (มีกำหนดพัฒนาใน Phase ถัดไป)
