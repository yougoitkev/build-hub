import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/app-store";
import {
  Bell,
  CalendarDays,
  CalendarOff,
  Users,
  ClipboardCheck,
  MessageSquare,
  FileSpreadsheet,
} from "lucide-react";
import { differenceInDays, format, parseISO, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { api } from "@/data/api";
import {
  LEAVE_NOTIFICATIONS_UPDATED_EVENT,
  isLeaveNotificationVisibleToUser,
  loadLeaveNotifications,
} from "@/lib/leave-notifications";

const normalizeId = (value) => (value === undefined || value === null ? "" : String(value));
const buildReadStorageKey = (user) => `tms.notifications.read_ids.${normalizeId(user?.portalId || user?.trainerId || user?.id || user?.role || "guest")}`;

const loadReadIds = (user) => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(buildReadStorageKey(user));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveReadIds = (user, ids) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(buildReadStorageKey(user), JSON.stringify(ids));
};

const mapSessionRecord = (session) => ({
  id: normalizeId(session.id),
  trainerId: normalizeId(session.trainer_id || session.trainerId),
  title: session.title || "",
  date: session.session_date || session.date || "",
  startTime: session.start_time || session.startTime || "--",
  endTime: session.end_time || session.endTime || "--",
  location: session.location || "TBD",
  studentIds: Array.isArray(session.student_ids) ? session.student_ids : session.studentIds || [],
});

const mapTrainingRecord = (training) => ({
  id: normalizeId(training.id),
  trainerId: normalizeId(training.trainer_id || training.trainerId),
  title: training.title || "",
  endDate: training.end_date || training.endDate || "",
  status: training.status || "Upcoming",
});

const mapFeedbackRecord = (feedback) => ({
  id: normalizeId(feedback.id),
  trainerId: normalizeId(feedback.trainer_id || feedback.trainerId),
  trainerName: feedback.trainer_name || feedback.trainerName || "",
  fromUserName: feedback.from_user_name || feedback.fromUserName || "System",
  rating: Number(feedback.rating || 0),
  category: feedback.category || "Feedback",
  submittedAt: feedback.submitted_at || feedback.submittedAt || "",
});

const mapImportRecord = (importRecord) => ({
  id: normalizeId(importRecord.id),
  filename: importRecord.filename || importRecord.file_name || "Import",
  status: importRecord.status || "",
  uploadedAt: importRecord.uploaded_at || importRecord.uploadedAt || "",
  errorRows: Number(importRecord.error_rows || importRecord.errorRows || 0),
});

