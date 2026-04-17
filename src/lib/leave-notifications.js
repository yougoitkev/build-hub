const STORAGE_KEY = "tms.leave.notifications.feed";
export const LEAVE_NOTIFICATIONS_UPDATED_EVENT = "tms:leave-notifications-updated";

const MAX_NOTIFICATIONS = 100;

const normalizeId = (value) => (value === undefined || value === null ? "" : String(value));

const readNotifications = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeNotifications = (notifications) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new CustomEvent(LEAVE_NOTIFICATIONS_UPDATED_EVENT, { detail: notifications }));
};

const formatLeaveWindow = (request) => {
  const start = request?.startDate || "";
  const end = request?.endDate || "";

  if (!start && !end) {
    return "the selected dates";
  }

  if (start && end && start !== end) {
    return `${start} to ${end}`;
  }

  return start || end;
};

export const resolveTrainerIdentity = (trainers, user) => {
  if (!user) {
    return {
      trainerId: "",
      trainerName: "",
      trainerBackendId: null,
    };
  }

  const lookupId = normalizeId(user.trainerId || user.id);
  const portalId = String(user.portalId || "").toLowerCase();
  const email = String(user.email || "").toLowerCase();
  const name = String(user.name || "").trim().toLowerCase();

  const matchedTrainer = Array.isArray(trainers)
    ? trainers.find((trainer) =>
        normalizeId(trainer.id) === lookupId ||
        String(trainer.portalId || "").toLowerCase() === portalId ||
        String(trainer.email || "").toLowerCase() === email ||
        String(trainer.name || "").trim().toLowerCase() === name
      )
    : null;

  return {
    trainerId: normalizeId(matchedTrainer?.id || user.trainerId || user.id),
    trainerName: matchedTrainer?.name || user.name || "Trainer",
    trainerBackendId: matchedTrainer?.backendId ?? null,
  };
};

export const loadLeaveNotifications = () => readNotifications();

export const isLeaveNotificationVisibleToUser = (notification, user) => {
  if (!user) {
    return false;
  }

  const audience = notification?.audience || {};
  const role = String(user.role || "").toLowerCase();
  const userId = normalizeId(user.id);
  const trainerId = normalizeId(user.trainerId || user.id);
  const allowedRoles = Array.isArray(audience.roles) ? audience.roles.map((item) => String(item).toLowerCase()) : [];
  const allowedUserIds = Array.isArray(audience.userIds) ? audience.userIds.map(normalizeId) : [];
  const allowedTrainerIds = Array.isArray(audience.trainerIds) ? audience.trainerIds.map(normalizeId) : [];

  if (!allowedRoles.length && !allowedUserIds.length && !allowedTrainerIds.length) {
    return true;
  }

  return allowedRoles.includes(role) || allowedUserIds.includes(userId) || allowedTrainerIds.includes(trainerId);
};

export const pushLeaveNotification = (notification) => {
  const nextNotifications = [notification, ...readNotifications().filter((item) => item.id !== notification.id)]
    .slice(0, MAX_NOTIFICATIONS);
  writeNotifications(nextNotifications);
  return nextNotifications;
};

const buildBaseNotification = ({ title, message, type, event, request, audience }) => ({
  id: `leave-${event}-${normalizeId(request?.id || request?.backendId || Date.now())}-${Date.now()}`,
  source: "leave",
  event,
  title,
  message,
  type,
  date: new Date().toISOString(),
  target: {
    pathname: "/leave-requests",
  },
  audience,
  requestId: normalizeId(request?.id || request?.backendId),
  requestType: request?.type || "",
  trainerId: normalizeId(request?.trainerId),
  startDate: request?.startDate || "",
  endDate: request?.endDate || "",
});

export const createLeaveRequestSubmittedNotification = ({ request, trainerName }) => {
  const notification = buildBaseNotification({
    title: "New Leave Request",
    message: `${trainerName} requested ${request?.type || "leave"} for ${formatLeaveWindow(request)}.`,
    type: "warning",
    event: "submitted",
    request,
    audience: {
      roles: ["supervisor", "admin"],
      trainerIds: [normalizeId(request?.trainerId)],
    },
  });

  return pushLeaveNotification(notification);
};

export const createLeaveDecisionNotification = ({ decision, request, trainerName, actorName }) => {
  const normalizedDecision = String(decision || "").toLowerCase();
  const approved = normalizedDecision === "approved";
  const notification = buildBaseNotification({
    title: approved ? "Leave Approved" : "Leave Rejected",
    message: `${actorName || "Supervisor"} ${approved ? "approved" : "rejected"} ${trainerName ? `${trainerName}'s ` : ""}${request?.type || "leave"} request for ${formatLeaveWindow(request)}.`,
    type: approved ? "info" : "urgent",
    event: approved ? "approved" : "rejected",
    request,
    audience: {
      roles: ["supervisor", "admin"],
      trainerIds: [normalizeId(request?.trainerId)],
    },
  });

  return pushLeaveNotification(notification);
};