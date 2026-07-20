# DESIGN.md — Design System & Guidelines

> **System**: Weekly Production Planner (ระบบวางแผนการผลิตรายสัปดาห์)  
> **Theme Target**: Light Theme MVP  
> **Target Viewport**: Desktop 1366×768 Primary & 1440×900  

---

## 1. Semantic Color Tokens (Light Mode MVP)

| Token Category | Token Name | Hex Code | Usage Description |
| :--- | :--- | :--- | :--- |
| **Brand / Primary** | `primary-600` | `#0284C7` | Primary action buttons, active navigation, key highlights |
| | `primary-700` | `#0369A1` | Hover state for primary actions |
| | `primary-50` | `#F0F9FF` | Primary active background tints, selected row highlights |
| **Neutral / Slate** | `slate-900` | `#0F172A` | Primary text headings, high-contrast values |
| | `slate-700` | `#334155` | Body text, form field labels |
| | `slate-500` | `#64748B` | Secondary text, captions, table header titles |
| | `slate-200` | `#E2E8F0` | Structural borders, card dividers |
| | `slate-100` | `#F1F5F9` | Subtle background fills, hover row backgrounds |
| | `slate-50` | `#F8FAFC` | Main application background surface |
| **Functional Feedback** | `emerald-600` | `#059669` | Success status, target achieved, completed batch |
| | `emerald-50` | `#ECFDF5` | Success badge background |
| | `amber-600` | `#D97706` | Warning status, near capacity, prep required |
| | `amber-50` | `#FFFBEB` | Warning badge background |
| | `rose-600` | `#E11D48` | Danger status, machine failure, delay, delete actions |
| | `rose-50` | `#FFF1F2` | Danger badge background |

---

## 2. Thai Typography Guidelines

### Primary Font Stack
```css
font-family: "Noto Sans Thai", "Leelawadee UI", Tahoma, system-ui, -apple-system, sans-serif;
```

### Typography Scale & Hierarchy

| Role | Font Size | Weight | Line Height | Usage Example |
| :--- | :--- | :--- | :--- | :--- |
| **Heading XL** | `24px` (`1.5rem`) | `700` (Bold) | `1.4` (`leading-relaxed`) | Header หน้าหลัก (เช่น ภาพรวมการผลิต) |
| **Heading LG** | `20px` (`1.25rem`) | `600` (SemiBold) | `1.4` (`leading-relaxed`) | Header เซกชัน / Card Titles |
| **Heading MD** | `16px` (`1rem`) | `600` (SemiBold) | `1.5` (`leading-normal`) | Modal Title / Table Header Labels |
| **Body Standard** | `14px` (`0.875rem`) | `400` (Regular) | `1.5` (`leading-normal`) | ข้อมูลในตาราง, ข้อความทั่วไป |
| **Body Medium** | `14px` (`0.875rem`) | `500` (Medium) | `1.5` (`leading-normal`) | Form Labels, Table Text Highlighting |
| **Caption / Small** | `12px` (`0.75rem`) | `400` / `500` | `1.5` (`leading-normal`) | Badge text, Tooltip, Metadata |

> **Critical Rule**: ห้ามใช้ `letter-spacing` (tracking) ในข้อความภาษาไทยเพื่อป้องกันปัญหาหางสระตัดและสระวรรณยุกต์ซ้อนกัน

---

## 3. Spacing & Grid Hierarchy

- **Base Unit**: 4px / 8px spatial grid system
- **Card Padding**: 16px (Compact Desktop 1366×768) or 24px (Standard)
- **Gap Spacing**:
  - Related form controls: `gap-3` (12px)
  - Layout Sections: `gap-6` (24px)
  - Sidebar Navigation Items: `gap-1` (4px)

---

## 4. Component Standards & Control Dimensions