export function NotificationPanel({ collapsed }) {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const [sessions, setSessions] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [imports, setImports] = useState([]);
  const [leaveNotifications, setLeaveNotifications] = useState(() => loadLeaveNotifications());
  const [readIds, setReadIds] = useState(() => loadReadIds(user));

  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";
  const trainerId = normalizeId(user?.trainerId || user?.id);
  const today = startOfDay(new Date());

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const trainerQuery = !isSupervisor && trainerId ? { trainer_id: trainerId } : {};
        const requests = [
          api.scheduledTrainings.sessions(trainerQuery),
          api.scheduledTrainings.list(trainerQuery),
        ];

        if (!isSupervisor && trainerId) {
          requests.push(api.feedback.list({ trainer_id: trainerId }));
        } else {
          requests.push(Promise.resolve({ feedback: [] }));
        }

        if (isSupervisor) {
          requests.push(api.imports.list());
        } else {
          requests.push(Promise.resolve({ imports: [] }));
        }

        const [sessionsResponse, trainingsResponse, feedbackResponse, importsResponse] = await Promise.all(requests);

        if (!isMounted) {
          return;
        }

        setSessions(Array.isArray(sessionsResponse?.sessions) ? sessionsResponse.sessions.map(mapSessionRecord) : []);
        setTrainings(
          Array.isArray(trainingsResponse?.scheduled_trainings)
            ? trainingsResponse.scheduled_trainings.map(mapTrainingRecord)
            : []
        );
        setFeedbackItems(Array.isArray(feedbackResponse?.feedback) ? feedbackResponse.feedback.map(mapFeedbackRecord) : []);
        setImports(Array.isArray(importsResponse?.imports) ? importsResponse.imports.map(mapImportRecord) : []);
      } catch {
        if (!isMounted) {
          return;
        }

        setSessions([]);
        setTrainings([]);
        setFeedbackItems([]);
        setImports([]);
      }
    };

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [isSupervisor, trainerId]);
  useEffect(() => {
    setReadIds(loadReadIds(user));
  }, [user?.id, user?.portalId, user?.trainerId, user?.role]);

  useEffect(() => {
    saveReadIds(user, readIds);
  }, [readIds, user]);

  useEffect(() => {
    const refreshLeaveNotifications = () => {
      setLeaveNotifications(loadLeaveNotifications());
    };

    refreshLeaveNotifications();

    if (typeof window === "undefined") {
      return undefined;
    }

    window.addEventListener(LEAVE_NOTIFICATIONS_UPDATED_EVENT, refreshLeaveNotifications);
    window.addEventListener("storage", refreshLeaveNotifications);

    return () => {
      window.removeEventListener(LEAVE_NOTIFICATIONS_UPDATED_EVENT, refreshLeaveNotifications);
      window.removeEventListener("storage", refreshLeaveNotifications);
    };
  }, []);

  const allNotifications = useMemo(() => {
    const notifications = [];
    const todayStr = format(today, "yyyy-MM-dd");

    sessions.forEach((session) => {
      if (!session.date) {
        return;
      }

      const sessionDate = startOfDay(parseISO(session.date));
      const daysUntil = differenceInDays(sessionDate, today);

      if (daysUntil < 0 || daysUntil > 3) {
        return;
      }

      notifications.push({
        id: `sess-${session.id}`,
        icon: CalendarDays,
        title: daysUntil === 0 ? "Session Today" : `Session in ${daysUntil} day${daysUntil > 1 ? "s" : ""}`,
        message: `${session.title} - ${session.startTime} to ${session.endTime}`,
        type: daysUntil === 0 ? "urgent" : "info",
        date: session.date,
        target: {
          pathname: "/calendar",
          search: `?date=${encodeURIComponent(session.date)}&sessionId=${encodeURIComponent(session.id)}&view=day`,
        },
      });
    });

    trainings
      .filter((training) => String(training.status).toLowerCase() === "ongoing")
      .forEach((training) => {
        notifications.push({
          id: `trn-${training.id}`,
          icon: Users,
          title: "Training In Progress",
          message: `${training.title} - ends ${training.endDate || "TBD"}`,
          type: "info",
          date: todayStr,
        });
      });

    if (!isSupervisor) {
      const todaysSessionCount = sessions.filter((session) => session.date === todayStr).length;
      if (todaysSessionCount > 0) {
        notifications.push({
          id: "att-reminder",
          icon: ClipboardCheck,
          title: "Attendance Reminder",
          message: `Don't forget to mark attendance for ${todaysSessionCount} session(s) today`,
          type: "warning",
          date: todayStr,
          target: {
            pathname: "/attendance",
          },
        });
      }

      feedbackItems.slice(0, 3).forEach((feedback) => {
        notifications.push({
          id: `fb-${feedback.id}`,
          icon: MessageSquare,
          title: "New Feedback Received",
          message: `${feedback.category} from ${feedback.fromUserName}${feedback.rating ? ` (${feedback.rating}/5)` : ""}`,
          type: "info",
          date: feedback.submittedAt || todayStr,
          target: {
            pathname: "/feedback",
          },
        });
      });
    }

    if (isSupervisor) {
      imports.slice(0, 3).forEach((importRecord) => {
        notifications.push({
          id: `imp-${importRecord.id}`,
          icon: FileSpreadsheet,
          title: importRecord.errorRows > 0 ? "Import Needs Review" : "Import Processed",
          message:
            importRecord.errorRows > 0
              ? `${importRecord.filename} has ${importRecord.errorRows} row error(s)`
              : `${importRecord.filename} is ${importRecord.status || "processed"}`,
          type: importRecord.errorRows > 0 ? "warning" : "info",
          date: importRecord.uploadedAt || todayStr,
          target: {
            pathname: "/import",
          },
        });
      });
    }

    leaveNotifications
      .filter((notification) => isLeaveNotificationVisibleToUser(notification, user))
      .forEach((notification) => {
        notifications.push({
          ...notification,
          icon: CalendarOff,
          target: notification.target || {
            pathname: "/leave-requests",
          },
        });
      });

    return notifications
      .map((notification) => ({
        ...notification,
        read: readIds.includes(notification.id),
      }))
      .sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")));
  }, [feedbackItems, imports, isSupervisor, leaveNotifications, readIds, sessions, today, trainings, user]);

  const unreadCount = allNotifications.filter((notification) => !notification.read).length;

  const typeStyles = {
    urgent: "border-l-destructive bg-destructive/5",
    warning: "border-l-amber-500 bg-amber-500/5",
    info: "border-l-primary bg-primary/5",
  };

  const handleMarkRead = (id) => {
    if (!id || readIds.includes(id)) {
      return;
    }

    setReadIds((current) => [...current, id]);
  };

  const handleNotificationClick = (notif) => {
    handleMarkRead(notif.id);
    if (notif.target?.pathname) {
      navigate({
        pathname: notif.target.pathname,
        search: notif.target.search || "",
      });
    }
  };

  const handleMarkAllRead = () => {
    setReadIds((current) => {
      const ids = new Set(current);
      allNotifications.forEach((notification) => {
        if (notification.id) {
          ids.add(notification.id);
        }
      });
      return [...ids];
    });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "relative text-muted-foreground hover:text-foreground w-full justify-start gap-3",
            collapsed && "w-auto justify-center"
          )}
        >
          <Bell className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate text-sm font-medium">Notifications</span>}
          {unreadCount > 0 && (
            <span
              className={cn(
                "flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold",
                collapsed ? "absolute -top-0.5 -right-0.5 h-5 w-5" : "ml-auto h-5 min-w-5 px-1"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" side="right" align="start" sideOffset={8}>
        <div className="p-4 border-b border-border/50 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-foreground">Notifications</h3>
            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={handleMarkAllRead}
            disabled={allNotifications.length === 0 || unreadCount === 0}
          >
            Mark all read
          </Button>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <div className="p-2 space-y-1">
            {allNotifications.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
            )}
            {allNotifications.map((notif) => {
              const Icon = notif.icon || Bell;
              return (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border-l-4 transition-colors cursor-pointer hover:bg-muted/30",
                    typeStyles[notif.type] || typeStyles.info,
                    notif.read && "opacity-60"
                  )}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                    {notif.date && <p className="text-[10px] text-muted-foreground/70 mt-1">{notif.date}</p>}
                  </div>
                  {!notif.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}