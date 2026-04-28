import {
  deriveComplianceStatus,
  deriveLearnerCompletion,
  deriveObservationPerformanceStatus,
  deriveUtilizationPerformanceStatus,
} from "@/lib/tms-status";

const toId = (value) => (value === undefined || value === null ? "" : String(value));

const average = (values = []) => {
  const numeric = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!numeric.length) {
    return null;
  }

  return numeric.reduce((total, value) => total + value, 0) / numeric.length;
};

const round = (value) => (Number.isFinite(value) ? Math.round(value) : 0);

const inDateRange = (value, fromDate, toDate) => {
  if (!value) {
    return !fromDate && !toDate;
  }

  if (fromDate && value < fromDate) {
    return false;
  }

  if (toDate && value > toDate) {
    return false;
  }

  return true;
};

const normalizeTrainerName = (trainer) =>
  trainer?.name ||
  trainer?.trainerName ||
  trainer?.full_name ||
  `${trainer?.first_name || trainer?.firstName || ""} ${trainer?.last_name || trainer?.lastName || ""}`.trim() ||
  "Trainer";

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

const fallbackComplianceReady = (student) => {
  const explicitStatus = String(student?.complianceStatus || "").trim().toLowerCase();
  if (explicitStatus) {
    return explicitStatus === "complete" || explicitStatus === "completed" || explicitStatus === "approved";
  }

  if (student?.complianceComplete === true || student?.complianceCompleted === true) {
    return true;
  }

  return [student?.level1, student?.level2, student?.level3].some((level) => String(level || "").toLowerCase() === "complete");
};

const getRequiredComplianceItems = (complianceItems = []) =>
  complianceItems.filter((item) => item?.active !== false && item?.requiredBeforeCalls !== false);

const getLatestManualMetricAverage = ({ entries = [], trainerId = "", trainingId = "", metricKey, fromDate, toDate }) => {
  const scoped = entries.filter((entry) => {
    if (entry.metricKey !== metricKey) {
      return false;
    }

    if (trainerId && toId(entry.trainerId) !== trainerId) {
      return false;
    }

    if (trainingId && toId(entry.trainingId) !== trainingId) {
      return false;
    }

    return inDateRange(entry.effectiveDate || entry.updatedAt?.slice(0, 10), fromDate, toDate);
  });

  return average(scoped.map((entry) => Number(entry.value)));
};

const getManualMetricValue = ({ entries = [], trainerId = "", trainingId = "", metricKey, fromDate, toDate }) => {
  const result = getLatestManualMetricAverage({
    entries,
    trainerId,
    trainingId,
    metricKey,
    fromDate,
    toDate,
  });

  return result === null ? null : round(result);
};

const getLatestManualMetricEntries = ({ entries = [], trainerId = "", trainingId = "", fromDate, toDate }) =>
  entries
    .filter((entry) => {
      if (trainerId && toId(entry.trainerId) !== trainerId) {
        return false;
      }

      if (trainingId && toId(entry.trainingId) !== trainingId) {
        return false;
      }

      return inDateRange(entry.effectiveDate || entry.updatedAt?.slice(0, 10), fromDate, toDate);
    })
    .sort((left, right) => `${right.effectiveDate || right.updatedAt}`.localeCompare(`${left.effectiveDate || left.updatedAt}`));

const buildComplianceRecordMap = (complianceRecords = []) => {
  const map = new Map();

  complianceRecords.forEach((record) => {
    const key = [toId(record.trainingId), toId(record.learnerId || record.studentId), toId(record.itemId)].join(":");
    const existing = map.get(key);
    if (!existing || `${record.updatedAt || ""}` > `${existing.updatedAt || ""}`) {
      map.set(key, record);
    }
  });

  return map;
};

