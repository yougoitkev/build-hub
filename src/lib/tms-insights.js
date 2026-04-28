import { differenceInCalendarDays, format, isBefore, parseISO, startOfDay } from "date-fns";
import { buildComplianceSummary as buildComplianceSummaryData } from "@/lib/compliance-kpi";
import {
  deriveCertificationStatus,
  deriveObservationPerformanceStatus,
  deriveTrainingProgramStatus,
  deriveUtilizationPerformanceStatus,
  normalizeObservationScore,
} from "@/lib/tms-status";

const toMinutes = (value) => {
  const [hours = "0", minutes = "0"] = String(value || "00:00").split(":");
  return Number(hours) * 60 + Number(minutes);
};

const hasOverlap = (left, right) =>
  toMinutes(left.startTime || left.start_time) < toMinutes(right.endTime || right.end_time) &&
  toMinutes(right.startTime || right.start_time) < toMinutes(left.endTime || left.end_time);

const getStudentIdsForTraining = (training, sessions = [], enrollments = []) => {
  const fromEnrollments = enrollments
    .filter((enrollment) => String(enrollment.trainingId) === String(training.id) && String(enrollment.status) === "enrolled")
    .map((enrollment) => String(enrollment.studentId));

  if (fromEnrollments.length > 0) {
    return [...new Set(fromEnrollments)];
  }

  const fromSessions = sessions
    .filter(
      (session) =>
        String(session.trainingId || session.training_id) === String(training.id) ||
        String(session.scheduledTrainingId || session.scheduled_training_id) === String(training.id),
    )
    .flatMap((session) => (Array.isArray(session.studentIds) ? session.studentIds : []))
    .map((studentId) => String(studentId));

  return [...new Set(fromSessions)];
};

export const buildComplianceSummary = ({
  trainings = [],
  sessions = [],
  students = [],
  enrollments = [],
  complianceRecords = [],
  complianceItems = [],
}) =>
  buildComplianceSummaryData({
    trainings,
    sessions,
    students,
    enrollments,
    complianceRecords,
    complianceItems,
  });

export const detectScheduleConflicts = (sessions = []) => {
  const conflicts = [];

  for (let index = 0; index < sessions.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < sessions.length; nextIndex += 1) {
      const left = sessions[index];
      const right = sessions[nextIndex];

      if (!left?.date || left.date !== right?.date) {
        continue;
      }

      const sameTrainer = String(left.trainerId) && String(left.trainerId) === String(right.trainerId);
      const sameLocation = String(left.location || "").trim() && String(left.location || "").trim() === String(right.location || "").trim();

      if ((sameTrainer || sameLocation) && hasOverlap(left, right)) {
        conflicts.push({
          id: `${left.id}-${right.id}`,
          type: sameTrainer ? "trainer" : "location",
          date: left.date,
          title: sameTrainer ? "Trainer schedule conflict" : "Location conflict",
          detail: sameTrainer
            ? `${left.trainerName || "Trainer"} has overlapping sessions on ${left.date}.`
            : `${left.location} has overlapping sessions on ${left.date}.`,
          sessions: [left, right],
        });
      }
    }
  }

  return conflicts;
};

export const buildTrainerObservationSummaries = (observations = []) => {
  const grouped = observations.reduce((accumulator, observation) => {
    const key = String(observation.trainerId || observation.trainer_id || observation.trainerName || observation.trainer_name || observation.id);
    if (!accumulator[key]) {
      accumulator[key] = {
        trainerId: String(observation.trainerId || observation.trainer_id || ""),
        trainerName: observation.trainerName || observation.trainer_name || "Trainer",
        scores: [],
      };
    }

    const values = Object.values(observation.ratings || {}).map(normalizeObservationScore);
    if (values.length > 0) {
      const average = values.reduce((total, value) => total + value, 0) / values.length;
      accumulator[key].scores.push(average);
    }
    return accumulator;
  }, {});

  return Object.values(grouped).map((entry) => {
    const averageScore = entry.scores.length
      ? Math.round((entry.scores.reduce((total, value) => total + value, 0) / entry.scores.length) * 10) / 10
      : 0;
    return {
      trainerId: entry.trainerId,
      trainerName: entry.trainerName,
      averageScore,
      status: deriveObservationPerformanceStatus(averageScore),
    };
  });
};

export const buildUtilizationSummaries = (utilization = []) =>
  utilization.map((entry) => {
    const utilizationPct = entry.availableHours ? Math.round((entry.billedHours / entry.availableHours) * 100) : 0;
    return {
      trainerId: String(entry.trainerId),
      trainerName: entry.trainerName || "Trainer",
      utilizationPct,
      status: deriveUtilizationPerformanceStatus(utilizationPct),
    };
  });

