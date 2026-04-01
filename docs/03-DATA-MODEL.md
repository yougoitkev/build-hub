# TMS Phase 1 — Data Model & Business Logic

> Version 1.0 · 2026-03-13

---

## Table of Contents

1. [Logical Database Schema](#1-logical-database-schema)
2. [JSON Schemas](#2-json-schemas)
3. [Formulas & Calculations](#3-formulas--calculations)
4. [Notification & Job Design](#4-notification--job-design)
5. [Acceptance Test Cases](#5-acceptance-test-cases)

---

## 1. Logical Database Schema

### ER Overview

```
Import 1──* ImportedRow
Import 1──1 MappingTemplate
Student 1──* AttendanceRecord
AttendanceRecord 1──* DayRecord
DayRecord 0──* OverrideEvent
OverrideEvent ──> AuditEvent
Trainer 1──* TrainerSkill
Trainer 1──* Availability
Trainer 1──* Certification
Batch 1──* BatchTrainer
Batch 1──* BatchAttendee
Batch 1──* Task
Batch 1──* Feedback
Material 1──* MaterialVersion
```

### DDL (Logical — PostgreSQL dialect)

```sql
-- ============================================================
-- IMPORTS
-- ============================================================

CREATE TABLE import (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename        VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    uploaded_by     VARCHAR(255) NOT NULL,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status          VARCHAR(20) NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing','validated','applied','failed')),
    mapping_id      UUID REFERENCES mapping_template(id),
    total_rows      INT,
    valid_rows      INT,
    error_rows      INT,
    warning_rows    INT,
    processed_at    TIMESTAMPTZ,
    applied_at      TIMESTAMPTZ,
    error_message   TEXT
);

CREATE INDEX idx_import_status ON import(status);
CREATE INDEX idx_import_uploaded_at ON import(uploaded_at DESC);

CREATE TABLE imported_row (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id       UUID NOT NULL REFERENCES import(id) ON DELETE CASCADE,
    row_number      INT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','valid','error','warning','skipped')),
    raw_data        JSONB NOT NULL,           -- Original Excel row as JSON
    mapped_data     JSONB,                     -- After mapping transforms
    matched_student_id UUID REFERENCES student(id),
    duplicate_match BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(import_id, row_number)
);

CREATE INDEX idx_imported_row_import ON imported_row(import_id);
CREATE INDEX idx_imported_row_status ON imported_row(import_id, status);

CREATE TABLE imported_row_error (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imported_row_id UUID NOT NULL REFERENCES imported_row(id) ON DELETE CASCADE,
    column_name     VARCHAR(100) NOT NULL,
    original_value  TEXT,
    severity        VARCHAR(10) NOT NULL CHECK (severity IN ('error','warning','info')),
    message         TEXT NOT NULL
);

-- ============================================================
-- MAPPING TEMPLATES
-- ============================================================

CREATE TABLE mapping_template (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    created_by      VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mappings        JSONB NOT NULL,            -- Array of {excelColumn, appField, transform}
    transforms      JSONB                      -- Named transform rules
);

-- ============================================================
-- STUDENTS
-- ============================================================

CREATE TABLE student (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_id          VARCHAR(50) NOT NULL UNIQUE,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255),
    language        VARCHAR(50),
    source          VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'active',
    cohort_id       UUID REFERENCES cohort(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_emp_id ON student(emp_id);
CREATE INDEX idx_student_cohort ON student(cohort_id);

-- ============================================================
-- ATTENDANCE (Normalized day records)
-- ============================================================

CREATE TABLE attendance_record (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES student(id),
    cohort_id       UUID REFERENCES cohort(id),
    import_id       UUID REFERENCES import(id),
    import_row_number INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(student_id, cohort_id)
);

CREATE INDEX idx_attendance_student ON attendance_record(student_id);
CREATE INDEX idx_attendance_import ON attendance_record(import_id);

CREATE TABLE day_record (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id       UUID NOT NULL REFERENCES attendance_record(id) ON DELETE CASCADE,
    day_number          INT NOT NULL CHECK (day_number BETWEEN 1 AND 47),
    value               VARCHAR(4),              -- 'NCNS' or '0'..'8'
    imported_value      VARCHAR(4),              -- Original imported value
    is_overridden       BOOLEAN DEFAULT FALSE,
    remarks             TEXT,
    import_id           UUID REFERENCES import(id),
    import_row_number   INT,
    version             INT NOT NULL DEFAULT 1,   -- Optimistic locking
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(attendance_id, day_number)
);

CREATE INDEX idx_day_record_attendance ON day_record(attendance_id);
CREATE INDEX idx_day_record_day ON day_record(day_number);

-- ============================================================
-- OVERRIDES & AUDIT
-- ============================================================

CREATE TABLE override_event (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_record_id       UUID NOT NULL REFERENCES day_record(id),
    previous_value      VARCHAR(4),
    new_value           VARCHAR(4) NOT NULL,
    reason              TEXT NOT NULL,
    overridden_by       VARCHAR(255) NOT NULL,
    overridden_by_name  VARCHAR(255),
    overridden_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_override_day_record ON override_event(day_record_id);

CREATE TABLE audit_event (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity          VARCHAR(50) NOT NULL,        -- 'attendance', 'import', 'trainer', etc.
    entity_id       UUID NOT NULL,
    action          VARCHAR(50) NOT NULL,        -- 'create', 'update', 'override', 'delete', 'apply'
    field           VARCHAR(100),
    original_value  TEXT,
    new_value       TEXT,
    reason          TEXT,
    changed_by      VARCHAR(255) NOT NULL,
    changed_by_name VARCHAR(255),
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata        JSONB                        -- Additional context (importId, rowNumber, etc.)
);

CREATE INDEX idx_audit_entity ON audit_event(entity, entity_id);
CREATE INDEX idx_audit_changed_at ON audit_event(changed_at DESC);

-- ============================================================
-- TRAINERS
-- ============================================================

CREATE TABLE trainer (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    employee_id     VARCHAR(50) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    default_locations TEXT[],
    capacity        VARCHAR(20) CHECK (capacity IN ('full-time','part-time')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trainer_skill (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id      UUID NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
    skill_name      VARCHAR(100) NOT NULL,
    skill_level     VARCHAR(20),
    UNIQUE(trainer_id, skill_name)
);

CREATE TABLE trainer_availability (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id      UUID NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    start_time      TIME,
    end_time        TIME,
    type            VARCHAR(20) CHECK (type IN ('available','blocked','holiday','leave')),
    reason          TEXT,
    UNIQUE(trainer_id, date, start_time)
);

CREATE INDEX idx_availability_trainer_date ON trainer_availability(trainer_id, date);

-- ============================================================
-- CERTIFICATIONS
-- ============================================================

CREATE TABLE certification (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id      UUID NOT NULL REFERENCES trainer(id) ON DELETE CASCADE,
    cert_type       VARCHAR(100) NOT NULL,
    cert_level      VARCHAR(50),
    issuing_authority VARCHAR(255),
    date_issued     DATE,
    expiry_date     DATE,
    status          VARCHAR(20) CHECK (status IN ('qualified','probation','expired')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cert_trainer ON certification(trainer_id);
CREATE INDEX idx_cert_expiry ON certification(expiry_date);

-- ============================================================
-- BATCHES / SESSIONS
-- ============================================================

CREATE TABLE batch (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    course_code     VARCHAR(50),
    start_datetime  TIMESTAMPTZ NOT NULL,
    end_datetime    TIMESTAMPTZ NOT NULL,
    duration_hours  DECIMAL(5,2),
    location        VARCHAR(20) CHECK (location IN ('virtual','in-person')),
    location_details VARCHAR(255),
    capacity        INT,
    account_tag     VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'scheduled',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE batch_trainer (
    batch_id        UUID NOT NULL REFERENCES batch(id) ON DELETE CASCADE,
    trainer_id      UUID NOT NULL REFERENCES trainer(id),
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    force_override  BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    PRIMARY KEY (batch_id, trainer_id)
);

CREATE INDEX idx_batch_trainer_trainer ON batch_trainer(trainer_id);

-- ============================================================
-- TASKS
-- ============================================================

CREATE TABLE task (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    assigned_to     UUID REFERENCES trainer(id),
    batch_id        UUID REFERENCES batch(id),
    due_date        DATE,
    priority        VARCHAR(10) CHECK (priority IN ('low','medium','high')),
    status          VARCHAR(20) DEFAULT 'new'
                    CHECK (status IN ('new','in_progress','blocked','done')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MATERIALS
-- ============================================================

CREATE TABLE material (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    topic           VARCHAR(100),
    account         VARCHAR(100),
    locale          VARCHAR(20),
    owner           VARCHAR(255),
    current_version INT DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE material_version (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id     UUID NOT NULL REFERENCES material(id) ON DELETE CASCADE,
    version_number  INT NOT NULL,
    file_url        TEXT NOT NULL,
    file_size_bytes BIGINT,
    uploaded_by     VARCHAR(255) NOT NULL,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(material_id, version_number)
);

-- ============================================================
-- FEEDBACK
-- ============================================================

CREATE TABLE feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id        UUID NOT NULL REFERENCES batch(id),
    trainer_id      UUID NOT NULL REFERENCES trainer(id),
    rating          DECIMAL(2,1) CHECK (rating BETWEEN 1 AND 5),
    comments        TEXT,
    submitted_by    VARCHAR(255),
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COHORTS
-- ============================================================

CREATE TABLE cohort (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    start_date      DATE,
    end_date        DATE,
    account         VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 2. JSON Schemas

### AttendanceCell

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AttendanceCell",
  "type": "object",
  "required": ["value"],
  "properties": {
    "value": {
      "type": "string",
      "description": "Current cell value",
      "enum": ["NCNS", "0", "1", "2", "3", "4", "5", "6", "7", "8"]
    },
    "importedValue": {
      "type": ["string", "null"],
      "description": "Original value from import"
    },
    "importRowNumber": {
      "type": ["integer", "null"]
    },
    "isOverridden": {
      "type": "boolean",
      "default": false
    },
    "overriddenBy": { "type": ["string", "null"] },
    "overriddenAt": { "type": ["string", "null"], "format": "date-time" },
    "overrideReason": { "type": ["string", "null"] },
    "remarks": { "type": ["string", "null"] },
    "version": { "type": "integer", "default": 1 }
  }
}
```

### ImportPreviewRow

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ImportPreviewRow",
  "type": "object",
  "required": ["rowNumber", "status", "data"],
  "properties": {
    "rowNumber": { "type": "integer" },
    "status": {
      "type": "string",
      "enum": ["valid", "error", "warning", "info", "skipped"]
    },
    "data": {
      "type": "object",
      "description": "Key-value pairs of mapped field → value"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "columnName": { "type": "string" },
          "originalValue": { "type": ["string", "null"] },
          "message": { "type": "string" }
        }
      }
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "columnName": { "type": "string" },
          "message": { "type": "string" }
        }
      }
    },
    "matchedStudentId": { "type": ["string", "null"] },
    "duplicateMatch": { "type": "boolean" },
    "duplicateCandidates": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "studentId": { "type": "string" },
          "name": { "type": "string" },
          "cohort": { "type": "string" },
          "status": { "type": "string" }
        }
      }
    }
  }
}
```

### MappingTemplate

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MappingTemplate",
  "type": "object",
  "required": ["name", "mappings"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string", "maxLength": 255 },
    "mappings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["excelColumn", "appField"],
        "properties": {
          "excelColumn": { "type": "string" },
          "appField": { "type": "string" },
          "transform": {
            "type": "string",
            "enum": ["none", "trim", "attendance", "enum_map", "date_parse", "uppercase"]
          }
        }
      }
    },
    "transforms": {
      "type": "object",
      "description": "Named transform rules, e.g., { attendance: { P: '8', A: '0' } }"
    },
    "createdBy": { "type": "string" },
    "createdAt": { "type": "string", "format": "date-time" }
  }
}
```

