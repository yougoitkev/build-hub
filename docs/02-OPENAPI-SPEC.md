# TMS Phase 1 — OpenAPI Specification (Skeleton)

> Version 1.0 · 2026-03-13  
> Base URL: `https://api.tms.example.com/v1`  
> Auth: Bearer token (OAuth2/OIDC — Azure AD compatible)

---

## Authentication

All endpoints require `Authorization: Bearer <token>` header.

```yaml
securityDefinitions:
  bearerAuth:
    type: http
    scheme: bearer
    bearerFormat: JWT
```

---

## 1. Imports

### `GET /api/imports`

List all imports with metadata.

**Query params**: `?status=validated&page=1&pageSize=20`

**Response 200**:
```json
{
  "data": [
    {
      "id": "imp_abc123",
      "filename": "Q1_Attendance_Template.xlsx",
      "uploadedAt": "2026-03-12T09:14:00Z",
      "uploadedBy": "admin@acme.com",
      "totalRows": 142,
      "validRows": 138,
      "errorRows": 4,
      "warningRows": 2,
      "status": "validated",
      "mappingId": "map_xyz789"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 5 }
}
```

---

### `POST /api/imports`

Upload Excel file.

**Content-Type**: `multipart/form-data`  
**Body**: `file` (required), `mappingId` (optional — apply saved mapping)

**Response 201**:
```json
{
  "id": "imp_def456",
  "status": "processing",
  "message": "File uploaded. Processing started."
}
```

**Response 400**:
```json
{
  "code": "INVALID_FILE",
  "message": "File must be .xlsx or .xls format, max 20MB."
}
```

---

### `GET /api/imports/{id}`

Get single import status (used for polling).

**Response 200**:
```json
{
  "id": "imp_abc123",
  "status": "validated",
  "totalRows": 142,
  "validRows": 138,
  "errorRows": 4,
  "warningRows": 2,
  "mappingId": "map_xyz789",
  "processedAt": "2026-03-12T09:15:30Z"
}
```

---

### `GET /api/imports/{id}/preview`

Preview rows with validation results.

**Query params**: `?page=1&pageSize=50&filter=errors|warnings|all`

**Response 200**:
```json
{
  "importId": "imp_abc123",
  "columns": [
    { "excelColumn": "EMP ID", "mappedField": "student.empId", "transform": "trim" },
    { "excelColumn": "Day 1", "mappedField": "day_1", "transform": "attendance" }
  ],
  "rows": [
    {
      "rowNumber": 2,
      "status": "valid",
      "data": {
        "student.empId": "E1001",
        "student.firstName": "Jane",
        "student.lastName": "Smith",
        "day_1": "8",
        "day_2": "7",
        "day_3": "NCNS"
      },
      "errors": [],
      "warnings": [],
      "matchedStudentId": "stu_abc",
      "duplicateMatch": false
    },
    {
      "rowNumber": 4,
      "status": "error",
      "data": {
        "student.empId": "E1003",
        "student.firstName": "Alex",
        "student.lastName": "Brown",
        "day_1": "9"
      },
      "errors": [
        {
          "columnName": "day_1",
          "originalValue": "9",
          "message": "Invalid value: \"9\". Expected NCNS or 0–8."
        }
      ],
      "warnings": [],
      "matchedStudentId": "stu_ghi",
      "duplicateMatch": false
    },
    {
      "rowNumber": 5,
      "status": "warning",
      "data": {
        "student.empId": "E1004",
        "student.firstName": "Sam",
        "student.lastName": "Lee",
        "day_1": "8"
      },
      "errors": [],
      "warnings": [
        { "columnName": "student.empId", "message": "Potential duplicate: matches row 12" }
      ],
      "matchedStudentId": null,
      "duplicateMatch": true,
      "duplicateCandidates": [
        { "studentId": "stu_abc", "name": "Sam Lee", "cohort": "Cohort A", "status": "active" },
        { "studentId": "stu_def", "name": "Samuel Lee", "cohort": "Cohort B", "status": "leave" }
      ]
    }
  ],
  "pagination": { "page": 1, "pageSize": 50, "total": 142 }
}
```

