export const toUiId = (value) => (value === undefined || value === null ? "" : String(value));

export const toApiId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

export const toDetailApiId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  const match = String(value).match(/(\d+)$/);
  return match ? Number(match[1]) : toApiId(value);
};

const withFallback = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");
const normalizeTaskStatus = (status) => {
  const value = withFallback(status, "");

  if (value === "Completed") {
    return "Done";
  }

  return value;
};

export const normalizeTrainer = (trainer) => {
  const rawId = withFallback(trainer?.id, trainer?.trainer_id, trainer?.trainerId);
  const firstName = trainer?.first_name ?? trainer?.firstName ?? "";
  const lastName = trainer?.last_name ?? trainer?.lastName ?? "";
  const fullName = withFallback(trainer?.full_name, trainer?.fullName, `${firstName} ${lastName}`.trim(), trainer?.name);

  return {
    ...trainer,
    id: toUiId(rawId),
    backendId: rawId,
    firstName,
    lastName,
    name: fullName || "Trainer",
    portalId: withFallback(trainer?.portalid, trainer?.portalId, trainer?.emp_id, trainer?.empId, ""),
    email: withFallback(trainer?.emailid, trainer?.email, ""),
    location: withFallback(trainer?.location, trainer?.region, ""),
  };
};

export const normalizeSupervisor = (supervisor) => ({
  ...supervisor,
  id: toUiId(supervisor?.id),
  backendId: supervisor?.id,
  portalId: withFallback(supervisor?.portalid, supervisor?.portalId, ""),
  trainerIds: Array.isArray(supervisor?.trainer_ids)
    ? supervisor.trainer_ids.map((id) => toUiId(id))
    : Array.isArray(supervisor?.trainerIds)
      ? supervisor.trainerIds.map((id) => toUiId(id))
      : [],
});

export const normalizeTrainerAttendanceRecord = (record) => ({
  ...record,
  id: toUiId(record?.id),
  trainerId: toUiId(withFallback(record?.trainer_id, record?.trainerId)),
  trainerName: withFallback(record?.trainer_name, record?.trainerName, ""),
  markedBy: withFallback(record?.marked_by, record?.markedBy, ""),
  markedAt: withFallback(record?.marked_at, record?.markedAt, ""),
});

export const normalizeTrainerObservation = (observation) => ({
  ...observation,
  id: toUiId(observation?.id),
  trainerId: toUiId(withFallback(observation?.trainer_id, observation?.trainerId)),
  trainerName: withFallback(observation?.trainer_name, observation?.trainerName, ""),
  supervisorId: toUiId(withFallback(observation?.supervisor_id, observation?.supervisorId)),
  supervisorName: withFallback(observation?.supervisor_name, observation?.supervisorName, ""),
  ratings: observation?.ratings || {},
  comments: observation?.comments || {},
});

export const normalizeTrainerObservationSummary = (summary) => ({
  ...summary,
  trainerId: toUiId(withFallback(summary?.trainer_id, summary?.trainerId)),
  trainerName: withFallback(summary?.trainer_name, summary?.trainerName, ""),
  observationCount: Number(withFallback(summary?.observation_count, summary?.observationCount, 0)),
  averageRating: Number(withFallback(summary?.average_rating, summary?.averageRating, 0)),
  latestObservationDate: withFallback(summary?.latest_observation_date, summary?.latestObservationDate, ""),
  supervisors: Array.isArray(summary?.supervisors) ? summary.supervisors : [],
});

export const normalizeTrainerUtilization = (entry) => ({
  ...entry,
  id: toUiId(withFallback(entry?.id, entry?.trainer_id, entry?.trainerId)),
  trainerId: toUiId(withFallback(entry?.trainer_id, entry?.trainerId)),
  trainerName: withFallback(entry?.trainer_name, entry?.trainerName, ""),
  billedHours: Number(withFallback(entry?.billed_hours, entry?.billedHours, 0)),
  availableHours: Number(withFallback(entry?.available_hours, entry?.availableHours, 0)),
  dailyBreakdown: Array.isArray(entry?.daily_breakdown)
    ? entry.daily_breakdown.map((day) => ({
        date: day?.date,
        billed: Number(withFallback(day?.billed, 0)),
        available: Number(withFallback(day?.available, 0)),
      }))
    : Array.isArray(entry?.dailyBreakdown)
      ? entry.dailyBreakdown.map((day) => ({
          date: day?.date,
          billed: Number(withFallback(day?.billed, 0)),
          available: Number(withFallback(day?.available, 0)),
        }))
      : [],
});

