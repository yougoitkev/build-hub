// Mock data for import management and tiered attendance

function generateDayValues(pattern) {
  const values = {};
  for (let d = 1; d <= 47; d++) {
    const r = Math.random();
    let val = "8";
    if (pattern === "good") {
      val = r < 0.05 ? "NCNS" : r < 0.1 ? "0" : r < 0.2 ? String(Math.floor(Math.random() * 3) + 5) : "8";
    } else if (pattern === "mixed") {
      val = r < 0.1 ? "NCNS" : r < 0.25 ? "0" : r < 0.4 ? String(Math.floor(Math.random() * 7) + 1) : "8";
    } else {
      val = r < 0.15 ? "NCNS" : r < 0.35 ? "0" : r < 0.5 ? String(Math.floor(Math.random() * 4) + 1) : "8";
    }
    values[`day_${d}`] = val;
    // Add periodic remarks
    if (Math.random() < 0.15) {
      values[`day_${d}_remarks`] = "Imported note from Excel: " + (val === "0" ? "Sick leave" : val === "NCNS" ? "No show" : "Partial day");
    }
  }
  return values;
}

// Seed with deterministic-ish values for demo
const studentDayData = {
  s1: { day_1: "8", day_2: "8", day_3: "7", day_4: "8", day_5: "NCNS", day_6: "8", day_7: "8", day_8: "6", day_9: "8", day_10: "8", day_11: "0", day_12: "8", day_13: "8", day_14: "8", day_15: "5", day_16: "8", day_17: "8", day_18: "8", day_19: "NCNS", day_20: "8", day_21: "8", day_22: "7", day_23: "8", day_24: "8", day_25: "8", day_26: "8", day_27: "0", day_28: "8", day_29: "8", day_30: "8", day_31: "6", day_32: "8", day_33: "8", day_34: "8", day_35: "NCNS", day_36: "8", day_37: "8", day_38: "8", day_39: "7", day_40: "8", day_41: "8", day_42: "8", day_43: "0", day_44: "8", day_45: "8", day_46: "8", day_47: "8" },
  s2: { day_1: "8", day_2: "0", day_3: "8", day_4: "8", day_5: "8", day_6: "NCNS", day_7: "8", day_8: "8", day_9: "4", day_10: "8", day_11: "8", day_12: "8", day_13: "0", day_14: "8", day_15: "8", day_16: "NCNS", day_17: "8", day_18: "8", day_19: "8", day_20: "6", day_21: "8", day_22: "8", day_23: "0", day_24: "8", day_25: "8", day_26: "8", day_27: "8", day_28: "3", day_29: "8", day_30: "8", day_31: "8", day_32: "NCNS", day_33: "8", day_34: "8", day_35: "8", day_36: "0", day_37: "8", day_38: "8", day_39: "8", day_40: "8", day_41: "5", day_42: "8", day_43: "8", day_44: "8", day_45: "0", day_46: "8", day_47: "8" },
  s3: { day_1: "NCNS", day_2: "NCNS", day_3: "8", day_4: "8", day_5: "8", day_6: "8", day_7: "0", day_8: "8", day_9: "8", day_10: "8", day_11: "8", day_12: "7", day_13: "8", day_14: "8", day_15: "8", day_16: "8", day_17: "0", day_18: "8", day_19: "8", day_20: "8", day_21: "NCNS", day_22: "8", day_23: "8", day_24: "8", day_25: "6", day_26: "8", day_27: "8", day_28: "8", day_29: "8", day_30: "0", day_31: "8", day_32: "8", day_33: "8", day_34: "8", day_35: "8", day_36: "8", day_37: "4", day_38: "8", day_39: "8", day_40: "8", day_41: "8", day_42: "0", day_43: "8", day_44: "8", day_45: "8", day_46: "8", day_47: "8" },
  s4: { day_1: "8", day_2: "8", day_3: "8", day_4: "8", day_5: "8", day_6: "8", day_7: "8", day_8: "8", day_9: "8", day_10: "8", day_11: "8", day_12: "8", day_13: "8", day_14: "8", day_15: "8", day_16: "8", day_17: "8", day_18: "8", day_19: "8", day_20: "8", day_21: "8", day_22: "8", day_23: "8", day_24: "8", day_25: "8", day_26: "8", day_27: "8", day_28: "8", day_29: "8", day_30: "8", day_31: "8", day_32: "8", day_33: "8", day_34: "8", day_35: "8", day_36: "8", day_37: "8", day_38: "8", day_39: "8", day_40: "8", day_41: "8", day_42: "8", day_43: "8", day_44: "8", day_45: "8", day_46: "8", day_47: "8" },
  s5: { day_1: "0", day_2: "0", day_3: "4", day_4: "NCNS", day_5: "8", day_6: "0", day_7: "NCNS", day_8: "8", day_9: "0", day_10: "NCNS", day_11: "0", day_12: "0", day_13: "8", day_14: "0", day_15: "NCNS", day_16: "0", day_17: "0", day_18: "0", day_19: "0", day_20: "0", day_21: "0", day_22: "0", day_23: "0", day_24: "0", day_25: "0", day_26: "0", day_27: "0", day_28: "0", day_29: "0", day_30: "0", day_31: "0", day_32: "0", day_33: "0", day_34: "0", day_35: "0", day_36: "0", day_37: "0", day_38: "0", day_39: "0", day_40: "0", day_41: "0", day_42: "0", day_43: "0", day_44: "0", day_45: "0", day_46: "0", day_47: "0" },
};