### Control Dimensions
- **Button Height**: `38px` (`h-9.5` / `py-2 px-4`)
- **Input / Select Height**: `38px` (`h-9.5` / `py-2 px-3`)
- **Border Radius**: `8px` (`rounded-lg`) for controls; `12px` (`rounded-xl`) for cards and modals.

### Button Variants
1. **Primary**: Solid `#0284C7` background, white text, subtle shadow (`shadow-sm hover:bg-sky-700`).
2. **Secondary**: Solid `#F1F5F9` background, `#334155` text (`hover:bg-slate-200`).
3. **Outline**: White background, 1px border `#CBD5E1`, `#334155` text (`hover:bg-slate-50`).
4. **Ghost**: Transparent background, `#475569` text (`hover:bg-slate-100`).
5. **Danger**: Solid `#E11D48` background, white text (`hover:bg-rose-700`).

### Form Inputs & Selects
- Clean 1px `#CBD5E1` border, 8px border radius.
- Focus state: 2px ring `#0284C7` with smooth 150ms transition.
- Explicit label and placeholder in clear Thai.

### Status Badges
- Pill format (`rounded-full py-0.5 px-2.5 text-xs font-medium`).
- Statuses:
  - **วางแผนแล้ว (Planned)**: Blue Tones (`bg-sky-50 text-sky-700 border border-sky-200`)
  - **กำลังผลิต (In Production)**: Amber Tones (`bg-amber-50 text-amber-800 border border-amber-200`)
  - **เสร็จสิ้น (Completed)**: Emerald Tones (`bg-emerald-50 text-emerald-700 border border-emerald-200`)
  - **ล่าช้า / มีปัญหา (Delayed)**: Rose Tones (`bg-rose-50 text-rose-700 border border-rose-200`)

### Table Design
- Compact density for factory data: header background `#F8FAFC`, `#64748B` uppercase 12px medium font.
- Row hover background: `#F1F5F9` with subtle transition.
- High-contrast cell text (`#0F172A`).

### Cards & Sidebar Container
- **AppShell Sidebar**: Collapsible (64px collapsed icon-only vs 240px expanded).
- **Cards**: White background surface (`bg-white`), border `#E2E8F0`, subtle shadow (`shadow-sm`).

### Modals & Dialogs
- Centered dialog container with backdrop `#0F172A` with 30% opacity overlay (`bg-slate-900/30 backdrop-blur-xs`).
- Smooth scale & fade-in transition (200ms cubic-bezier).

---

## 5. Motion Principles & Tokens

- **Duration Presets**:
  - `fast`: `150ms` (hover states, focus rings, button presses)
  - `normal`: `200ms` (dropdowns, tooltips, accordion toggles)
  - `slow`: `300ms` (sidebar collapse/expand, modal open, page transitions)
- **Easing Curve**: `cubic-bezier(0.16, 1, 0.3, 1)` (Fluid Apple-inspired ease-out)
- **Reduced Motion Support**:
  - Respect `prefers-reduced-motion: reduce`.
  - Fall back to instantaneous (0ms) state switches without motion blur or slide transforms when reduced motion is requested.

---

## 6. Accessibility & Operational Rules

- Contrast ratio >= 4.5:1 for all standard text against background surface.
- Clear visible focus indicator rings (`ring-2 ring-sky-500 ring-offset-1`).
- All interactive controls have explicit `aria-label` or visible text labels in Thai.

---

## 7. UI Anti-Patterns to Avoid

- ❌ **No Excessive Glassmorphism**: Avoid heavy background blurs that reduce text readability over data tables.
- ❌ **No Rainbow Gradients**: Avoid bright multi-color gradients on cards, buttons, or headers.
- ❌ **No Low-Contrast Text**: Avoid light grey text (`slate-400` or lighter) for critical production numbers.
- ❌ **No Font Family Mixing**: Do not combine Kanit, Prompt, and Sarabun. Maintain unified Noto Sans Thai typography.
- ❌ **No Unused Dark Mode Utilities**: Keep codebase focused purely on Light Theme MVP.