---

### `PUT /api/imports/{id}/rows/{rowNumber}`

Inline fix a row in preview.

**Request**:
```json
{
  "fixes": {
    "day_1": "8"
  }
}
```

**Response 200**:
```json
{
  "rowNumber": 4,
  "status": "valid",
  "errors": [],
  "warnings": []
}
```

**Response 422**:
```json
{
  "rowNumber": 4,
  "status": "error",
  "errors": [
    { "columnName": "day_1", "originalValue": "10", "message": "Invalid value: \"10\". Expected NCNS or 0–8." }
  ]
}
```

---

### `POST /api/imports/{id}/apply`

Finalize import → create attendance records.

**Request** (optional):
```json
{
  "skipRows": [6, 14]
}
```

**Response 200**:
```json
{
  "importId": "imp_abc123",
  "status": "applied",
  "recordsCreated": 140,
  "rowsSkipped": 2,
  "appliedAt": "2026-03-12T10:00:00Z"
}
```

**Response 409** (unresolved errors):
```json
{
  "code": "UNRESOLVED_ERRORS",
  "message": "Import has 4 unresolved errors. Resolve or skip error rows before applying.",
  "errorRows": [4, 6, 18, 22]
}
```

---

### `POST /api/imports/{id}/reprocess`

Re-validate import with updated mapping.

**Request**:
```json
{
  "mappingId": "map_xyz789"
}
```

**Response 200**:
```json
{
  "importId": "imp_abc123",
  "status": "processing",
  "message": "Reprocessing with updated mapping."
}
```

---

### `GET /api/imports/{id}/errors`

Download error rows.

**Query params**: `?format=csv`

**Response 200** (`text/csv`):
```csv
rowNumber,columnName,originalValue,errorMessage
4,day_1,9,"Invalid value: ""9"". Expected NCNS or 0–8."
6,student.empId,,"Missing required field: EMP ID"
```

---

## 2. Mapping Templates

### `GET /api/mappings`

**Response 200**:
```json
{
  "data": [
    {
      "id": "map_xyz789",
      "name": "Standard Attendance Template",
      "createdAt": "2026-03-01T12:00:00Z",
      "createdBy": "admin@acme.com",
      "mappings": [
        { "excelColumn": "EMP ID", "appField": "student.empId", "transform": "trim" },
        { "excelColumn": "Day 1", "appField": "day_1", "transform": "attendance" }
      ],
      "transforms": {
        "attendance": { "P": "8", "A": "0", "NCNS": "NCNS" }
      }
    }
  ]
}
```

### `POST /api/mappings`

**Request**:
```json
{
  "name": "Standard Attendance Template",
  "mappings": [
    { "excelColumn": "EMP ID", "appField": "student.empId", "transform": "trim" },
    { "excelColumn": "Day 1", "appField": "day_1", "transform": "attendance" }
  ],
  "transforms": {
    "attendance": { "P": "8", "A": "0", "NCNS": "NCNS" }
  }
}
```

**Response 201**:
```json
{ "id": "map_new123", "name": "Standard Attendance Template" }
```

---

## 3. Attendance

### `GET /api/attendance`

Query attendance records.

**Query params**: `?studentId=stu_abc&cohortId=coh_1&training=Pre-Process&dayFrom=1&dayTo=8&page=1&pageSize=50`