### OverrideEvent

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "OverrideEvent",
  "type": "object",
  "required": ["dayRecordId", "newValue", "reason", "overriddenBy"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "dayRecordId": { "type": "string", "format": "uuid" },
    "previousValue": { "type": ["string", "null"] },
    "newValue": { "type": "string" },
    "reason": { "type": "string", "minLength": 1 },
    "overriddenBy": { "type": "string" },
    "overriddenByName": { "type": "string" },
    "overriddenAt": { "type": "string", "format": "date-time" }
  }
}
```

### AuditEvent

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AuditEvent",
  "type": "object",
  "required": ["entity", "entityId", "action", "changedBy", "changedAt"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "entity": { "type": "string" },
    "entityId": { "type": "string", "format": "uuid" },
    "action": { "type": "string", "enum": ["create", "update", "override", "delete", "apply", "import"] },
    "field": { "type": ["string", "null"] },
    "originalValue": { "type": ["string", "null"] },
    "newValue": { "type": ["string", "null"] },
    "reason": { "type": ["string", "null"] },
    "changedBy": { "type": "string" },
    "changedByName": { "type": "string" },
    "changedAt": { "type": "string", "format": "date-time" },
    "metadata": { "type": "object" }
  }
}
```

---

## 3. Formulas & Calculations

