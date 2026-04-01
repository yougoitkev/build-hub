# TMS Phase 1 — UI Specification & Annotated Wireframes

> Version 1.0 · 2026-03-13

---

## Table of Contents

1. [Import Status List](#1-import-status-list)
2. [Column Mapping Editor](#2-column-mapping-editor)
3. [Import Preview & Row Editor](#3-import-preview--row-editor)
4. [Training+Day Attendance Matrix](#4-trainingday-attendance-matrix)
5. [Override Modal & History Viewer](#5-override-modal--history-viewer)
6. [Conflict Resolution Modal](#6-conflict-resolution-modal)
7. [Export Modal](#7-export-modal)
8. [Interaction Flows](#8-interaction-flows)
9. [Microcopy Reference](#9-microcopy-reference)

---

## 1. Import Status List

### Layout (Desktop — 1440px)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ◀ Sidebar                                                          │
├─────────────────────────────────────────────────────────────────────┤
│  Import Management                              [+ Upload Excel]   │
│  ─────────────────────────────────────────────────────────────────  │
│  Filter: [Status ▾]  [Date Range 📅]  [Search filename...]        │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ┌─ Card ──────────────────────────────────────────────────────┐   │
│  │  📄 Q1_Attendance_Template.xlsx                             │   │
│  │  Uploaded: 2026-03-12 09:14 · By: admin@acme.com           │   │
│  │                                                             │   │
│  │  Rows: 142  │  Valid: 138  │  Errors: 4  │  Warnings: 2    │   │
│  │                                                             │   │
│  │  Status: [🟡 Validated — 4 errors]                          │   │
│  │                                                             │   │
│  │  [Preview]  [Map Columns]  [Download Errors]  [Reprocess]   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ Card ──────────────────────────────────────────────────────┐   │
│  │  📄 Feb_Cohort_B.xlsx                                       │   │
│  │  Uploaded: 2026-03-10 14:30 · By: admin@acme.com           │   │
│  │                                                             │   │
│  │  Rows: 89  │  Valid: 89  │  Errors: 0  │  Warnings: 0      │   │
│  │                                                             │   │
│  │  Status: [🟢 Applied]                                       │   │
│  │                                                             │   │
│  │  [Preview]  [View Audit]                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─ Card ──────────────────────────────────────────────────────┐   │
│  │  📄 March_Intake.xlsx                                       │   │
│  │  Uploaded: 2026-03-13 08:00 · By: admin@acme.com           │   │
│  │                                                             │   │
│  │  Rows: —  │  Valid: —  │  Errors: —                         │   │
│  │                                                             │   │
│  │  Status: [⏳ Processing...]  (polling every 3s)             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Mobile (375px)

Cards stack full-width. Action buttons collapse into `⋮` overflow menu. Status badge remains visible.

### States

| Status | Badge Color | Available Actions |
|---|---|---|
| `Processing` | `bg-muted` + spinner | None (polling) |
| `Validated — 0 errors` | `bg-success/10 text-success` | Preview, Map Columns, **Apply**, Download Errors |
| `Validated — N errors` | `bg-warning/10 text-warning` | Preview, Map Columns, Download Errors, Reprocess |
| `Applied` | `bg-primary/10 text-primary` | Preview, View Audit |
| `Failed` | `bg-destructive/10 text-destructive` | Preview, Reprocess, Download Errors |

### Behavior

- **Polling**: When status = `Processing`, poll `GET /api/imports/{id}` every 3 seconds with exponential backoff (3s → 6s → 12s → max 30s). Stop polling when status ≠ `Processing`.
- **Apply button**: Only enabled when `errorRows === 0`. Clicking opens confirmation dialog.
- **Upload**: Opens file picker (`.xlsx, .xls` only, max 20 MB). On select → `POST /api/imports` with `multipart/form-data`. Immediate status = `Processing`.

---

## 2. Column Mapping Editor

### Layout (Desktop — Dialog 900px wide)

```
┌─────────────────────────────────────────────────────────────────┐
│  Column Mapping — Q1_Attendance_Template.xlsx           [✕]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Mapping Template: [── Select saved template ──  ▾]  [Save As] │
│                                                                 │
│  ┌─ Detected Columns ─────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  Excel Column         →  App Field           Transform      │ │
│  │  ─────────────────────────────────────────────────────────  │ │
│  │  "EMP ID"             →  [student.empId    ▾] [Trim      ▾]│ │
│  │  "Last Name"          →  [student.lastName ▾] [Trim      ▾]│ │
│  │  "First Name"         →  [student.firstName▾] [Trim      ▾]│ │
│  │  "LANGUAGE"           →  [student.language ▾] [Trim      ▾]│ │
│  │  "Source"             →  [student.source   ▾] [Trim      ▾]│ │
│  │  "Status"             →  [student.status   ▾] [Enum Map  ▾]│ │
│  │  "Day 1"              →  [day_1            ▾] [Attendance▾]│ │
│  │  "Day 2"              →  [day_2            ▾] [Attendance▾]│ │
│  │  ...                                                        │ │
│  │  "Day 47"             →  [day_47           ▾] [Attendance▾]│ │
│  │                                                             │ │
│  │  ⚠ 2 columns unmapped: "Notes", "Trainer"                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Transform Rules ──────────────────────────────────────────┐ │
│  │  Attendance Transform:                                      │ │
│  │    "P" → "8"  |  "A" → "0"  |  "NCNS" → "NCNS"           │ │
│  │    Numeric 0–8 → pass through                               │ │
│  │    [+ Add rule]                                             │ │
│  │                                                             │ │
│  │  Enum Map (Status):                                         │ │
│  │    "Active" → "active"  |  "LOA" → "leave"                 │ │
│  │    [+ Add rule]                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Cancel]                      [Save Mapping]  [Apply & Close] │
└─────────────────────────────────────────────────────────────────┘
```

### App Field Dropdown Options

**Student fields**: `student.empId`, `student.firstName`, `student.lastName`, `student.language`, `student.source`, `student.status`

**Day fields**: `day_1` through `day_47` (auto-detected when Excel column header matches `Day \d+` pattern)

**Special**: `-- Ignore --` (skip this column)

### Transform Dropdown Options

| Transform | Description |
|---|---|
| `None` | Pass through as-is |
| `Trim` | Trim leading/trailing whitespace |
| `Attendance` | Apply attendance enum mapping (P→8, A→0, etc.) then validate 0–8 or NCNS |
| `Enum Map` | Custom key→value pairs defined in Transform Rules section |
| `Date Parse` | Parse date string to ISO format |
| `Uppercase` | Convert to uppercase |

### Behavior

- **Auto-detect**: Backend returns `detectedMappings[]` in preview response. UI pre-fills dropdowns. Unmapped columns highlighted with ⚠.
- **Save As**: Opens name input → `POST /api/mappings` with `{ name, mappings[], transforms[] }`.
- **Load template**: `GET /api/mappings` → populate dropdowns from saved template.
- **Apply & Close**: Saves mapping and triggers `POST /api/imports/{id}/reprocess` with the mapping ID.

---

## 3. Import Preview & Row Editor

### Layout (Desktop — Full page or large dialog)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Import Preview — Q1_Attendance_Template.xlsx                       │
│  142 rows · 4 errors · 2 warnings                    [Download ⬇] │
├─────────────────────────────────────────────────────────────────────┤
│  Filter: [All ▾] [Errors Only] [Warnings Only]   [Search EMP ID…] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Row │ Status │ EMP ID  │ Last Name │ First │ Day1 │ Day2 │ ...    │
│  ────┼────────┼─────────┼───────────┼───────┼──────┼──────┼─────── │
│   2  │ ✅     │ E1001   │ Smith     │ Jane  │  8   │  7   │ ...    │
│   3  │ ✅     │ E1002   │ Doe       │ John  │ NCNS │  8   │ ...    │
│   4  │ 🔴 Err │ E1003   │ Brown     │ Alex  │  9̲   │  8   │ ...    │
│      │        │         │           │       │ ↑"9 invalid: must    │
│      │        │         │           │       │  be 0–8 or NCNS"     │
│   5  │ ⚠ Warn │ E1004   │ Lee       │ Sam   │  8   │  8   │ ...    │
│      │        │ ↑ Potential duplicate (matches row 12)              │
│   6  │ 🔴 Err │         │ ???       │       │  8   │  8   │ ...    │
│      │        │ ↑ "Missing required field: EMP ID"                  │
│  ────┼────────┼─────────┼───────────┼───────┼──────┼──────┼─────── │
│                                                                     │
│  ┌─ Inline Edit (Row 4) ──────────────────────────────────────┐    │
│  │  Day 1: [8  ▾]  ← corrected from "9"                      │    │
│  │  [Save Fix]  [Skip Row]                                    │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  Page: [← 1 2 3 ... 15 →]                                         │
│                                                                     │
│  [Download Error Rows CSV]    [Mark Skipped: 0]    [Apply Import]  │
│                                   ↑ disabled if errors > 0         │
└─────────────────────────────────────────────────────────────────────┘
```

### Row Status Icons

| Icon | Meaning |
|---|---|
| ✅ | Valid row |
| 🔴 | Error — blocks Apply |
| ⚠️ | Warning — does not block Apply (e.g., potential duplicate) |
| ℹ️ | Info — advisory (e.g., student created vs matched) |
| ⏭ | Skipped by admin |

### Inline Edit Behavior

1. Click error cell → cell becomes editable (dropdown for attendance values, text input for metadata).
2. On change → client-side validation fires immediately (red border if still invalid, green if fixed).
3. **Save Fix** → `PUT /api/imports/{id}/rows/{rowNumber}` with corrected values. Backend re-validates row.
4. **Skip Row** → marks row as skipped; excluded from Apply. Badge changes to ⏭.

### Download Error Rows

`GET /api/imports/{id}/errors?format=csv` → downloads CSV with columns: `rowNumber, columnName, originalValue, errorMessage`.

### Disambiguation Modal

When backend flags `duplicateMatch: true` on a row:

```
┌─────────────────────────────────────────────────┐
│  Duplicate Student Match — Row 5                │
├─────────────────────────────────────────────────┤
│  EMP ID "E1004" matches multiple students:      │
│                                                 │
│  ○ Sam Lee (ID: stu_abc) — Cohort A, Active     │
│  ○ Samuel Lee (ID: stu_def) — Cohort B, LOA     │
│  ○ Create new student                           │
│                                                 │
│  [Cancel]                     [Confirm Match]   │
└─────────────────────────────────────────────────┘
```

---

## 4. Training+Day Attendance Matrix

### Layout (Desktop — 1440px, main content area)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Attendance Matrix                    [Keyboard: Tab/Arrows to nav]    │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─ Filters ──────────────────────────────────────────────────────┐   │
│  │  Cohort: [All Cohorts     ▾]   Training: [Pre-Process     ▾]  │   │
│  │  Day Range: [📅 From] → [📅 To]               [Apply Filter]  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─ Bulk Actions ─────────────────────────────────────────────────┐   │
│  │  Select: [☐ All]  Set Value: [__▾]  [Apply Bulk]              │   │
│  │  Pending changes: 3          [💾 Save All]  [✕ Discard]       │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─ Matrix ──────────────────────────────────────────────────────────┐│
│  │           │← Pre-Process ──────────→│← Tier 1A ──────→│ Summary ││
│  │  Student  │ D1  │ D2  │ D3  │ ...D8 │ D9  │ D10 │ ... │ Totals  ││
│  │  ─────────┼─────┼─────┼─────┼───────┼─────┼─────┼─────┼──────── ││
│  │  ┌──────┐ │     │     │     │       │     │     │     │         ││
│  │  │🧑 J.S│ │[8▾] │[7▾] │[NC▾]│ ...   │[8▾] │[0▾] │ ... │ 48h    ││
│  │  │E1001 │ │  ⓘ  │     │  ⓘ  │       │  🔶 │     │     │ 2A 1N  ││
│  │  └──────┘ │     │     │     │       │     │     │     │         ││
│  │  ─────────┼─────┼─────┼─────┼───────┼─────┼─────┼─────┼──────── ││
│  │  ┌──────┐ │     │     │     │       │     │     │     │         ││
│  │  │🧑 J.D│ │[8▾] │[8▾] │[8▾] │ ...   │[8▾] │[8▾] │ ... │ 64h    ││
│  │  │E1002 │ │     │     │     │       │     │     │     │ 0A 0N  ││
│  │  └──────┘ │     │     │     │       │     │     │     │         ││
│  └───────────────────────────────────────────────────────────────────┘│
│                                                                       │
│  Legend: ⓘ = Imported value (hover for provenance)                    │
│          🔶 = Overridden value (hover for override details)            │
│                                                                       │
│  ┌─ Sidebar: Recent Audit ────────┐  ┌─ Compliance ──────────────┐  │
│  │  Day 5: 8 → 0                  │  │  All overrides require     │  │
│  │  "Student was absent"          │  │  valid business reasons.   │  │
│  │  trainer@acme.com · 09:14      │  │  Audit logs are immutable. │  │
│  └────────────────────────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Cell Behavior

| Interaction | Result |
|---|---|
| Click cell | Opens `HoursDropdown` (NCNS, 0, 1, 2, 3, 4, 5, 6, 7, 8) |
| Select new value on imported cell | Opens Override Modal (reason required) |
| Select new value on already-overridden cell | Direct update, no modal |
| Hover cell with ⓘ | Tooltip: `"Imported from Import #123 (row 45)"` |
| Hover cell with 🔶 | Tooltip: `"Overridden by trainer@acme.com on 2026-03-12 — Reason: Student was late"` |
| Tab / Arrow keys | Navigate between cells |
| Escape | Close dropdown without changing |

### Summary Column (per row)

| Metric | Formula | Display |
|---|---|---|
| Total Hours | `SUM(day_1..day_47) where value is numeric` | `48h` |
| Absences | `COUNT(day_x == 0)` | `2A` |
| NCNS | `COUNT(day_x == 'NCNS')` | `1N` |

### Tier Group Headers

Tier groups span columns with a colored header bar:

| Tier | Days | Header Color |
|---|---|---|
| Pre-Process | 1–8 | `bg-primary/5` |
| Tier 1A | 9–20 | `bg-primary/10` |
| Tier 1A Nesting | 21–25 | `bg-primary/5` |
| Tier 1B | 26–31 | `bg-primary/10` |
| Tier 1B Nesting | 32–37 | `bg-primary/5` |
| Collections | 38 | `bg-accent/10` |
| Tier 1C Nesting | 39–47 | `bg-primary/5` |

### Autosave Draft

- Changes are held in local state as `pendingChanges[]`.
- Pending count badge shown on Save button.
- **Save All** → `POST /api/attendance/batch` with all pending changes. Optimistic UI: mark cells as saved immediately, revert on 4xx/5xx.
- **Discard** → reset local state to last server state. Confirmation dialog: "Discard N unsaved changes?"

### Mobile (375px)

Matrix collapses to a single-student card view. Filter selects one student; days shown as a vertical list with tier grouping accordions.

---

## 5. Override Modal & History Viewer

### Override Modal

```
┌─────────────────────────────────────────────────────┐
│  Override Imported Value                     [✕]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Student: Jane Smith (E1001)                        │
│  Day: Day 5 (Pre-Process)                           │
│  Current Value: 8 (Imported from Import #123)       │
│                                                     │
│  New Value: [0  ▾]                                  │
│                                                     │
│  Reason: *                                          │
│  ┌─────────────────────────────────────────────┐    │
│  │ Student was absent — confirmed by team lead │    │
│  └─────────────────────────────────────────────┘    │
│  ⚠ Reason is required for overriding imported data  │
│                                                     │
│  [Cancel]                        [Confirm Override] │
│                                  ↑ disabled if no   │
│                                    reason entered   │
└─────────────────────────────────────────────────────┘
```

### Cell History Viewer (popover or slide-out)

```
┌────────────────────────────────────────────────────┐
│  History — Jane Smith · Day 5                      │
├────────────────────────────────────────────────────┤
│                                                    │
│  ● Current: 0 (Overridden)                         │
│  │  By: trainer@acme.com                           │
│  │  At: 2026-03-12 14:30                           │
│  │  Reason: "Student was absent"                   │
│  │                                                 │
│  ● Previous: 8 (Imported)                          │
│  │  Import #123, Row 45                            │
│  │  At: 2026-03-10 09:00                           │
│  │                                                 │
│  ● Original: 8 (Excel cell F45)                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 6. Conflict Resolution Modal (Scheduling)

```
┌──────────────────────────────────────────────────────────┐
│  ⚠ Scheduling Conflict Detected                  [✕]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Trainer: Alex Johnson                                   │
│                                                          │
│  Requested:                                              │
│    Batch: "Q1 Onboarding" · Mar 15, 09:00–17:00         │
│    Location: Virtual                                     │
│                                                          │
│  Conflicts with:                                         │
│    Batch: "Advanced Skills" · Mar 15, 10:00–14:00        │
│    Location: Room 201                                    │
│                                                          │
│  ──────────────────────────────────────────────────────  │
│                                                          │
│  Options:                                                │
│  ○ Choose a different trainer                            │
│  ○ Choose a different time slot                          │
│  ○ Admin override (requires reason)                      │
│     Reason: [________________________________]           │
│                                                          │
│  [Cancel]                           [Resolve Conflict]   │
└──────────────────────────────────────────────────────────┘
```

---

## 7. Export Modal

```
┌──────────────────────────────────────────────────┐
│  Export Attendance Data                    [✕]    │
├──────────────────────────────────────────────────┤
│                                                  │
│  Mode:                                           │
│  ○ Raw Imported — Original Excel values only     │
│  ● Final State — With all manual overrides       │
│                                                  │
│  Format:                                         │
│  ● CSV  ○ Excel (.xlsx)  ○ PDF                   │
│                                                  │
│  Scope:                                          │
│  Cohort: [All Cohorts ▾]                         │
│  Training: [All ▾]                               │
│  Date Range: [📅 From] → [📅 To]                │
│                                                  │
│  ☑ Include student metadata                      │
│  ☑ Include tier totals                           │
│  ☐ Include audit trail                           │
│  ☐ Mask PII (Last 4 of EMP ID only)             │
│                                                  │
│  [Cancel]                     [Export & Download] │
└──────────────────────────────────────────────────┘
```

### Export CSV Columns (Final State mode)

```csv
empId,firstName,lastName,language,source,status,day_1,day_1_overridden,day_1_overrideReason,...,day_47,day_47_overridden,totalHours,totalAbsences,ncnsCount,earlyLateCount,tier_preprocess_total,tier_1a_total,...
```

### PII Masking Rules (by role)

| Role | EMP ID | Name | Email |
|---|---|---|---|
| Admin | Full | Full | Full |
| Trainer | Full | Full | Full |
| Supervisor | Full | Full | Full |
| Viewer | Last 4 | Initials only | Hidden |

---

## 8. Interaction Flows

### Flow 1: Import → Preview → Apply

```
Admin clicks [Upload Excel]
  → File picker (.xlsx only, max 20MB)
  → POST /api/imports (multipart)
  → UI adds card with status "Processing" + spinner
  → Poll GET /api/imports/{id} every 3s (backoff: 3→6→12→30s max)
  → Status changes to "Validated — N errors"
  → Admin clicks [Preview]
    → GET /api/imports/{id}/preview?page=1&pageSize=50
    → Render preview table
    → If errors: Admin clicks error cell → inline edit → [Save Fix]
      → PUT /api/imports/{id}/rows/{rowNum}
      → Cell re-validates (green check or red X)
    → If duplicates: disambiguation modal → resolve
    → If non-parseable: show original value + error message
  → When errors = 0: [Apply Import] enabled
    → POST /api/imports/{id}/apply
    → Confirmation: "Apply 142 rows? This creates attendance records."
    → On success: status → "Applied", toast "Import applied successfully"
    → On failure: status → "Failed", error details shown
```

### Flow 2: Matrix Edit with Override

```
Trainer opens Attendance Matrix
  → Selects Cohort + Training filter
  → GET /api/attendance?cohortId=X&training=Pre-Process
  → Matrix renders with tier-grouped columns
  → Trainer clicks Day 5 cell for student E1001
    → HoursDropdown opens
    → Trainer selects "0"
    → Cell has importId → Override Modal opens
      → Current: 8 (imported)
      → New: 0
      → Reason field (required)
      → Trainer types: "Student was absent"
      → [Confirm Override]
    → Cell updates locally (optimistic), pending count +1
    → Cell shows 🔶 badge
  → Trainer clicks [Save All]
    → POST /api/attendance/batch
    → On 200: toast "Saved", pending count → 0
    → On 207 (partial): show failed cells with error messages
    → On 4xx/5xx: revert all pending, toast error
```

### Flow 3: Export

```
Supervisor clicks [Export]
  → Export Modal opens
  → Selects mode: "Final State"
  → Selects format: CSV
  → Selects scope filters
  → [Export & Download]
    → GET /api/exports?mode=final&format=csv&cohortId=X
    → Browser downloads file
    → Toast: "Export downloaded — 142 records"
```

---

## 9. Microcopy Reference

### Labels

| Context | Text |
|---|---|
| Dropdown placeholder | "Select hours or NCNS" |
| Provenance tooltip | "Imported from Import #{id} (row {n})" |
| Override tooltip | "Overridden by {email} on {date} — {reason}" |
| Override modal title | "Override Imported Value" |
| Override modal warning | "You are overriding an imported value. Please provide a reason." |
| Override reason label | "Reason *" |
| Override reason placeholder | "e.g., Student was absent — confirmed by team lead" |
| Save button (with count) | "Save All (3 changes)" |
| Discard confirmation | "Discard 3 unsaved changes? This cannot be undone." |

### Status Labels

| Status | Text |
|---|---|
| Processing | "Processing… Please wait." |
| Validated (0 errors) | "Validated — Ready to apply" |
| Validated (N errors) | "Validated — {N} errors to resolve" |
| Applied | "Applied successfully" |
| Failed | "Failed — see details" |

### Error Messages

| Error | Message |
|---|---|
| Invalid attendance value | "Invalid value: \"{val}\". Expected NCNS or 0–8." |
| Missing EMP ID | "Missing required field: EMP ID" |
| Duplicate student match | "Multiple students match EMP ID \"{id}\". Please select the correct match." |
| Override without reason | "A reason is required when overriding imported data." |
| Conflict detected | "Scheduling conflict: {trainer} is already assigned to \"{batch}\" during this time." |