const buildLearnerComplianceState = ({
  trainingId,
  learner,
  requiredItems,
  complianceRecordMap,
}) => {
  const learnerId = toId(learner?.id);
  const itemStates = requiredItems.map((item) => {
    const record = complianceRecordMap.get([trainingId, learnerId, toId(item.id)].join(":"));
    return {
      itemId: toId(item.id),
      itemName: item.name,
      category: item.category,
      status: record?.status || "Not Started",
      completedAt: record?.completedAt || "",
      notes: record?.notes || "",
      updatedAt: record?.updatedAt || "",
      updatedBy: record?.updatedBy || "",
      source: record?.source || "",
    };
  });

  const usesManualRecords = itemStates.some((item) => item.source);
  const completedItems = itemStates.filter((item) => ["Completed", "Waived"].includes(String(item.status))).length;
  const completionPct = requiredItems.length ? round((completedItems / requiredItems.length) * 100) : 0;
  const lastCompletedAt = itemStates
    .map((item) => item.completedAt)
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0] || "";
  const lastUpdatedAt = itemStates
    .map((item) => item.updatedAt)
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0] || "";
  const fallbackReady = fallbackComplianceReady(learner);
  const isCompliant = usesManualRecords
    ? requiredItems.length > 0 && completedItems >= requiredItems.length
    : fallbackReady;

  return {
    learnerId,
    learnerName: `${learner?.firstName || ""} ${learner?.lastName || ""}`.trim() || learner?.name || "Learner",
    lifecycle: deriveLearnerCompletion(learner),
    itemStates,
    completedItems,
    requiredItems: requiredItems.length,
    completionPct,
    lastCompletedAt,
    lastUpdatedAt,
    usesManualRecords,
    isCompliant,
    status: isCompliant ? "Complete" : usesManualRecords && completedItems > 0 ? "In Progress" : "Not Started",
  };
};

export const buildComplianceSummary = ({
  trainings = [],
  sessions = [],
  students = [],
  enrollments = [],
  complianceRecords = [],
  complianceItems = [],
}) => {
  const studentMap = new Map(students.map((student) => [toId(student.id), student]));
  const complianceRecordMap = buildComplianceRecordMap(complianceRecords);
  const requiredItems = getRequiredComplianceItems(complianceItems);
  const tracked =
    trainings.length > 0 ||
    complianceRecords.length > 0 ||
    students.some((student) => student?.complianceStatus || student?.complianceComplete !== undefined || student?.complianceCompleted !== undefined);

  const cohorts = trainings
    .map((training) => {
      const learnerIds = getStudentIdsForTraining(training, sessions, enrollments);
      const learners = learnerIds
        .map((learnerId) => studentMap.get(learnerId))
        .filter(Boolean)
        .map((learner) =>
          buildLearnerComplianceState({
            trainingId: toId(training.id),
            learner,
            requiredItems,
            complianceRecordMap,
          }),
        );

      if (!learners.length) {
        return null;
      }

      const compliantCount = learners.filter((learner) => learner.isCompliant).length;
      const startedCount = learners.length;
      const transitionedCount = learners.filter((learner) => ["Ready for Transition", "Completed"].includes(learner.lifecycle.status)).length;
      const shortfallCount = Math.max(0, transitionedCount - compliantCount);
      const status = deriveComplianceStatus({
        compliantCount,
        requiredCount: startedCount,
        transitionedCount,
        tracked,
      });

      return {
        id: toId(training.id),
        title: training.title || "Program",
        trainerId: toId(training.trainerId || training.trainer_id),
        trainerName: training.trainerName || "",
        startDate: training.startDate || training.start_date || "",
        endDate: training.endDate || training.end_date || "",
        status,
        compliantCount,
        startedCount,
        requiredCount: startedCount,
        transitionedCount,
        shortfallCount,
        coveragePct: startedCount ? round((compliantCount / startedCount) * 100) : 0,
        learners,
        usesManualRecords: learners.some((learner) => learner.usesManualRecords),
      };
    })
    .filter(Boolean);

  const compliantCount = cohorts.reduce((total, cohort) => total + cohort.compliantCount, 0);
  const requiredCount = cohorts.reduce((total, cohort) => total + cohort.requiredCount, 0);
  const transitionedCount = cohorts.reduce((total, cohort) => total + cohort.transitionedCount, 0);
  const shortfallCount = cohorts.reduce((total, cohort) => total + cohort.shortfallCount, 0);
  const status = deriveComplianceStatus({ compliantCount, requiredCount, transitionedCount, tracked });

  return {
    tracked,
    status,
    compliantCount,
    requiredCount,
    transitionedCount,
    shortfallCount,
    coveragePct: requiredCount ? round((compliantCount / requiredCount) * 100) : 0,
    atRiskCount: cohorts.filter((cohort) => cohort.status !== "Complete").length,
    cohorts,
    requiredItems,
  };
};