**Response 200**:
```json
{
  "data": [
    {
      "id": "att_001",
      "studentId": "stu_abc",
      "studentName": "Jane Smith",
      "empId": "E1001",
      "cohortId": "coh_1",
      "importId": "imp_abc123",
      "days": {
        "day_1": {
          "value": "8",
          "importedValue": "8",
          "importRowNumber": 2,
          "isOverridden": false,
          "remarks": null
        },
        "day_5": {
          "value": "0",
          "importedValue": "8",
          "importRowNumber": 2,
          "isOverridden": true,
          "overriddenBy": "trainer@acme.com",
          "overriddenAt": "2026-03-12T14:30:00Z",
          "overrideReason": "Student was absent",
          "remarks": "Confirmed by team lead"
        }
      },
      "summary": {
        "hoursCompleted": 48,
        "totalAbsences": 2,
        "earlyLateCount": 3,
        "ncnsCount": 1
      },
      "tierTotals": {
        "pre-process": 42,
        "tier1a": 80,
        "tier1a-nesting": 32,
        "tier1b": 40,
        "tier1b-nesting": 44,
        "collections": 8,
        "tier1c-nesting": 56
      }
    }
  ],
  "pagination": { "page": 1, "pageSize": 50, "total": 30 }
}
```

---

### `POST /api/attendance/batch`

Batch update attendance cells.

**Request**:
```json
{
  "updates": [
    {
      "attendanceId": "att_001",
      "studentId": "stu_abc",
      "dayField": "day_5",
      "newValue": "0",
      "overrideReason": "Student was absent",
      "remarks": "Confirmed by team lead"
    },
    {
      "attendanceId": "att_002",
      "studentId": "stu_def",
      "dayField": "day_3",
      "newValue": "NCNS",
      "overrideReason": "No call no show — verified"
    }
  ]
}
```

**Response 200** (all succeeded):
```json
{
  "status": "success",
  "updatedCount": 2,
  "results": [
    { "attendanceId": "att_001", "dayField": "day_5", "status": "updated" },
    { "attendanceId": "att_002", "dayField": "day_3", "status": "updated" }
  ]
}
```

**Response 207** (partial success):
```json
{
  "status": "partial",
  "updatedCount": 1,
  "failedCount": 1,
  "results": [
    { "attendanceId": "att_001", "dayField": "day_5", "status": "updated" },
    {
      "attendanceId": "att_002",
      "dayField": "day_3",
      "status": "failed",
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid value: \"10\". Expected NCNS or 0–8."
      }
    }
  ]
}
```

**Response 409** (conflict — concurrent edit):
```json
{
  "code": "CONCURRENT_EDIT",
  "message": "Record att_001.day_5 was modified by another user. Please refresh and retry.",
  "conflictDetails": {
    "attendanceId": "att_001",
    "dayField": "day_5",
    "yourValue": "0",
    "serverValue": "6",
    "lastModifiedBy": "supervisor@acme.com",
    "lastModifiedAt": "2026-03-12T14:29:50Z"
  }
}
```

---

### `PUT /api/attendance/{attendanceId}`

Single cell override.

**Request**:
```json
{
  "dayField": "day_5",
  "newValue": "0",
  "overrideReason": "Student was absent",
  "remarks": "Confirmed by team lead"
}
```

**Response 200**:
```json
{
  "attendanceId": "att_001",
  "dayField": "day_5",
  "previousValue": "8",
  "newValue": "0",
  "isOverridden": true,
  "overriddenBy": "trainer@acme.com",
  "overriddenAt": "2026-03-12T14:30:00Z",
  "updatedSummary": {
    "hoursCompleted": 40,
    "totalAbsences": 3,
    "earlyLateCount": 3,
    "ncnsCount": 1
  }
}
```

---

## 4. Exports

### `GET /api/exports`

**Query params**: `?mode=raw|final&format=csv|xlsx|pdf&cohortId=X&training=Pre-Process&dayFrom=1&dayTo=47&includeTierTotals=true&includeAudit=false&maskPii=false`

**Response 200**: Binary file download with `Content-Disposition: attachment; filename="attendance_export_final_2026-03-12.csv"`

---

## 5. Audit

### `GET /api/audit`

**Query params**: `?entity=attendance&entityId=att_001&since=2026-03-01T00:00:00Z&page=1&pageSize=50`