### Per-Student Summary

| Metric | Formula | Notes |
|---|---|---|
| **Hours Completed** | `SUM(day_d.value) FOR d IN 1..47 WHERE value IS NUMERIC` | NCNS excluded from sum (treated as 0 contribution). Numeric values 0–8 summed. |
| **Total Absences** | `COUNT(day_d) WHERE value = '0'` | Day where student was absent (0 hours). |
| **# Leave early / lates** | `COUNT(day_d) WHERE value IN ('1','2','3','4','5','6','7')` | Partial day: more than 0 but less than 8 hours. |
| **# NCNS** | `COUNT(day_d) WHERE value = 'NCNS'` | No Call No Show instances. |

### Tier Totals

| Tier | Days | Formula |
|---|---|---|
| Pre-Process | 1–8 | `SUM(day_1..day_8) WHERE value IS NUMERIC` |
| Tier 1A | 9–20 | `SUM(day_9..day_20) WHERE value IS NUMERIC` |
| Tier 1A Nesting | 21–25 | `SUM(day_21..day_25) WHERE value IS NUMERIC` |
| Tier 1B | 26–31 | `SUM(day_26..day_31) WHERE value IS NUMERIC` |
| Tier 1B Nesting | 32–37 | `SUM(day_32..day_37) WHERE value IS NUMERIC` |
| Collections | 38 | `value of day_38 WHERE NUMERIC` |
| Tier 1C Nesting | 39–47 | `SUM(day_39..day_47) WHERE value IS NUMERIC` |

