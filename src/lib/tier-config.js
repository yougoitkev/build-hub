// Tier definitions matching the client Excel template (Days 1–47)
export const TIER_CONFIG = [
  { id: "pre-process", label: "Pre-Process", days: [1, 2, 3, 4, 5, 6, 7, 8] },
  { id: "tier1a", label: "Tier 1A", days: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
  { id: "tier1a-nesting", label: "Tier 1A Nesting", days: [21, 22, 23, 24, 25] },
  { id: "tier1b", label: "Tier 1B", days: [26, 27, 28, 29, 30, 31] },
  { id: "tier1b-nesting", label: "Tier 1B Nesting", days: [32, 33, 34, 35, 36, 37] },
  { id: "collections", label: "Collections", days: [38] },
  { id: "tier1c-nesting", label: "Tier 1C Nesting", days: [39, 40, 41, 42, 43, 44, 45, 46, 47] },
];

export const TOTAL_DAYS = 47;

// Allowed attendance values
export const ATTENDANCE_VALUES = ["NCNS", "0", "1", "2", "3", "4", "5", "6", "7", "8"];

export function getTierForDay(dayNum) {
  return TIER_CONFIG.find((t) => t.days.includes(dayNum)) || null;
}

// Get days for a given training name
export function getDaysForTraining(trainingName) {
  if (!trainingName || trainingName === "all") {
    return Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1);
  }
  const tier = TIER_CONFIG.find((t) => t.label === trainingName);
  return tier ? tier.days : [];
}

// Compute tier total (sum of numeric hours, NCNS treated as 0)
export function computeTierTotal(dayValues, tierDays) {
  return tierDays.reduce((sum, day) => {
    const val = dayValues[`day_${day}`];
    const num = parseFloat(val);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
}

// Summary calculations for a student's day values (day_1..day_47)
export function computeSummary(dayValues) {
  let totalAbsences = 0;
  let earlyLate = 0;
  let ncnsCount = 0;
  let hoursCompleted = 0;

  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const val = dayValues[`day_${d}`];
    if (val === undefined || val === null || val === "") continue;
    const str = String(val).trim().toUpperCase();

    if (str === "NCNS") {
      ncnsCount++;
    } else {
      const num = parseFloat(str);
      if (!isNaN(num)) {
        if (num === 0) totalAbsences++;
        else if (num > 0 && num < 8) earlyLate++;
        hoursCompleted += num;
      }
    }
  }

  return { totalAbsences, earlyLate, ncnsCount, hoursCompleted };
}

// Validate a single cell value
export function validateCellValue(value) {
  if (value === undefined || value === null || value === "") return { valid: true };
  const str = String(value).trim().toUpperCase();
  if (str === "NCNS") return { valid: true, normalized: "NCNS" };
  const num = parseFloat(str);
  if (isNaN(num)) return { valid: false, error: `Invalid value: "${value}". Expected NCNS or 0–8.` };
  if (num < 0 || num > 8 || !Number.isInteger(num)) return { valid: false, error: `Value must be integer 0–8, got "${value}".` };
  return { valid: true, normalized: String(num) };
}