export const mockImports = [
  {
    id: "imp1",
    filename: "Q1_2026_Training_Cohort_A.xlsx",
    uploadedAt: "2026-03-01T09:15:00Z",
    uploadedBy: "admin1",
    totalRows: 5,
    validRows: 5,
    errorRows: 0,
    status: "applied",
    mappingId: "map1",
  },
  {
    id: "imp2",
    filename: "Q1_2026_Training_Cohort_B.xlsx",
    uploadedAt: "2026-03-03T14:30:00Z",
    uploadedBy: "admin1",
    totalRows: 12,
    validRows: 10,
    errorRows: 2,
    status: "validated",
    mappingId: null,
  },
  {
    id: "imp3",
    filename: "Nesting_Group_March.xlsx",
    uploadedAt: "2026-03-05T08:00:00Z",
    uploadedBy: "admin1",
    totalRows: 8,
    validRows: 0,
    errorRows: 0,
    status: "processing",
    mappingId: null,
  },
];

export const mockImportPreviewRows = [
  {
    rowNumber: 1,
    data: { source: "Referral", empId: "E1001", language: "Spanish", lastName: "Garcia", firstName: "Maria", status: "Active", ...studentDayData.s1 },
    validation: { status: "valid", errors: [] },
    matchedStudentId: "s1",
    duplicate: false,
  },
  {
    rowNumber: 2,
    data: { source: "Job Board", empId: "E1002", language: "English", lastName: "Chen", firstName: "Wei", status: "Active", ...studentDayData.s2 },
    validation: { status: "valid", errors: [] },
    matchedStudentId: "s2",
    duplicate: false,
  },
  {
    rowNumber: 3,
    data: { source: "Internal", empId: "E1003", language: "English", lastName: "Johnson", firstName: "Alex", status: "On Hold", ...studentDayData.s3 },
    validation: { status: "warning", errors: [{ columnName: "status", message: "Student status is 'On Hold' — attendance may not apply." }] },
    matchedStudentId: "s3",
    duplicate: false,
  },
  {
    rowNumber: 4,
    data: { source: "Partner", empId: "E1004", language: "English", lastName: "Patel", firstName: "Ravi", status: "Completed", ...studentDayData.s4 },
    validation: { status: "valid", errors: [] },
    matchedStudentId: "s4",
    duplicate: false,
  },
  {
    rowNumber: 5,
    data: { source: "Walk-in", empId: "E1005", language: "English", lastName: "Williams", firstName: "Jordan", status: "Dropped", ...studentDayData.s5 },
    validation: { status: "warning", errors: [{ columnName: "status", message: "Student status is 'Dropped'." }] },
    matchedStudentId: "s5",
    duplicate: false,
  },
];

export const mockMappingTemplates = [
  {
    id: "map1",
    name: "Standard Training Template",
    createdAt: "2026-02-15",
    mappings: {
      "Column A": "source",
      "Column B": "empId",
      "Column C": "language",
      "Column D": "lastName",
      "Column E": "firstName",
      "Column F": "status",
      "Column G": "day_1",
      // ... continues for all 47 days
    },
  },
];

// Tiered attendance records (per student, with provenance)
export const mockTieredAttendance = Object.entries(studentDayData).map(([studentId, days]) => ({
  id: `ta-${studentId}`,
  studentId,
  importId: "imp1",
  rowNumber: Object.keys(studentDayData).indexOf(studentId) + 1,
  ...days,
  overrides: {},
}));

// Audit entries
export const mockAuditEntries = [
  {
    id: "aud1",
    entity: "attendance",
    entityId: "ta-s1",
    field: "day_5",
    originalValue: "0",
    newValue: "NCNS",
    changedBy: "trainer1",
    changedByName: "John Smith",
    changedAt: "2026-03-04T10:30:00Z",
    reason: "Student called in — was NCNS not absent.",
  },
  {
    id: "aud2",
    entity: "attendance",
    entityId: "ta-s2",
    field: "day_9",
    originalValue: "8",
    newValue: "4",
    changedBy: "trainer2",
    changedByName: "Sarah Lee",
    changedAt: "2026-03-04T11:15:00Z",
    reason: "Student left early at noon due to appointment.",
  },
];
