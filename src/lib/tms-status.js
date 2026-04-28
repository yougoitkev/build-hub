import { differenceInCalendarDays, isAfter, isBefore, isSameDay, parseISO, startOfDay } from "date-fns";

const TONE_CLASS_MAP = {
  positive: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  critical: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  info: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  neutral: "bg-muted text-muted-foreground border-border",
  accent: "bg-violet-500/10 text-violet-700 border-violet-500/20",
};

const STATUS_DOMAINS = {
  trainingProgram: {
    Draft: { tone: "neutral" },
    Upcoming: { tone: "info" },
    Ongoing: { tone: "warning" },
    Completed: { tone: "positive" },
    Delayed: { tone: "critical" },
    Cancelled: { tone: "critical" },
  },
  session: {
    Scheduled: { tone: "info" },
    "In Progress": { tone: "warning" },
    Completed: { tone: "positive" },
    Missed: { tone: "critical" },
    Cancelled: { tone: "critical" },
  },
  learnerLevel: {
    "Not Started": { tone: "neutral" },
    "In Progress": { tone: "warning" },
    Complete: { tone: "positive" },
  },
  learner: {
    Active: { tone: "info" },
    "On Hold": { tone: "warning" },
    Completed: { tone: "positive" },
    Dropped: { tone: "critical" },
    "Ready for Transition": { tone: "accent" },
  },
  compliance: {
    "Not Tracked": { tone: "neutral" },
    "In Progress": { tone: "warning" },
    Complete: { tone: "positive" },
    "At Risk": { tone: "critical" },
    "Audit Failure": { tone: "critical" },
  },
  leave: {
    Pending: { tone: "warning" },
    Approved: { tone: "positive" },
    Rejected: { tone: "critical" },
  },
  attendance: {
    Present: { tone: "positive" },
    Absent: { tone: "critical" },
    Excused: { tone: "warning" },
    Late: { tone: "warning" },
    Leave: { tone: "warning" },
    Holiday: { tone: "neutral" },
  },
  observation: {
    Draft: { tone: "neutral" },
    Pending: { tone: "warning" },
    Completed: { tone: "positive" },
    "Below Target": { tone: "critical" },
  },
  task: {
    New: { tone: "neutral" },
    "In Progress": { tone: "info" },
    Blocked: { tone: "critical" },
    Done: { tone: "positive" },
  },
  certification: {
    Active: { tone: "positive" },
    "Renewal Due": { tone: "warning" },
    Expired: { tone: "critical" },
  },
  import: {
    pending: { tone: "neutral" },
    processing: { tone: "info" },
    validated: { tone: "accent" },
    completed: { tone: "positive" },
    failed: { tone: "critical" },
    valid: { tone: "positive" },
    warning: { tone: "warning" },
    error: { tone: "critical" },
  },
  performance: {
    "On Track": { tone: "positive" },
    "Needs Attention": { tone: "warning" },
    "Below Target": { tone: "critical" },
  },
  trainer: {
    Active: { tone: "positive" },
    "On Leave": { tone: "warning" },
    Inactive: { tone: "neutral" },
  },
};

const STATUS_ALIASES = {
  trainingProgram: {
    complete: "Completed",
    completed: "Completed",
    ongoing: "Ongoing",
    upcoming: "Upcoming",
  },
  session: {
    scheduled: "Scheduled",
    complete: "Completed",
    completed: "Completed",
    ongoing: "In Progress",
    "in progress": "In Progress",
  },
  learnerLevel: {
    completed: "Complete",
    complete: "Complete",
    "in progress": "In Progress",
    "not started": "Not Started",
  },
  learner: {
    completed: "Completed",
    active: "Active",
    dropped: "Dropped",
    "on hold": "On Hold",
  },
  leave: {
    approved: "Approved",
    pending: "Pending",
    rejected: "Rejected",
  },
  attendance: {
    present: "Present",
    absent: "Absent",
    excused: "Excused",
    late: "Late",
    leave: "Leave",
    holiday: "Holiday",
  },
  observation: {
    draft: "Draft",
    pending: "Pending",
    complete: "Completed",
    completed: "Completed",
    "below target": "Below Target",
  },
  task: {
    new: "New",
    "in progress": "In Progress",
    blocked: "Blocked",
    done: "Done",
    completed: "Done",
  },
  certification: {
    active: "Active",
    expired: "Expired",
    "renewal due": "Renewal Due",
  },
  performance: {
    "on track": "On Track",
    warning: "Needs Attention",
    "needs attention": "Needs Attention",
    "below target": "Below Target",
  },
};

const normalizeLookupValue = (value) => String(value || "").trim().toLowerCase();

const resolveStatus = (domain, value) => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return null;

  if (STATUS_DOMAINS[domain]?.[rawValue]) {
    return rawValue;
  }

  const lookup = normalizeLookupValue(rawValue);
  const alias = STATUS_ALIASES[domain]?.[lookup];
  if (alias) {
    return alias;
  }

  const matchedEntry = Object.keys(STATUS_DOMAINS[domain] || {}).find(
    (key) => normalizeLookupValue(key) === lookup,
  );
  return matchedEntry || rawValue;
};

const detectDomain = (status) => {
  const lookup = normalizeLookupValue(status);
  return Object.keys(STATUS_DOMAINS).find((domain) =>
    Object.keys(STATUS_DOMAINS[domain]).some((key) => normalizeLookupValue(key) === lookup),
  );
};