**NCNS treatment**: NCNS values are excluded (contribute 0 to sum). They are counted separately in `# NCNS`.

### Max Possible Hours

| Tier | Days | Max (all 8h) |
|---|---|---|
| Pre-Process | 8 days | 64h |
| Tier 1A | 12 days | 96h |
| Tier 1A Nesting | 5 days | 40h |
| Tier 1B | 6 days | 48h |
| Tier 1B Nesting | 6 days | 48h |
| Collections | 1 day | 8h |
| Tier 1C Nesting | 9 days | 72h |
| **Total** | **47 days** | **376h** |

### Recalculation Rules

1. After any cell edit (single or batch), the server MUST recalculate and return `updatedSummary` in the response.
2. Frontend displays server-returned summary values (not client-computed) after save confirmation.
3. During optimistic UI (before save), frontend computes preview totals locally using the same formulas.
4. Tier totals recompute only for the affected tier.

### UI Placement

- **Student Summary Card**: Hours Completed, Total Absences, # Early/Late, # NCNS — shown on student detail page and as the rightmost column in the attendance matrix.
- **Tier Headers**: Each tier group header shows its sub-total (e.g., "Pre-Process: 42/64h").
- **Cohort Aggregates**: Supervisor dashboard shows AVG and distribution of each metric across cohort.

---

## 4. Notification & Job Design

### Background Jobs