export const buildComplianceTrainerRows = ({
  trainers = [],
  trainings = [],
  sessions = [],
  students = [],
  enrollments = [],
  complianceRecords = [],
  complianceItems = [],
}) => {
  const trainerNameMap = new Map(trainers.map((trainer) => [toId(trainer.id), normalizeTrainerName(trainer)]));
  const complianceSummary = buildComplianceSummary({
    trainings,
    sessions,
    students,
    enrollments,
    complianceRecords,
    complianceItems,
  });
  const grouped = complianceSummary.cohorts.reduce((accumulator, cohort) => {
    const trainerId = toId(cohort.trainerId);
    const current = accumulator.get(trainerId) || {
      trainerId,
      trainer: trainerNameMap.get(trainerId) || cohort.trainerName || "Unassigned",
      cohorts: 0,
      startedCount: 0,
      transitionedCount: 0,
      compliantCount: 0,
      shortfallCount: 0,
    };

    current.cohorts += 1;
    current.startedCount += cohort.startedCount;
    current.transitionedCount += cohort.transitionedCount;
    current.compliantCount += cohort.compliantCount;
    current.shortfallCount += cohort.shortfallCount;
    accumulator.set(trainerId, current);
    return accumulator;
  }, new Map());

  return [...grouped.values()].map((entry) => ({
    ...entry,
    coveragePct: entry.startedCount ? round((entry.compliantCount / entry.startedCount) * 100) : 0,
    status: deriveComplianceStatus({
      compliantCount: entry.compliantCount,
      requiredCount: entry.startedCount,
      transitionedCount: entry.transitionedCount,
      tracked: true,
    }),
  }));
};

export const buildComplianceLearnerRows = ({
  trainingId,
  trainings = [],
  sessions = [],
  students = [],
  enrollments = [],
  complianceRecords = [],
  complianceItems = [],
}) => {
  const summary = buildComplianceSummary({
    trainings,
    sessions,
    students,
    enrollments,
    complianceRecords,
    complianceItems,
  });

  return summary.cohorts.find((cohort) => toId(cohort.id) === toId(trainingId))?.learners || [];
};

const getMetricCatalog = (kpiTargets = []) => {
  const fallback = {
    utilizationPct: { label: "Utilization", direction: "min", targetValue: 80, weight: 1.2 },
    compliancePct: { label: "Compliance Completion", direction: "min", targetValue: 100, weight: 1.4 },
    knowledgeRetentionScore: { label: "Knowledge Retention", direction: "min", targetValue: 85, weight: 1.1 },
    observationScore: { label: "Observation Score", direction: "min", targetValue: 80, weight: 1.1 },
    throughputPct: { label: "Throughput", direction: "min", targetValue: 85, weight: 1.1 },
    attritionPct: { label: "Attrition", direction: "max", targetValue: 10, weight: 1 },
    qualityScore: { label: "Nesting / Quality", direction: "min", targetValue: 88, weight: 1.1 },
    satisfactionPct: { label: "Trainer Satisfaction", direction: "min", targetValue: 85, weight: 0.9 },
  };

  const catalog = new Map(Object.entries(fallback));
  kpiTargets.forEach((target) => {
    catalog.set(target.metricKey, {
      ...fallback[target.metricKey],
      ...target,
    });
  });

  return catalog;
};