export const getStatusMeta = (status, domain) => {
  const resolvedDomain = domain || detectDomain(status);
  const resolvedStatus = resolvedDomain ? resolveStatus(resolvedDomain, status) : status;
  const meta = STATUS_DOMAINS[resolvedDomain]?.[resolvedStatus];

  if (meta) {
    return {
      domain: resolvedDomain,
      status: resolvedStatus,
      tone: meta.tone,
      classes: TONE_CLASS_MAP[meta.tone] || TONE_CLASS_MAP.neutral,
    };
  }

  return {
    domain: resolvedDomain || "generic",
    status: resolvedStatus || String(status || ""),
    tone: "neutral",
    classes: TONE_CLASS_MAP.neutral,
  };
};

export const getStatusBadgeClasses = (status, domain) => getStatusMeta(status, domain).classes;

const toDateOnly = (value) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : parseISO(String(value));
  if (Number.isNaN(parsed?.getTime?.())) return null;
  return startOfDay(parsed);
};

export const deriveTrainingProgramStatus = (training, today = new Date()) => {
  const explicitStatus = resolveStatus("trainingProgram", training?.status);
  if (explicitStatus === "Completed" || explicitStatus === "Cancelled" || explicitStatus === "Draft" || explicitStatus === "Delayed") {
    return explicitStatus;
  }

  const startDate = toDateOnly(training?.startDate || training?.start_date);
  const endDate = toDateOnly(training?.endDate || training?.end_date);
  const comparisonDate = startOfDay(today);

  if (endDate && isBefore(endDate, comparisonDate)) return "Completed";
  if (startDate && isAfter(startDate, comparisonDate)) return "Upcoming";
  if (startDate && endDate && (isSameDay(startDate, comparisonDate) || isSameDay(endDate, comparisonDate) || (isBefore(startDate, comparisonDate) && isAfter(endDate, comparisonDate)))) {
    return "Ongoing";
  }

  return explicitStatus || "Upcoming";
};

export const deriveSessionStatus = (session, today = new Date()) => {
  const explicitStatus = resolveStatus("session", session?.status);
  if (explicitStatus === "Completed" || explicitStatus === "Cancelled" || explicitStatus === "Missed") {
    return explicitStatus;
  }

  const sessionDate = toDateOnly(session?.date || session?.session_date);
  const comparisonDate = startOfDay(today);

  if (sessionDate && isBefore(sessionDate, comparisonDate)) return "Completed";
  if (sessionDate && isSameDay(sessionDate, comparisonDate)) return "In Progress";
  if (sessionDate && isAfter(sessionDate, comparisonDate)) return "Scheduled";

  return explicitStatus || "Scheduled";
};

export const deriveLearnerLifecycleStatus = (student) => {
  const explicitStatus = resolveStatus("learner", student?.status);
  if (explicitStatus && explicitStatus !== "Active") {
    return explicitStatus;
  }

  const levels = [student?.level1, student?.level2, student?.level3];
  if (levels.every((level) => resolveStatus("learnerLevel", level) === "Complete")) {
    return "Completed";
  }
  if (levels.some((level) => resolveStatus("learnerLevel", level) === "Complete")) {
    return "Ready for Transition";
  }

  return explicitStatus || "Active";
};

export const deriveLearnerCompletion = (student) => {
  const levels = [student?.level1, student?.level2, student?.level3].map((level) => resolveStatus("learnerLevel", level));
  const completedCount = levels.filter((level) => level === "Complete").length;
  const inProgressCount = levels.filter((level) => level === "In Progress").length;
  const completionPct = Math.round((completedCount / 3) * 100);

  return {
    status: deriveLearnerLifecycleStatus(student),
    completionPct,
    completedCount,
    inProgressCount,
  };
};

export const deriveCertificationStatus = (certification, today = new Date()) => {
  const explicitStatus = resolveStatus("certification", certification?.status);
  const expiryDate = toDateOnly(certification?.expiryDate || certification?.expiry_date);
  const comparisonDate = startOfDay(today);

  if (!expiryDate) return explicitStatus || "Active";

  if (isBefore(expiryDate, comparisonDate)) return "Expired";
  if (differenceInCalendarDays(expiryDate, comparisonDate) <= 30) return "Renewal Due";
  return explicitStatus || "Active";
};

export const normalizeObservationScore = (score) => {
  const numericScore = Number(score || 0);
  if (!Number.isFinite(numericScore)) return 0;
  if (numericScore > 5) {
    return Math.round((numericScore / 2) * 10) / 10;
  }
  return Math.max(0, Math.min(5, numericScore));
};

export const deriveObservationPerformanceStatus = (averageScore) => {
  const normalizedScore = normalizeObservationScore(averageScore);
  if (normalizedScore >= 4) return "On Track";
  if (normalizedScore >= 3) return "Needs Attention";
  return "Below Target";
};

export const deriveUtilizationPerformanceStatus = (utilizationPct) => {
  const value = Number(utilizationPct || 0);
  if (value >= 80) return "On Track";
  if (value >= 60) return "Needs Attention";
  return "Below Target";
};

export const deriveComplianceStatus = ({ compliantCount = 0, requiredCount = 0, tracked = false }) => {
  if (!tracked) return "Not Tracked";
  if (!requiredCount) return "Complete";
  if (compliantCount >= requiredCount) return "Complete";
  if (compliantCount === 0) return "Audit Failure";
  return "At Risk";
};