| Job | Trigger | Schedule | Recipients | Message |
|---|---|---|---|---|
| Session Reminder | Batch `start_datetime - 24h` | Cron every 15 min, checks upcoming batches | Assigned trainers + registered attendees | "Reminder: {batch.title} starts tomorrow at {time}. Location: {location}." |
| Session Reminder (48h) | Batch `start_datetime - 48h` | Same cron | Same | "Upcoming: {batch.title} in 2 days on {date}." |
| Cert Expiry 90 days | `certification.expiry_date - 90d` | Daily at 08:00 UTC | Trainer + Admin | "Your {cert_type} certification expires in 90 days ({expiry_date}). Please plan renewal." |
| Cert Expiry 30 days | `certification.expiry_date - 30d` | Daily at 08:00 UTC | Same | "Urgent: {cert_type} expires in 30 days." |
| Cert Expiry 7 days | `certification.expiry_date - 7d` | Daily at 08:00 UTC | Same | "Critical: {cert_type} expires in 7 days. Renew immediately." |
| Import Complete | Import status changes to `validated` or `failed` | Event-driven | Uploading admin | "Import {filename} processing complete. Status: {status}. {errorRows} errors found." |
| Utilization Alert | Weekly | Monday 09:00 UTC | Admin | "Trainer {name} utilization: {pct}% ({classification}: over/under-utilized)." |

### Retry & Failure

- **Email delivery**: Retry 3 times with exponential backoff (1m, 5m, 30m). After 3 failures, log to `audit_event` with `action: 'notification_failed'`.
- **Job failures**: Log error, do not retry entire batch — only retry failed individual notifications.
- **Idempotency**: Each notification has a unique key `{jobType}_{entityId}_{triggerDate}` to prevent duplicate sends.

### Channels

- **Email**: Primary channel. Uses templated HTML emails.
- **Teams**: Webhook integration (configurable per admin). JSON Adaptive Card format.
- **In-App**: Stored in `notification` table, surfaced in bell icon dropdown.

### Admin Configuration

Admins can toggle per-job:
- Enable/disable
- Channel selection (email, Teams, in-app)
- Timing adjustment (e.g., reminder at 24h vs 48h)
- Recipient overrides

---

## 5. Acceptance Test Cases

### TC-01: Excel Import → Preview → Apply

| Step | Action | Expected |
|---|---|---|
| 1 | Admin uploads `Q1_Template.xlsx` (142 rows) | Card appears with status "Processing" |
| 2 | Wait for processing | Status changes to "Validated — 4 errors" |
| 3 | Click Preview | Preview table shows 142 rows; 4 rows marked 🔴 |
| 4 | Click error row (Day 1 = "9") | Cell becomes editable |
| 5 | Change to "8", click Save Fix | Row status changes to ✅ |
| 6 | Fix remaining 3 errors | Error count → 0 |
| 7 | Click Apply Import | Confirmation dialog appears |
| 8 | Confirm | Status → "Applied", 142 attendance records created |

### TC-02: Column Mapping

| Step | Action | Expected |
|---|---|---|
| 1 | Click Map Columns on import | Mapping editor opens with auto-detected mappings |
| 2 | Verify "EMP ID" → `student.empId` | Pre-filled correctly |
| 3 | Change "Day 1" transform to "Attendance" | Transform rule shown: P→8, A→0 |
| 4 | Click Save As "Standard Template" | Template saved |
| 5 | Upload new file, select saved template | Mappings auto-applied |

### TC-03: Attendance Matrix View & Edit

| Step | Action | Expected |
|---|---|---|
| 1 | Navigate to Attendance Matrix | Matrix loads with default cohort |
| 2 | Select Training: "Pre-Process" | Matrix shows Days 1–8 grouped under Pre-Process |
| 3 | Click Day 5 cell for student E1001 (imported value: 8) | Dropdown opens: NCNS, 0–8 |
| 4 | Select "0" | Override modal opens (imported value) |
| 5 | Enter reason: "Student absent" | Confirm Override enabled |
| 6 | Click Confirm Override | Cell shows "0" with 🔶 badge, pending count = 1 |
| 7 | Click Save All | POST /api/attendance/batch succeeds |
| 8 | Verify summary updates | Hours Completed decreased by 8; Absences +1 |

### TC-04: Provenance & Audit

