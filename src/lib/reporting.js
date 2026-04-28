import { format, getISOWeek, parseISO, startOfMonth } from "date-fns";
import {
  buildTrainerObservationSummaries,
  buildUtilizationSummaries,
} from "@/lib/tms-insights";
import {
  buildComplianceSummary,
  buildTrainerKpiRows as buildTrainerKpiRowsData,
} from "@/lib/compliance-kpi";
import {
  deriveLearnerCompletion,
  deriveObservationPerformanceStatus,
  deriveTrainingProgramStatus,
  deriveUtilizationPerformanceStatus,
} from "@/lib/tms-status";

const toId = (value) => (value === undefined || value === null ? "" : String(value));

const average = (values = []) => {
  const numeric = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!numeric.length) {
    return 0;
  }

  return numeric.reduce((total, value) => total + value, 0) / numeric.length;
};

const getStudentIdsForTraining = (training, sessions = [], enrollments = []) => {
  const trainingId = toId(training?.id);

  const fromEnrollments = enrollments
    .filter((entry) => toId(entry.trainingId || entry.training_id) === trainingId && String(entry.status || "").toLowerCase() === "enrolled")
    .map((entry) => toId(entry.studentId || entry.student_id));

  if (fromEnrollments.length > 0) {
    return [...new Set(fromEnrollments)];
  }

  const fromSessions = sessions
    .filter(
      (session) =>
        toId(session.trainingId || session.training_id) === trainingId ||
        toId(session.scheduledTrainingId || session.scheduled_training_id) === trainingId,
    )
    .flatMap((session) => (Array.isArray(session.studentIds) ? session.studentIds : session.student_ids || []))
    .map(toId);

  return [...new Set(fromSessions)];
};

const normalizeTrainerName = (trainer) =>
  trainer?.name ||
  trainer?.trainerName ||
  trainer?.full_name ||
  `${trainer?.first_name || trainer?.firstName || ""} ${trainer?.last_name || trainer?.lastName || ""}`.trim() ||
  "Trainer";

const normalizeMonth = (value) => {
  if (!value) {
    return "Unscheduled";
  }

  try {
    return format(startOfMonth(parseISO(value)), "MMM yyyy");
  } catch {
    return "Unscheduled";
  }
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const downloadRowsAsCsv = (rows, filename) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return false;
  }

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escapeCell = (value) => {
    const text = value === undefined || value === null ? "" : String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ].join("\n");

  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
  return true;
};

export const buildComplianceRows = ({
  trainings = [],
  sessions = [],
  students = [],
  enrollments = [],
  trainers = [],
  complianceRecords = [],
  complianceItems = [],
}) => {
  const summary = buildComplianceSummary({ trainings, sessions, students, enrollments, complianceRecords, complianceItems });
  const trainerMap = new Map(trainers.map((trainer) => [toId(trainer.id), normalizeTrainerName(trainer)]));
  const trainingMap = new Map(trainings.map((training) => [toId(training.id), training]));

  return summary.cohorts.map((cohort) => {
    const training = trainingMap.get(toId(cohort.id));
    return {
      cohort: cohort.title,
      trainer: trainerMap.get(toId(training?.trainerId || training?.trainer_id)) || "Unassigned",
      month: normalizeMonth(training?.startDate || training?.start_date),
      compliantLearners: cohort.compliantCount,
      requiredLearners: cohort.requiredCount,
      startedLearners: cohort.startedCount,
      transitionedLearners: cohort.transitionedCount,
      shortfallCount: cohort.shortfallCount,
      coveragePct: cohort.coveragePct,
      status: cohort.status,
      startDate: training?.startDate || training?.start_date || "",
      endDate: training?.endDate || training?.end_date || "",
    };
  });
};

export const buildTransitionRows = ({
  trainings = [],
  sessions = [],
  students = [],
  enrollments = [],
  trainers = [],
  complianceRecords = [],
  complianceItems = [],
}) => {
  const studentMap = new Map(students.map((student) => [toId(student.id), student]));
  const trainerMap = new Map(trainers.map((trainer) => [toId(trainer.id), normalizeTrainerName(trainer)]));
  const complianceMap = new Map(
    buildComplianceRows({ trainings, sessions, students, enrollments, trainers, complianceRecords, complianceItems }).map((row) => [row.cohort, row]),
  );

  return trainings.map((training) => {
    const learnerIds = getStudentIdsForTraining(training, sessions, enrollments);
    const learnerRecords = learnerIds.map((studentId) => studentMap.get(studentId)).filter(Boolean);
    const learnerStates = learnerRecords.map((student) => deriveLearnerCompletion(student));
    const completedCount = learnerStates.filter((entry) => entry.status === "Completed").length;
    const readyCount = learnerStates.filter((entry) => entry.status === "Ready for Transition" || entry.status === "Completed").length;
    const attritionCount = learnerRecords.filter((student) => {
      const status = String(student.status || "").toLowerCase();
      return status === "dropped" || status === "leave" || status === "on hold";
    }).length;
    const startedCount = learnerRecords.length;
    const status = deriveTrainingProgramStatus(training);
    const compliance = complianceMap.get(training.title);

    return {
      month: normalizeMonth(training.startDate || training.start_date),
      cohort: training.title || "Program",
      trainer: trainerMap.get(toId(training.trainerId || training.trainer_id)) || "Unassigned",
      started: startedCount,
      readyForTransition: readyCount,
      completed: completedCount,
      attrition: attritionCount,
      throughputPct: startedCount ? Math.round((completedCount / startedCount) * 100) : 0,
      compliancePct: compliance?.coveragePct ?? 0,
      status,
      startDate: training.startDate || training.start_date || "",
      endDate: training.endDate || training.end_date || "",
    };
  });
};