**Response 200**:
```json
{
  "data": [
    {
      "id": "aud_001",
      "entity": "attendance",
      "entityId": "att_001",
      "action": "override",
      "field": "day_5",
      "originalValue": "8",
      "newValue": "0",
      "reason": "Student was absent",
      "changedBy": "trainer@acme.com",
      "changedByName": "Trainer Smith",
      "changedAt": "2026-03-12T14:30:00Z",
      "metadata": {
        "importId": "imp_abc123",
        "importRowNumber": 2
      }
    }
  ],
  "pagination": { "page": 1, "pageSize": 50, "total": 12 }
}
```

---

## 6. Students

### `GET /api/students`

**Query params**: `?cohortId=X&search=smith&page=1&pageSize=50`

### `GET /api/students/{id}`

Includes attendance summary and certification status.

---

## 7. Trainers

### `GET /api/trainers`
### `POST /api/trainers`
### `PUT /api/trainers/{id}`
### `DELETE /api/trainers/{id}`

Standard CRUD. See data model doc for field definitions.

---

## 8. Schedule / Batches

### `POST /api/batches`

Create batch with trainer assignment.

**Request**:
```json
{
  "title": "Q1 Onboarding",
  "courseCode": "ONB-101",
  "startDateTime": "2026-03-15T09:00:00Z",
  "endDateTime": "2026-03-15T17:00:00Z",
  "location": "virtual",
  "capacity": 25,
  "accountTag": "Acme Corp",
  "trainerIds": ["tr_001"]
}
```

**Response 201**: Created batch object.

**Response 409** (scheduling conflict):
```json
{
  "code": "SCHEDULING_CONFLICT",
  "message": "Trainer Alex Johnson has a conflicting assignment.",
  "conflicts": [
    {
      "trainerId": "tr_001",
      "trainerName": "Alex Johnson",
      "conflictingBatch": {
        "id": "batch_existing",
        "title": "Advanced Skills",
        "startDateTime": "2026-03-15T10:00:00Z",
        "endDateTime": "2026-03-15T14:00:00Z"
      }
    }
  ],
  "allowAdminOverride": true
}
```

### `POST /api/batches` with `forceOverride: true`

Admin override for scheduling conflicts.

**Request** (additional fields):
```json
{
  "forceOverride": true,
  "overrideReason": "Trainer agreed to handle both sessions"
}
```

---

## 9. Conflict Check

### `POST /api/schedule/conflict-check`

Pre-check for conflicts before saving.

**Request**:
```json
{
  "trainerIds": ["tr_001"],
  "startDateTime": "2026-03-15T09:00:00Z",
  "endDateTime": "2026-03-15T17:00:00Z"
}
```

**Response 200** (no conflicts):
```json
{ "hasConflicts": false, "conflicts": [] }
```

**Response 200** (conflicts found):
```json
{
  "hasConflicts": true,
  "conflicts": [
    {
      "trainerId": "tr_001",
      "trainerName": "Alex Johnson",
      "conflictType": "overlap",
      "conflictingBatch": {
        "id": "batch_existing",
        "title": "Advanced Skills",
        "startDateTime": "2026-03-15T10:00:00Z",
        "endDateTime": "2026-03-15T14:00:00Z"
      }
    }
  ]
}
```

---

## Error Schema (Global)

All error responses follow:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {},
  "rowErrors": [
    { "rowNumber": 4, "columnName": "day_1", "message": "Invalid value" }
  ]
}
```

### Error Codes

| Code | HTTP | Description |
|---|---|---|
| `INVALID_FILE` | 400 | Unsupported file format or size |
| `VALIDATION_ERROR` | 422 | Field validation failed |
| `UNRESOLVED_ERRORS` | 409 | Import has blocking errors |
| `CONCURRENT_EDIT` | 409 | Optimistic lock conflict |
| `SCHEDULING_CONFLICT` | 409 | Trainer double-booking |
| `MISSING_OVERRIDE_REASON` | 422 | Override attempted without reason |
| `UNAUTHORIZED` | 401 | Invalid or expired token |
| `FORBIDDEN` | 403 | Insufficient role permissions |
| `NOT_FOUND` | 404 | Resource not found |