export const buildOperationalAlerts = ({
  role = "trainer",
  sessions = [],
  trainings = [],
  availability = [],
  certifications = [],
  trainerUtilization = [],
  trainerObservations = [],
  students = [],
  enrollments = [],
  complianceRecords = [],
  complianceItems = [],
  tasks = [],
}) => {
  const alerts = [];
  const scheduleConflicts = detectScheduleConflicts(sessions);
  const complianceSummary = buildComplianceSummary({ trainings, sessions, students, enrollments, complianceRecords, complianceItems });
  const observationSummaries = buildTrainerObservationSummaries(trainerObservations);
  const utilizationSummaries = buildUtilizationSummaries(trainerUtilization);
  const today = startOfDay(new Date());

  scheduleConflicts.forEach((conflict) => {
    alerts.push({
      id: `conflict-${conflict.id}`,
      severity: "critical",
      title: conflict.title,
      detail: conflict.detail,
      link: "/calendar",
    });
  });

  const pendingLeaveCount = availability.filter((record) => String(record.status) === "Pending").length;
  if (pendingLeaveCount > 0 && role !== "trainer") {
    alerts.push({
      id: "pending-leave",
      severity: "warning",
      title: "Pending leave approvals",
      detail: `${pendingLeaveCount} leave request${pendingLeaveCount === 1 ? "" : "s"} waiting for review.`,
      link: "/leave-requests",
    });
  }

  const expiringCertifications = certifications.filter((certification) => {
    const status = deriveCertificationStatus(certification, today);
    return status === "Expired" || status === "Renewal Due";
  });
  if (expiringCertifications.length > 0) {
    alerts.push({
      id: "certifications",
      severity: expiringCertifications.some((certification) => deriveCertificationStatus(certification, today) === "Expired") ? "critical" : "warning",
      title: "Certification action required",
      detail: `${expiringCertifications.length} certification${expiringCertifications.length === 1 ? "" : "s"} expired or due for renewal.`,
      link: "/certifications",
    });
  }

  const lowUtilization = utilizationSummaries.filter((entry) => entry.status !== "On Track");
  if (lowUtilization.length > 0 && role !== "trainer") {
    alerts.push({
      id: "utilization",
      severity: lowUtilization.some((entry) => entry.status === "Below Target") ? "critical" : "warning",
      title: "Utilization below target",
      detail: `${lowUtilization.length} trainer${lowUtilization.length === 1 ? "" : "s"} below the 80% utilization target.`,
      link: "/trainer-utilization",
    });
  }

  const belowTargetObservations = observationSummaries.filter((entry) => entry.status !== "On Track");
  if (belowTargetObservations.length > 0 && role !== "trainer") {
    alerts.push({
      id: "observations",
      severity: belowTargetObservations.some((entry) => entry.status === "Below Target") ? "critical" : "warning",
      title: "Observation scores need attention",
      detail: `${belowTargetObservations.length} trainer${belowTargetObservations.length === 1 ? "" : "s"} below the 80% observation threshold.`,
      link: "/trainer-observations",
    });
  }

  if (complianceSummary.atRiskCount > 0 && role !== "trainer") {
    alerts.push({
      id: "compliance",
      severity: "critical",
      title: "Compliance coverage risk",
      detail: `${complianceSummary.atRiskCount} cohort${complianceSummary.atRiskCount === 1 ? "" : "s"} do not meet the current readiness/compliance coverage rule.`,
      link: "/compliance",
    });
  }

  const blockedTasks = tasks.filter((task) => String(task.status) === "Blocked");
  if (blockedTasks.length > 0) {
    alerts.push({
      id: "tasks",
      severity: "warning",
      title: "Blocked tasks require follow-up",
      detail: `${blockedTasks.length} blocked operational task${blockedTasks.length === 1 ? "" : "s"} currently need action.`,
      link: "/tasks",
    });
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((left, right) => (severityOrder[left.severity] ?? 9) - (severityOrder[right.severity] ?? 9));

  return {
    alerts,
    complianceSummary,
    scheduleConflictCount: scheduleConflicts.length,
    pendingLeaveCount,
    expiringCertificationCount: expiringCertifications.length,
    lowUtilizationCount: lowUtilization.length,
    observationRiskCount: belowTargetObservations.length,
  };
};

export const buildRecentActivityFeed = ({ adminLogs = [], notifications = [] }) => {
  if (adminLogs.length > 0) {
    return adminLogs.slice(0, 6).map((entry) => ({
      id: entry.id,
      title: entry.action,
      detail: entry.payloadSummary || entry.entityId || "Activity recorded",
      when: entry.timestamp ? format(parseISO(entry.timestamp), "MMM d, h:mm a") : "",
    }));
  }

  return notifications.slice(0, 6).map((entry) => ({
    id: entry.id,
    title: entry.read ? "Notification" : "New notification",
    detail: entry.message,
    when: entry.date || "",
  }));
};

export const buildProgramPipeline = (trainings = []) =>
  trainings.reduce(
    (accumulator, training) => {
      const status = deriveTrainingProgramStatus(training);
      if (status === "Completed") accumulator.completed += 1;
      else if (status === "Ongoing") accumulator.ongoing += 1;
      else accumulator.upcoming += 1;
      return accumulator;
    },
    { completed: 0, ongoing: 0, upcoming: 0 },
  );