const evaluateMetricStatus = (metric, value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "Pending Input";
  }

  const numericValue = Number(value);
  const targetValue = Number(metric.targetValue);

  if (metric.direction === "max") {
    if (numericValue <= targetValue) {
      return "On Track";
    }
    if (numericValue <= targetValue + 5) {
      return "Needs Attention";
    }
    return "Below Target";
  }

  if (numericValue >= targetValue) {
    return "On Track";
  }
  if (numericValue >= targetValue - 10) {
    return "Needs Attention";
  }
  return "Below Target";
};

const toOverallContribution = (metric, value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return null;
  }

  const numericValue = Number(value);
  if (metric.direction === "max") {
    return Math.max(0, 100 - numericValue);
  }
  return numericValue;
};

const buildKpiMetricDetails = ({
  metrics,
  metricCatalog,
}) =>
  metrics.map((metric) => {
    const config = metricCatalog.get(metric.key);
    const numericValue = metric.value === null || metric.value === undefined ? null : round(Number(metric.value));
    return {
      key: metric.key,
      label: config.label,
      value: numericValue,
      source: metric.source,
      targetValue: Number(config.targetValue),
      direction: config.direction,
      weight: Number(config.weight || 1),
      status: evaluateMetricStatus(config, numericValue),
    };
  });

const buildOverallScore = (metricDetails = []) => {
  const contributions = metricDetails
    .map((metric) => {
      const contribution = toOverallContribution(metric, metric.value);
      if (contribution === null) {
        return null;
      }
      return contribution * Number(metric.weight || 1);
    })
    .filter((value) => value !== null);

  const totalWeight = metricDetails
    .filter((metric) => metric.value !== null && metric.value !== undefined && Number.isFinite(Number(metric.value)))
    .reduce((total, metric) => total + Number(metric.weight || 1), 0);

  if (!contributions.length || totalWeight === 0) {
    return 0;
  }

  return round(contributions.reduce((total, value) => total + value, 0) / totalWeight);
};

const buildTrainingMetricBase = ({
  training,
  sessions = [],
  students = [],
  enrollments = [],
  complianceSummary,
}) => {
  const learnerIds = getStudentIdsForTraining(training, sessions, enrollments);
  const studentMap = new Map(students.map((student) => [toId(student.id), student]));
  const learnerRecords = learnerIds.map((learnerId) => studentMap.get(learnerId)).filter(Boolean);
  const learnerStates = learnerRecords.map((learner) => deriveLearnerCompletion(learner));
  const completedLearners = learnerStates.filter((state) => state.status === "Completed").length;
  const transitionedLearners = learnerStates.filter((state) => ["Ready for Transition", "Completed"].includes(state.status)).length;
  const attritionCount = learnerRecords.filter((learner) => ["dropped", "leave", "on hold"].includes(String(learner.status || "").toLowerCase())).length;
  const complianceEntry = complianceSummary.cohorts.find((cohort) => toId(cohort.id) === toId(training.id));

  return {
    learnerRecords,
    learnerStates,
    learnerCount: learnerRecords.length,
    completedLearners,
    transitionedLearners,
    throughputPct: learnerRecords.length ? round((completedLearners / learnerRecords.length) * 100) : 0,
    attritionPct: learnerRecords.length ? round((attritionCount / learnerRecords.length) * 100) : 0,
    compliancePct: complianceEntry?.coveragePct ?? 0,
    complianceStatus: complianceEntry?.status ?? "Not Tracked",
  };
};

