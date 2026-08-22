# DESIGN.md

## Product
Carrier-grade telecom operations platform for VOS3000:
- Admin portal: NOC, customers, gateways, routing, rates, billing, CDR, alarms.
- Client portal: balance, CDR, live calls, gateways, rates, payments, reports, API.

Design goal: **dense, calm, fast, trustworthy**. The UI must feel like infrastructure software, not a marketing dashboard.

---

## 1. Core Principles

1. **Data first** — tables, filters, KPIs and status are the product.
2. **Restrained color** — neutral surfaces; color only for action, status and realtime.
3. **Readable density** — compact without becoming cramped.
4. **Clear hierarchy** — one primary action per page/section.
5. **Safe operations** — destructive, financial and network-changing actions are visually distinct and require confirmation.
6. **Realtime clarity** — always show last refresh / live connection state.
7. **Light + dark** — light is default; dark is optimized for NOC/live operations.

---

## 2. Color System

### Brand
```text
Primary / Signal Blue      #2563EB
Primary Hover              #1D4ED8
Primary Soft               #DBEAFE
Realtime / Network Cyan    #06B6D4
Realtime Deep              #0891B2
```

### Light Surfaces
```text
Background                 #F8FAFC
Surface                    #FFFFFF
Surface Subtle             #F1F5F9
Border                     #E2E8F0
Border Strong              #CBD5E1

Text Primary               #0F172A
Text Secondary             #475569
Text Muted                 #64748B
Text Disabled              #94A3B8
```

### Dark / NOC Surfaces
```text
Background                 #080D17
Sidebar                    #0B1220
Surface                    #111827
Surface Elevated           #172033
Surface Hover              #1E293B
Border                     #253149
Border Strong              #334155

Text Primary               #F8FAFC
Text Secondary             #CBD5E1
Text Muted                 #94A3B8
```

### Semantic
```text
Success / Online           #16A34A
Warning / Degraded         #D97706
Danger / Offline / Error   #DC2626
Pending                    #7C3AED
Disabled                   #64748B
Info                       #2563EB
Realtime                   #06B6D4
```

Rules:
- Blue = primary action/link.
- Cyan = live/network/realtime only.
- Green = healthy/success only.
- Amber = degraded/warning only.
- Red = critical/destructive only.
- Never use semantic colors decoratively.
- Never use color alone for status; always pair with label/icon.

---

## 3. Typography

### Fonts
- UI / headings / tables: **Inter**
- Technical values: **IBM Plex Mono**
- Fallback: `system-ui, -apple-system, "Segoe UI", sans-serif`

### Scale
```text
Page title        24px / 700 / 32px
Section title     18px / 600 / 26px
Card title        16px / 600 / 24px
Body              14px / 400 / 21px
Body strong       14px / 600 / 21px
Table             13px / 400-500 / 18px
Label             13px / 500 / 18px
Helper            12px / 400 / 17px
Badge             11-12px / 600 / 16px
KPI               28-32px / 700
Mono technical    12-13px / 500 / 18px
```

Use:
```css
font-variant-numeric: tabular-nums;
```
for money, rates, CPS, ASR, ACD, PDD, durations, balances, timestamps and counts.

Use IBM Plex Mono for:
- IP addresses
- SIP codes
- Call-ID
- request_id
- gateway IDs
- VOS account IDs
- API keys / technical identifiers

---

## 4. Layout

### Spacing
Base unit: **8px**

```text
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
```

### Shell
- Admin sidebar: 248px desktop, collapsible.
- Client sidebar: 232px desktop, lighter visual weight.
- Top bar: 56-64px.
- Main max width: fluid; tables may use full available width.
- Page padding: 24px desktop, 16px tablet/mobile.
- Card padding: 16-24px.
- Section gap: 24-32px.

### Breakpoints
```text
Mobile      < 768
Tablet      768-1023
Desktop     1024-1439
Wide        >= 1440
```

---

## 5. Shapes & Elevation

```text
Input radius       6px
Table/card radius  8px
Modal radius       12px
Badge radius       9999px
Button radius      8px
```

Do not over-round enterprise controls.

Shadows:
```text
Level 0: none
Level 1: 0 1px 3px rgba(15,23,42,.08)
Level 2: 0 8px 24px rgba(15,23,42,.10)
```

Prefer borders over heavy shadows.