export const buildTrainerScorecardRows = ({
  trainers = [],
  trainings = [],
  sessions = [],
  students = [],
  enrollments = [],
  trainerUtilization = [],
  trainerObservations = [],
  observations = [],
  feedback = [],
  complianceRecords = [],
  complianceItems = [],
  kpiManualEntries = [],
  kpiTargets = [],
  fromDate,
  toDate,
}) =>
  buildTrainerKpiRowsData({
    trainers,
    trainings,
    sessions,
    students,
    enrollments,
    trainerUtilization,
    trainerObservations,
    observations,
    feedback,
    complianceRecords,
    complianceItems,
    kpiManualEntries,
    kpiTargets,
    fromDate,
    toDate,
  }).map((row) => ({
    trainer: row.trainer,
    trainerId: row.trainerId,
    activePrograms: row.activePrograms,
    completedPrograms: trainings.filter((program) => toId(program.trainerId || program.trainer_id) === row.trainerId && deriveTrainingProgramStatus(program) === "Completed").length,
    learnersTracked: row.learnersTracked,
    utilizationPct: row.utilizationPct ?? 0,
    utilizationStatus: row.utilizationPct === null ? "Pending Input" : deriveUtilizationPerformanceStatus(row.utilizationPct),
    observationScore: row.observationScore ?? 0,
    observationStatus: row.observationScore === null ? "Pending Input" : deriveObservationPerformanceStatus((row.observationScore / 100) * 5),
    compliancePct: row.compliancePct ?? 0,
    throughputPct: row.throughputPct ?? 0,
    attritionPct: row.attritionPct ?? 0,
    knowledgeRetentionScore: row.knowledgeRetentionScore,
    qualityScore: row.qualityScore,
    satisfactionPct: row.satisfactionPct,
    overallScore: row.overallScore,
    belowTargetMetrics: row.belowTargetMetrics,
    pendingMetrics: row.pendingMetrics,
    metricDetails: row.metricDetails,
    manualEntries: row.manualEntries,
  }));

export const buildRoomUsageRows = ({ sessions = [], trainings = [] }) => {
  const trainingMap = new Map(trainings.map((training) => [toId(training.id), training]));
  const grouped = sessions.reduce((accumulator, session) => {
    const room = session.location || "TBD";
    const current = accumulator.get(room) || [];
    current.push(session);
    accumulator.set(room, current);
    return accumulator;
  }, new Map());

  return [...grouped.entries()].map(([room, roomSessions]) => {
    const uniqueDates = new Set(roomSessions.map((session) => session.date)).size;
    const cohorts = new Set(
      roomSessions.map((session) => {
        const trainingId = toId(session.trainingId || session.training_id || session.scheduledTrainingId || session.scheduled_training_id);
        return trainingMap.get(trainingId)?.title || session.title || trainingId;
      }),
    ).size;
    return {
      room,
      sessions: roomSessions.length,
      activeDates: uniqueDates,
      cohorts,
      nextSession: [...roomSessions]
        .filter((session) => session.date)
        .sort((left, right) => `${left.date} ${left.startTime || ""}`.localeCompare(`${right.date} ${right.startTime || ""}`))[0]?.date || "",
    };
  });
};

export const buildWeeklyAbsenceRows = ({ trainerAttendance = [], trainers = [], availability = [] }) => {
  const trainerMap = new Map(trainers.map((trainer) => [toId(trainer.id), normalizeTrainerName(trainer)]));
  const grouped = new Map();

  trainerAttendance.forEach((record) => {
    if (!record.date) {
      return;
    }
    const week = `${format(parseISO(record.date), "yyyy")}-W${String(getISOWeek(parseISO(record.date))).padStart(2, "0")}`;
    const key = `${toId(record.trainerId)}:${week}`;
    const entry = grouped.get(key) || {
      trainer: trainerMap.get(toId(record.trainerId)) || record.trainerName || "Trainer",
      week,
      absentDays: 0,
      scheduledDays: 0,
      leaveRecords: 0,
    };
    entry.scheduledDays += 1;
    if (["Absent", "Leave"].includes(String(record.status || ""))) {
      entry.absentDays += 1;
    }
    grouped.set(key, entry);
  });

  availability.forEach((record) => {
    if (!record.startDate) {
      return;
    }
    const week = `${format(parseISO(record.startDate), "yyyy")}-W${String(getISOWeek(parseISO(record.startDate))).padStart(2, "0")}`;
    const key = `${toId(record.trainerId)}:${week}`;
    const entry = grouped.get(key) || {
      trainer: trainerMap.get(toId(record.trainerId)) || "Trainer",
      week,
      absentDays: 0,
      scheduledDays: 0,
      leaveRecords: 0,
    };
    entry.leaveRecords += 1;
    grouped.set(key, entry);
  });

  return [...grouped.values()]
    .map((entry) => ({
      ...entry,
      absencePct: entry.scheduledDays ? Math.round((entry.absentDays / entry.scheduledDays) * 100) : 0,
    }))
    .sort((left, right) => `${right.week}-${right.trainer}`.localeCompare(`${left.week}-${left.trainer}`));
};