export const buildTrainerKpiRows = ({
  trainers = [],
  trainings = [],
  sessions = [],
  students = [],
  enrollments = [],
  complianceRecords = [],
  complianceItems = [],
  kpiManualEntries = [],
  kpiTargets = [],
  fromDate,
  toDate,
}) => {
  const trainerMap = new Map(trainers.map((trainer) => [toId(trainer.id), trainer]));
  const complianceSummary = buildComplianceSummary({
    trainings,
    sessions,
    students,
    enrollments,
    complianceRecords,
    complianceItems,
  });
  const metricCatalog = getMetricCatalog(kpiTargets);

  return [...trainerMap.entries()].map(([trainerId, trainer]) => {
    const trainerPrograms = trainings.filter((training) => toId(training.trainerId || training.trainer_id) === trainerId);
    const scopedPrograms = trainerPrograms.filter((training) => {
      const dateValue = training.startDate || training.start_date || training.endDate || training.end_date;
      return inDateRange(dateValue, fromDate, toDate);
    });
    const aggregatedBase = scopedPrograms.reduce(
      (accumulator, training) => {
        const trainingBase = buildTrainingMetricBase({
          training,
          sessions,
          students,
          enrollments,
          complianceSummary,
        });

        accumulator.learnerCount += trainingBase.learnerCount;
        accumulator.completedLearners += trainingBase.completedLearners;
        accumulator.transitionedLearners += trainingBase.transitionedLearners;
        accumulator.attritionWeighted.push({ value: trainingBase.attritionPct, weight: trainingBase.learnerCount });
        accumulator.complianceWeighted.push({ value: trainingBase.compliancePct, weight: trainingBase.learnerCount });
        return accumulator;
      },
      {
        learnerCount: 0,
        completedLearners: 0,
        transitionedLearners: 0,
        attritionWeighted: [],
        complianceWeighted: [],
      },
    );

    const weightedAverage = (entries) => {
      const totalWeight = entries.reduce((total, entry) => total + Number(entry.weight || 0), 0);
      if (!totalWeight) {
        return null;
      }
      return entries.reduce((total, entry) => total + Number(entry.value || 0) * Number(entry.weight || 0), 0) / totalWeight;
    };

    const utilizationPct = getManualMetricValue({ entries: kpiManualEntries, trainerId, metricKey: "utilizationPct", fromDate, toDate });
    const observationScore = getManualMetricValue({ entries: kpiManualEntries, trainerId, metricKey: "observationScore", fromDate, toDate });
    const satisfactionPct = getManualMetricValue({ entries: kpiManualEntries, trainerId, metricKey: "satisfactionPct", fromDate, toDate });
    const knowledgeRetentionScore = getManualMetricValue({ entries: kpiManualEntries, trainerId, metricKey: "knowledgeRetentionScore", fromDate, toDate });
    const qualityScore = getManualMetricValue({ entries: kpiManualEntries, trainerId, metricKey: "qualityScore", fromDate, toDate });
    const compliancePct = weightedAverage(aggregatedBase.complianceWeighted);
    const throughputPct = getManualMetricValue({ entries: kpiManualEntries, trainerId, metricKey: "throughputPct", fromDate, toDate });
    const attritionPct = getManualMetricValue({ entries: kpiManualEntries, trainerId, metricKey: "attritionPct", fromDate, toDate });
    const metricDetails = buildKpiMetricDetails({
      metricCatalog,
      metrics: [
        { key: "utilizationPct", value: utilizationPct, source: utilizationPct !== null ? "Manual KPI Entry" : "Pending Manual Input" },
        { key: "compliancePct", value: compliancePct, source: "Compliance Tracking" },
        { key: "knowledgeRetentionScore", value: knowledgeRetentionScore, source: knowledgeRetentionScore !== null ? "Manual KPI Entry" : "Pending Manual Input" },
        { key: "observationScore", value: observationScore, source: observationScore !== null ? "Manual KPI Entry" : "Pending Manual Input" },
        { key: "throughputPct", value: throughputPct, source: throughputPct !== null ? "Manual KPI Entry" : "Pending Manual Input" },
        { key: "attritionPct", value: attritionPct, source: attritionPct !== null ? "Manual KPI Entry" : "Pending Manual Input" },
        { key: "qualityScore", value: qualityScore, source: qualityScore !== null ? "Manual KPI Entry" : "Pending Manual Input" },
        { key: "satisfactionPct", value: satisfactionPct, source: satisfactionPct !== null ? "Manual KPI Entry" : "Pending Manual Input" },
      ],
    });
    const metricMap = Object.fromEntries(metricDetails.map((metric) => [metric.key, metric]));
    const manualEntries = getLatestManualMetricEntries({ entries: kpiManualEntries, trainerId, fromDate, toDate });

    return {
      trainerId,
      trainer: normalizeTrainerName(trainer),
      activePrograms: scopedPrograms.length,
      learnersTracked: aggregatedBase.learnerCount,
      overallScore: buildOverallScore(metricDetails),
      utilizationPct: metricMap.utilizationPct.value,
      utilizationStatus: utilizationPct === null ? "Pending Input" : deriveUtilizationPerformanceStatus(utilizationPct),
      observationScore: metricMap.observationScore.value,
      observationStatus: observationScore === null ? "Pending Input" : deriveObservationPerformanceStatus((observationScore / 100) * 5),
      compliancePct: metricMap.compliancePct.value ?? 0,
      throughputPct: metricMap.throughputPct.value ?? 0,
      attritionPct: metricMap.attritionPct.value ?? 0,
      knowledgeRetentionScore: metricMap.knowledgeRetentionScore.value,
      qualityScore: metricMap.qualityScore.value,
      satisfactionPct: metricMap.satisfactionPct.value,
      belowTargetMetrics: metricDetails.filter((metric) => metric.status === "Below Target").map((metric) => metric.label),
      pendingMetrics: metricDetails.filter((metric) => metric.status === "Pending Input").map((metric) => metric.label),
      metricDetails,
      manualEntries,
      programs: scopedPrograms.map((program) => ({ id: toId(program.id), title: program.title })),
    };
  });
};