export const normalizeSkillCategory = (category) => ({
  ...category,
  id: toUiId(category?.id),
});

export const normalizeSkillDefinition = (skill) => ({
  ...skill,
  id: toUiId(skill?.id),
  categoryId: toUiId(withFallback(skill?.category_id, skill?.categoryId)),
});

export const normalizeTrainerSkill = (skill) => ({
  ...skill,
  trainerId: toUiId(withFallback(skill?.trainer_id, skill?.trainerId)),
  skillId: toUiId(withFallback(skill?.skill_id, skill?.skillId)),
  level: withFallback(skill?.level, "Not Assessed"),
  notes: withFallback(skill?.notes, ""),
});

export const normalizeAvailabilityRecord = (record) => ({
  ...record,
  id: toUiId(record?.id),
  backendId: toDetailApiId(record?.id),
  trainerId: toUiId(withFallback(record?.trainer_id, record?.trainerId)),
  startDate: withFallback(record?.start_date, record?.startDate, ""),
  endDate: withFallback(record?.end_date, record?.endDate, ""),
});

export const normalizeTaskComment = (comment) => ({
  ...comment,
  id: toUiId(comment?.id),
  text: withFallback(comment?.text, ""),
  author: withFallback(comment?.author, comment?.author_name, ""),
  date: withFallback(comment?.date, comment?.created_at, ""),
});

export const normalizeTask = (task) => ({
  ...task,
  id: toUiId(task?.id),
  backendId: toDetailApiId(task?.id),
  assignedTo: toUiId(withFallback(task?.assigned_to, task?.assignedTo)),
  programId: withFallback(task?.program_id, task?.programId, ""),
  trainingProgramId: withFallback(task?.training_program_id, task?.trainingProgramId, null),
  status: normalizeTaskStatus(withFallback(task?.status, "")),
  dueDate: withFallback(task?.due_date, task?.dueDate, ""),
  createdAt: withFallback(task?.created_at, task?.createdAt, ""),
  createdBy: withFallback(task?.created_by, task?.createdBy, ""),
  comments: Array.isArray(task?.comments) ? task.comments.map(normalizeTaskComment) : [],
});

export const normalizeMaterialVersion = (version) => ({
  ...version,
  version: withFallback(version?.version, ""),
  date: withFallback(version?.date, version?.uploaded_at, ""),
  uploadedBy: withFallback(version?.uploaded_by, version?.uploadedBy, ""),
});

export const normalizeMaterial = (material) => ({
  ...material,
  id: toUiId(material?.id),
  backendId: toDetailApiId(material?.id),
  fileName: withFallback(material?.file_name, material?.fileName, ""),
  uploadedBy: withFallback(material?.uploaded_by, material?.uploadedBy, ""),
  uploadedAt: withFallback(material?.uploaded_at, material?.uploadedAt, ""),
  programId: withFallback(material?.program_id, material?.programId, ""),
  trainingProgramId: withFallback(material?.training_program_id, material?.trainingProgramId, null),
  versions: Array.isArray(material?.versions) ? material.versions.map(normalizeMaterialVersion) : [],
});

export const normalizeCertification = (certification) => ({
  ...certification,
  id: toUiId(certification?.id),
  backendId: toDetailApiId(certification?.id),
  trainerId: toUiId(withFallback(certification?.trainer_id, certification?.trainerId)),
  issuedDate: withFallback(certification?.issued_date, certification?.issuedDate, ""),
  expiryDate: withFallback(certification?.expiry_date, certification?.expiryDate, ""),
  issuedBy: withFallback(certification?.issued_by, certification?.issuedBy, ""),
});

export const normalizeProgram = (program) => ({
  ...program,
  id: toUiId(program?.id),
  backendId: program?.id,
  title: withFallback(program?.title, program?.name, "Program"),
});

export const resolveSupervisorForUser = (supervisors, user) => {
  if (!Array.isArray(supervisors) || !user) {
    return null;
  }

  const portalId = String(user.portalId || "").toLowerCase();
  const userId = String(user.id || "").toLowerCase();
  const userName = String(user.name || "").trim().toLowerCase();

  return (
    supervisors.find((supervisor) => String(supervisor.portalId || "").toLowerCase() === portalId) ||
    supervisors.find((supervisor) => String(supervisor.id || "").toLowerCase() === userId) ||
    supervisors.find((supervisor) => String(supervisor.name || "").trim().toLowerCase() === userName) ||
    supervisors[0] ||
    null
  );
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