| Step | Action | Expected |
|---|---|---|
| 1 | Hover imported cell (ⓘ badge) | Tooltip: "Imported from Import #123 (row 45)" |
| 2 | Hover overridden cell (🔶 badge) | Tooltip shows override details |
| 3 | Open cell history | Shows timeline: Original → Override with user + reason |
| 4 | Navigate to Audit page | Override event listed with all fields |

### TC-05: Bulk Actions

| Step | Action | Expected |
|---|---|---|
| 1 | Select all students | Checkbox selects all rows |
| 2 | Set Value: "8", Apply Bulk | All selected cells for visible day updated |
| 3 | Verify pending count | Count = number of students |
| 4 | Click Save All | Batch update succeeds |

### TC-06: Export Raw vs Final

| Step | Action | Expected |
|---|---|---|
| 1 | Click Export | Export modal opens |
| 2 | Select "Raw Imported" mode, CSV | Download contains original imported values only |
| 3 | Select "Final State" mode, CSV | Download contains overridden values + override columns |
| 4 | Enable PII masking as Viewer role | EMP ID shows last 4, name shows initials |

### TC-07: Scheduling Conflict

| Step | Action | Expected |
|---|---|---|
| 1 | Create batch: Mar 15, 09:00–17:00, Trainer: Alex | Conflict check runs |
| 2 | Alex has existing batch 10:00–14:00 | Conflict modal appears |
| 3 | Select "Admin override" + reason | Override saved with audit |
| 4 | Batch created | Both assignments visible on calendar |

### TC-08: Edge Cases

| Case | Input | Expected |
|---|---|---|
| Non-parseable cell | Day 3 = "abc" | Row marked 🔴, message: "Invalid value: \"abc\". Expected NCNS or 0–8." |
| Duplicate EMP ID | Two rows with "E1004" | Disambiguation modal for second row |
| Missing EMP ID | Empty EMP ID cell | Row error: "Missing required field: EMP ID" |
| NCNS in sum | Day with NCNS | Excluded from Hours Completed, counted in # NCNS |
| Override without reason | Submit empty reason | Button disabled, helper text shown |
| Concurrent edit | Two users edit same cell | Second save returns 409 with conflict details |

### TC-09: Notification Delivery

| Step | Action | Expected |
|---|---|---|
| 1 | Certification expiry in 90 days | Email sent to trainer + admin |
| 2 | Same certification, next day | No duplicate (idempotency key) |
| 3 | Email fails 3 times | Logged as `notification_failed` in audit |

### TC-10: Formula Verification

| Scenario | Day Values | Expected Summary |
|---|---|---|
| All 8s (47 days) | `8,8,8,...,8` | Hours: 376, Absences: 0, Early/Late: 0, NCNS: 0 |
| Mix | `8,0,NCNS,4,8,...` | Hours: sum of numerics, Abs: count of 0s, E/L: count of 1–7, NCNS: count of NCNS |
| All NCNS | `NCNS,NCNS,...` | Hours: 0, Absences: 0, Early/Late: 0, NCNS: 47 |
| All 0 | `0,0,...,0` | Hours: 0, Absences: 47, Early/Late: 0, NCNS: 0 |

---

## Server-Side Conflict Prevention (Scheduling)

### Transactional Behavior

```sql
-- Within a transaction:
BEGIN;

-- 1. Check availability
SELECT * FROM trainer_availability
WHERE trainer_id = $1
  AND date = $2
  AND type IN ('blocked', 'holiday', 'leave')
FOR UPDATE;

-- 2. Check overlapping batches
SELECT b.* FROM batch b
JOIN batch_trainer bt ON bt.batch_id = b.id
WHERE bt.trainer_id = $1
  AND b.start_datetime < $new_end
  AND b.end_datetime > $new_start
FOR UPDATE;

-- 3. If conflicts found and NOT forceOverride → ROLLBACK, return 409
-- 4. If forceOverride = true → INSERT with audit log
-- 5. COMMIT
```

### Optimistic Locking

- `day_record.version` column increments on each update.
- Batch update payload includes `expectedVersion` per cell.
- If `expectedVersion != current version` → return 409 CONCURRENT_EDIT for that cell.
- Partial success: other cells in batch still saved (207 response).