export const buildProgramKpiRows = ({
  trainings = [],
  sessions = [],
  students = [],
  enrollments = [],
  trainers = [],
  complianceRecords = [],
  complianceItems = [],
  kpiManualEntries = [],
  kpiTargets = [],
  fromDate,
  toDate,
}) => {
  const trainerMap = new Map(trainers.map((trainer) => [toId(trainer.id), normalizeTrainerName(trainer)]));
  const complianceSummary = buildComplianceSummary({
    trainings,
    sessions,
    students,
    enrollments,
    complianceRecords,
    complianceItems,
  });
  const metricCatalog = getMetricCatalog(kpiTargets);

  return trainings
    .filter((training) => {
      const dateValue = training.startDate || training.start_date || training.endDate || training.end_date;
      return inDateRange(dateValue, fromDate, toDate);
    })
    .map((training) => {
      const trainerId = toId(training.trainerId || training.trainer_id);
      const base = buildTrainingMetricBase({
        training,
        sessions,
        students,
        enrollments,
        complianceSummary,
      });
      const utilizationPct =
        getManualMetricValue({ entries: kpiManualEntries, trainerId, trainingId: toId(training.id), metricKey: "utilizationPct", fromDate, toDate }) ??
        getManualMetricValue({ entries: kpiManualEntries, trainerId, metricKey: "utilizationPct", fromDate, toDate });
      const observationScore =
        getManualMetricValue({ entries: kpiManualEntries, trainerId, trainingId: toId(training.id), metricKey: "observationScore", fromDate, toDate }) ??
        getManualMetricValue({ entries: kpiManualEntries, trainerId, metricKey: "observationScore", fromDate, toDate });
      const satisfactionPct =
        getManualMetricValue({ entries: kpiManualEntries, trainerId, trainingId: toId(training.id), metricKey: "satisfactionPct", fromDate, toDate }) ??
        getManualMetricValue({ entries: kpiManualEntries, trainerId, metricKey: "satisfactionPct", fromDate, toDate });
      const knowledgeManual = getManualMetricValue({
        entries: kpiManualEntries,
        trainerId,
        trainingId: toId(training.id),
        metricKey: "knowledgeRetentionScore",
        fromDate,
        toDate,
      });
      const qualityManual = getManualMetricValue({
        entries: kpiManualEntries,
        trainerId,
        trainingId: toId(training.id),
        metricKey: "qualityScore",
        fromDate,
        toDate,
      });
      const throughputManual = getManualMetricValue({
        entries: kpiManualEntries,
        trainerId,
        trainingId: toId(training.id),
        metricKey: "throughputPct",
        fromDate,
        toDate,
      });
      const attritionManual = getManualMetricValue({
        entries: kpiManualEntries,
        trainerId,
        trainingId: toId(training.id),
        metricKey: "attritionPct",
        fromDate,
        toDate,
      });
      const metricDetails = buildKpiMetricDetails({
        metricCatalog,
        metrics: [
          { key: "utilizationPct", value: utilizationPct, source: utilizationPct !== null ? "Manual KPI Entry" : "Pending Manual Input" },
          { key: "compliancePct", value: base.compliancePct, source: "Compliance Tracking" },
          { key: "knowledgeRetentionScore", value: knowledgeManual, source: knowledgeManual !== null ? "Manual KPI Entry" : "Pending Manual Input" },
          { key: "observationScore", value: observationScore, source: observationScore !== null ? "Manual KPI Entry" : "Pending Manual Input" },
          { key: "throughputPct", value: throughputManual, source: throughputManual !== null ? "Manual KPI Entry" : "Pending Manual Input" },
          { key: "attritionPct", value: attritionManual, source: attritionManual !== null ? "Manual KPI Entry" : "Pending Manual Input" },
          { key: "qualityScore", value: qualityManual ?? null, source: qualityManual !== null ? "Manual KPI Entry" : "Pending Manual Input" },
          { key: "satisfactionPct", value: satisfactionPct, source: satisfactionPct !== null ? "Manual KPI Entry" : "Pending Manual Input" },
        ],
      });
      const metricMap = Object.fromEntries(metricDetails.map((metric) => [metric.key, metric]));

      return {
        trainingId: toId(training.id),
        program: training.title || "Program",
        trainerId,
        trainer: trainerMap.get(trainerId) || "Unassigned",
        startDate: training.startDate || training.start_date || "",
        endDate: training.endDate || training.end_date || "",
        learnersTracked: base.learnerCount,
        transitionedCount: base.transitionedLearners,
        compliantCount: round((Number(metricMap.compliancePct.value || 0) / 100) * base.learnerCount),
        overallScore: buildOverallScore(metricDetails),
        utilizationPct: metricMap.utilizationPct.value,
        compliancePct: metricMap.compliancePct.value ?? 0,
        knowledgeRetentionScore: metricMap.knowledgeRetentionScore.value,
        observationScore: metricMap.observationScore.value,
        throughputPct: metricMap.throughputPct.value ?? 0,
        attritionPct: metricMap.attritionPct.value ?? 0,
        qualityScore: metricMap.qualityScore.value,
        satisfactionPct: metricMap.satisfactionPct.value,
        status: base.complianceStatus,
        belowTargetMetrics: metricDetails.filter((metric) => metric.status === "Below Target").map((metric) => metric.label),
        pendingMetrics: metricDetails.filter((metric) => metric.status === "Pending Input").map((metric) => metric.label),
        metricDetails,
      };
    });
};

export const buildKpiOverview = (rows = []) => {
  const averageField = (field) => {
    const value = average(rows.map((row) => row[field]).filter((item) => item !== null && item !== undefined));
    return value === null ? 0 : round(value);
  };

  return {
    overallScore: averageField("overallScore"),
    compliancePct: averageField("compliancePct"),
    utilizationPct: averageField("utilizationPct"),
    attritionPct: averageField("attritionPct"),
    throughputPct: averageField("throughputPct"),
    belowTargetCount: rows.filter((row) => row.belowTargetMetrics?.length > 0).length,
    pendingInputCount: rows.reduce((total, row) => total + (row.pendingMetrics?.length || 0), 0),
  };
};