---

## 6. Components

### Buttons
Primary:
- `#2563EB`
- white text
- hover `#1D4ED8`
- height 36-40px

Secondary:
- white / transparent
- `#CBD5E1` border
- `#334155` text

Danger:
- `#DC2626`
- only for destructive actions

Rules:
- One dominant primary action per page/header.
- Cancel is neutral, never red.
- Dangerous actions require explicit confirmation.

### Inputs
- 36-40px height
- 1px border
- focus ring using Primary Blue
- validation message under field
- labels always visible; placeholders are not labels

### Tables
Default for CDR, customers, gateways, rates, billing.
- 13px body
- sticky header where useful
- 40-44px row height
- server-side pagination/filter/sort
- column chooser for dense datasets
- numeric columns right aligned
- technical IDs mono
- status badge + text
- no full-row red/green backgrounds

### Status Badges
```text
Online       green
Degraded     amber
Offline      red
Registering  cyan
Pending      violet
Disabled     slate
```

### KPI Cards
- neutral number/text
- status color only on indicator, trend or icon
- show comparison period
- show data freshness

### Alerts
- concise title
- one-line reason
- optional action
- semantic left border/icon
- no full-page saturated color

---

## 7. Navigation

### Admin
Use dark sidebar even in light mode:
```text
Sidebar bg      #0B1220
Active bg       #172554
Active text     #FFFFFF
Active icon     #60A5FA
Inactive text   #94A3B8
Hover bg        #172033
```

Recommended top-level:
```text
Dashboard
NOC
Customers
Gateways
Phones
Live Calls
CDR
Analytics
Rates
Billing
Payments
Reports
Alarms
Support
Integrations
Security
System
```

### Client
Use lighter, simpler navigation:
```text
Overview
Live Calls
CDR
Analytics
Gateways
Rates
Billing
Reports
Developers
Support
Settings
```

---

## 8. Charts

Default series:
```text
Blue      #2563EB
Cyan      #0891B2
Violet    #7C3AED
Green     #16A34A
Amber     #D97706
Pink      #DB2777
Indigo    #4F46E5
Slate     #64748B
```

Rules:
- Reserve red primarily for failure/critical states.
- Keep grid lines subtle.
- Always include exact value on hover.
- Never rely on chart color alone; legends/labels required.

---

## 9. Telecom-Specific UI Rules

### CDR
- answered = green status dot + label
- failed = red
- rejected = amber
- in progress = cyan
- keep row background neutral
- expose advanced filters in a collapsible filter panel
- use cursor pagination for very large result sets

### Live Calls
- show Live/Disconnected connection indicator
- duration updates without reloading the whole table
- display customer-safe fields only
- disconnect is an admin-only dangerous action

### Gateways
Always surface:
- online state
- registered IP
- active / max channels
- CPS
- ASR
- ACD
- last registration/update
- packet loss / latency when available

### Finance
- use tabular numbers
- right-align amounts
- show currency explicitly
- payment status is text + badge
- never imply funds were credited before backend confirmation

---

## 10. Dark Mode

Dark mode is first-class for:
- NOC dashboard
- live calls
- gateway monitoring
- alarm center

Do not use pure black. Use navy/slate surfaces.

---

## 11. Accessibility

- Minimum contrast WCAG AA.
- Touch target >= 40px; prefer 44px mobile.
- Keyboard focus always visible.
- Icons need labels/tooltips when meaning is not obvious.
- Error messages are textual, not color-only.
- Do not remove outline without replacement.

---

## 12. Do / Don't

### Do
- use Inter and tabular numerals
- use IBM Plex Mono for technical IDs
- keep surfaces neutral
- keep data dense but aligned
- show timestamps/freshness on realtime pages
- use badges for telecom state
- prefer borders and whitespace to decorative effects

### Don't
- use gradients in the operational app
- use glassmorphism
- use giant marketing typography inside admin/client pages
- use saturated full-card status backgrounds
- make every action blue
- use more than one primary CTA in the same action group
- expose carrier/internal data in client views
- invent VOS fields or capabilities not verified by backend

---

## 13. Source of Truth

This file is the UI source of truth.

When implementation differs from this file:
1. preserve accessibility and operational clarity;
2. preserve semantic color meaning;
3. preserve typography and density rules;
4. update this file if the design decision is intentionally changed.
