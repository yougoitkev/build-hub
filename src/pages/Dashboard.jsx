import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isAfter, parseISO, startOfDay } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  PlusCircle,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import { Hero } from "@/components/learning/Hero";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { Button } from "@/components/ui/button";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/data/api";
import { getQuickActions, getRoleMeta } from "@/lib/app-shell-config";
import { buildOperationalAlerts, buildProgramPipeline, buildRecentActivityFeed } from "@/lib/tms-insights";
import { deriveSessionStatus, deriveTrainingProgramStatus } from "@/lib/tms-status";

const QUICK_ACTION_COLORS = [
  "text-primary bg-primary/10",
  "text-muted-foreground bg-muted",
];

const normalizeId = (value) => (value === undefined || value === null ? "" : String(value));

const mapTrainerRecord = (trainer) => ({
  id: normalizeId(trainer.id),
  portalId: trainer.portalid || trainer.portalId || "",
  email: trainer.emailid || trainer.email || "",
  name: trainer.full_name || trainer.name || `${trainer.first_name || trainer.firstName || ""} ${trainer.last_name || trainer.lastName || ""}`.trim(),
  status: trainer.status || "Active",
});

const mapTrainingRecord = (training) => ({
  id: normalizeId(training.id),
  trainerId: normalizeId(training.trainer_id || training.trainerId),
  title: training.title || "",
  courseCode: training.course_code || training.courseCode || "",
  startDate: training.start_date || training.startDate || "",
  endDate: training.end_date || training.endDate || "",
  status: training.status || "Upcoming",
  studentCount: Number(training.student_count || training.studentCount || 0),
  capacity: Number(training.capacity || 0),
});

const mapSessionRecord = (session) => ({
  id: normalizeId(session.id),
  scheduledTrainingId: normalizeId(session.scheduled_training_id || session.scheduledTrainingId),
  trainingId: normalizeId(session.training_program_id || session.trainingId || session.training_id),
  trainerId: normalizeId(session.trainer_id || session.trainerId),
  trainerName: session.trainer_name || session.trainerName || "",
  title: session.title || "",
  date: session.session_date || session.date || "",
  startTime: session.start_time || session.startTime || "--",
  endTime: session.end_time || session.endTime || "--",
  location: session.location || "TBD",
  status: session.status || "",
  studentIds: Array.isArray(session.student_ids) ? session.student_ids.map((id) => normalizeId(id)) : session.studentIds || [],
});

const resolveTrainerIdForUser = (trainers, user) => {
  const matched = trainers.find((trainer) =>
    trainer.id === normalizeId(user?.trainerId || user?.id) ||
    String(trainer.portalId || "").toLowerCase() === String(user?.portalId || "").toLowerCase() ||
    String(trainer.email || "").toLowerCase() === String(user?.email || "").toLowerCase() ||
    String(trainer.name || "").toLowerCase() === String(user?.name || "").toLowerCase(),
  );

  return normalizeId(matched?.id || user?.trainerId || user?.id);
};

function DashboardShell({ isLoadingData, fetchError, children }) {
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return <p className="text-sm text-destructive">Error loading data</p>;
  }

  return children;
}

function OperationalAlertsCard({ alerts, navigate }) {
  return (
    <PremiumCard className="glass-card">
      <PremiumCardHeader className="pb-2 flex flex-row items-center justify-between">
        <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Operational Alerts
        </PremiumCardTitle>
        <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/reports")}>
          View Reports <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </PremiumCardHeader>
      <PremiumCardContent>
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => navigate(alert.link)}
                className="w-full text-left rounded-xl border border-border/50 bg-muted/10 px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                  <StatusBadge
                    status={alert.severity === "critical" ? "Below Target" : alert.severity === "warning" ? "Needs Attention" : "On Track"}
                    domain="performance"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{alert.detail}</p>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border/50 p-8 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-primary" />
              <p className="text-sm font-semibold text-foreground">No active operational alerts</p>
              <p className="text-xs text-muted-foreground mt-1">The current dashboard view does not show any critical risks.</p>
            </div>
          )}
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}

function RecentActivityCard({ activity }) {
  return (
    <PremiumCard className="glass-card">
      <PremiumCardHeader className="pb-2">
        <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" /> Recent Activity
        </PremiumCardTitle>
      </PremiumCardHeader>
      <PremiumCardContent>
        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
          {activity.length > 0 ? (
            activity.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border/50 bg-muted/10 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{entry.title}</p>
                  <span className="text-[10px] text-muted-foreground">{entry.when}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{entry.detail}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-6">No recent activity available.</p>
          )}
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}

function useDashboardData() {
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [scheduledTrainings, setScheduledTrainings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        if (isMounted) {
          setIsLoadingData(true);
          setFetchError(false);
        }

        const [summary, trainersRes, trainingsRes, sessionsRes] = await Promise.all([
          api.dashboard.summary(),
          api.trainers.list(),
          api.scheduledTrainings.list(),
          api.scheduledTrainings.sessions(),
        ]);

        if (!isMounted) {
          return;
        }

        setDashboardSummary(summary);
        setTrainers(Array.isArray(trainersRes?.trainers) ? trainersRes.trainers.map(mapTrainerRecord) : []);
        setScheduledTrainings(
          Array.isArray(trainingsRes?.scheduled_trainings) ? trainingsRes.scheduled_trainings.map(mapTrainingRecord) : [],
        );
        setSessions(Array.isArray(sessionsRes?.sessions) ? sessionsRes.sessions.map(mapSessionRecord) : []);
        setIsLoadingData(false);
      } catch (error) {
        if (isMounted) {
          setDashboardSummary(null);
          setTrainers([]);
          setScheduledTrainings([]);
          setSessions([]);
          setFetchError(true);
          setIsLoadingData(false);
        }
        toast.error(error?.message || "Failed to load dashboard.");
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { dashboardSummary, trainers, scheduledTrainings, sessions, isLoadingData, fetchError };
}

function SupervisorDashboard() {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const availability = useAppStore((state) => state.availability);
  const certifications = useAppStore((state) => state.certifications);
  const trainerUtilization = useAppStore((state) => state.trainerUtilization);
  const trainerObservations = useAppStore((state) => state.trainerObservations);
  const tasks = useAppStore((state) => state.tasks);
  const adminLogs = useAppStore((state) => state.adminLogs);
  const notifications = useAppStore((state) => state.notifications);
  const students = useAppStore((state) => state.students);
  const enrollments = useAppStore((state) => state.enrollments);
  const complianceItems = useAppStore((state) => state.complianceItems);
  const complianceRecords = useAppStore((state) => state.complianceRecords);

  const { trainers, scheduledTrainings, sessions, isLoadingData, fetchError } = useDashboardData();
  const roleMeta = getRoleMeta(user?.role || "supervisor");
  const today = startOfDay(new Date());

  const trainings = useMemo(
    () => scheduledTrainings.map((training) => ({ ...training, status: deriveTrainingProgramStatus(training, today) })),
    [scheduledTrainings, today],
  );
  const upcomingSessions = useMemo(
    () =>
      sessions
        .map((session) => ({ ...session, status: deriveSessionStatus(session, today) }))
        .filter((session) => session.date && !isAfter(today, parseISO(`${session.date}T00:00:00`)))
        .sort((left, right) => `${left.date} ${left.startTime}`.localeCompare(`${right.date} ${right.startTime}`))
        .slice(0, 8),
    [sessions, today],
  );
  const upcomingPrograms = useMemo(
    () =>
      trainings
        .filter((training) => training.status === "Upcoming" || training.status === "Ongoing")
        .sort((left, right) => `${left.startDate}`.localeCompare(`${right.startDate}`))
        .slice(0, 8),
    [trainings],
  );
  const quickActions = useMemo(
    () =>
      getQuickActions("supervisor").map((action, index) => ({
        label: action.title,
        description: action.description,
        icon: action.icon,
        link: action.url,
        color: QUICK_ACTION_COLORS[index % QUICK_ACTION_COLORS.length],
      })),
    [],
  );
  const insights = useMemo(
    () =>
      buildOperationalAlerts({
        role: "supervisor",
        sessions,
        trainings,
        availability,
        certifications,
        trainerUtilization,
        trainerObservations,
        students,
        enrollments,
        complianceRecords,
        complianceItems,
        tasks,
      }),
    [sessions, trainings, availability, certifications, trainerUtilization, trainerObservations, students, enrollments, complianceRecords, complianceItems, tasks],
  );
  const pipeline = useMemo(() => buildProgramPipeline(trainings), [trainings]);
  const recentActivity = useMemo(() => buildRecentActivityFeed({ adminLogs, notifications }), [adminLogs, notifications]);

  const stats = [
    { label: "Trainers", value: trainers.length, icon: Users, color: "text-primary bg-primary/10", link: "/trainers" },
    { label: "Today / Upcoming Sessions", value: upcomingSessions.length, icon: CalendarDays, color: "text-muted-foreground bg-muted", link: "/calendar" },
    { label: "Pending Approvals", value: insights.pendingLeaveCount, icon: ClipboardCheck, color: "text-primary bg-primary/10", link: "/leave-requests" },
    { label: "Active Risks", value: insights.alerts.length, icon: AlertTriangle, color: "text-muted-foreground bg-muted", link: "/reports" },
  ];

  return (
    <DashboardShell isLoadingData={isLoadingData} fetchError={fetchError}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <Hero
          badge={roleMeta.workspaceLabel}
          title="Training Operations Control Center"
          description="Run scheduling, attendance, observations, utilization, compliance, approvals, and reporting from one connected workspace."
          actions={
            <>
              <Button className="rounded-full px-6 bg-primary hover:bg-primary/90" onClick={() => navigate("/calendar")}>
                <CalendarDays className="mr-2 h-4 w-4" /> Open Calendar
              </Button>
              <Button variant="outline" className="rounded-full px-6" onClick={() => navigate("/reports")}>
                Review Reports
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((item, index) => (
            <StatCard key={item.label} {...item} delay={index * 50} />
          ))}
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" /> Standardized Workflows
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <QuickActionCard key={action.label} {...action} delay={index * 40} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PremiumCard className="glass-card">
            <PremiumCardHeader className="pb-2">
              <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Operating Summary
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border/50 bg-muted/10 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Upcoming</p>
                  <p className="text-2xl font-bold text-sky-700">{pipeline.upcoming}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ongoing</p>
                  <p className="text-2xl font-bold text-amber-700">{pipeline.ongoing}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-emerald-700">{pipeline.completed}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compliance Coverage</p>
                    <p className="text-2xl font-bold">{insights.complianceSummary.coveragePct}%</p>
                  </div>
                  <StatusBadge status={insights.complianceSummary.status} domain="compliance" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {insights.complianceSummary.compliantCount}/{insights.complianceSummary.requiredCount} learners currently meet the shared readiness/compliance rule.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/10 px-4 py-3">
                  <span className="text-sm">Observation risks</span>
                  <StatusBadge
                    status={insights.observationRiskCount > 0 ? "Needs Attention" : "On Track"}
                    domain="performance"
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/10 px-4 py-3">
                  <span className="text-sm">Utilization below target</span>
                  <StatusBadge
                    status={insights.lowUtilizationCount > 0 ? "Needs Attention" : "On Track"}
                    domain="performance"
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/10 px-4 py-3">
                  <span className="text-sm">Schedule conflicts</span>
                  <StatusBadge
                    status={insights.scheduleConflictCount > 0 ? "Below Target" : "On Track"}
                    domain="performance"
                  />
                </div>
              </div>
            </PremiumCardContent>
          </PremiumCard>

          <div className="lg:col-span-2">
            <OperationalAlertsCard alerts={insights.alerts} navigate={navigate} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PremiumCard className="glass-card">
            <PremiumCardHeader className="pb-2 flex flex-row items-center justify-between">
              <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Upcoming Sessions
              </PremiumCardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/calendar")}>
                View Calendar <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </PremiumCardHeader>
            <PremiumCardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {upcomingSessions.length > 0 ? (
                  upcomingSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => navigate(`/calendar?date=${session.date}&view=day&sessionId=${session.id}`)}
                      className="w-full text-left rounded-xl border border-border/50 bg-muted/10 px-4 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold truncate">{session.title}</p>
                        <StatusBadge status={session.status} domain="session" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {session.date} • {session.startTime} - {session.endTime} • {session.location}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-6">No upcoming sessions scheduled.</p>
                )}
              </div>
            </PremiumCardContent>
          </PremiumCard>

          <PremiumCard className="glass-card">
            <PremiumCardHeader className="pb-2 flex flex-row items-center justify-between">
              <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Program Pipeline
              </PremiumCardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/progress")}>
                Open Progress <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </PremiumCardHeader>
            <PremiumCardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {upcomingPrograms.length > 0 ? (
                  upcomingPrograms.map((program) => (
                    <button
                      key={program.id}
                      onClick={() => navigate(`/calendar?date=${program.startDate}&view=week`)}
                      className="w-full text-left rounded-xl border border-border/50 bg-muted/10 px-4 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold truncate">{program.title}</p>
                        <StatusBadge status={program.status} domain="trainingProgram" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {program.startDate} → {program.endDate} • {program.studentCount} learners
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-6">No programs available.</p>
                )}
              </div>
            </PremiumCardContent>
          </PremiumCard>
        </div>

        <RecentActivityCard activity={recentActivity} />
      </div>
    </DashboardShell>
  );
}

function TrainerDashboard() {
  const navigate = useNavigate();
  const user = useAppStore((state) => state.user);
  const availability = useAppStore((state) => state.availability);
  const certifications = useAppStore((state) => state.certifications);
  const tasks = useAppStore((state) => state.tasks);
  const students = useAppStore((state) => state.students);
  const enrollments = useAppStore((state) => state.enrollments);
  const notifications = useAppStore((state) => state.notifications);
  const adminLogs = useAppStore((state) => state.adminLogs);
  const complianceItems = useAppStore((state) => state.complianceItems);
  const complianceRecords = useAppStore((state) => state.complianceRecords);

  const { trainers, scheduledTrainings, sessions, isLoadingData, fetchError } = useDashboardData();
  const roleMeta = getRoleMeta(user?.role || "trainer");
  const today = startOfDay(new Date());

  const trainerId = useMemo(() => resolveTrainerIdForUser(trainers, user), [trainers, user]);
  const myTrainings = useMemo(
    () =>
      scheduledTrainings
        .filter((training) => String(training.trainerId) === String(trainerId))
        .map((training) => ({ ...training, status: deriveTrainingProgramStatus(training, today) })),
    [scheduledTrainings, trainerId, today],
  );
  const mySessions = useMemo(
    () =>
      sessions
        .filter((session) => String(session.trainerId) === String(trainerId))
        .map((session) => ({ ...session, status: deriveSessionStatus(session, today) })),
    [sessions, trainerId, today],
  );
  const todaySessions = useMemo(
    () =>
      mySessions
        .filter((session) => session.date && !isAfter(today, parseISO(`${session.date}T00:00:00`)))
        .sort((left, right) => `${left.date} ${left.startTime}`.localeCompare(`${right.date} ${right.startTime}`))
        .slice(0, 8),
    [mySessions, today],
  );
  const myTasks = useMemo(
    () => tasks.filter((task) => String(task.assignedTo) === String(trainerId) && String(task.status) !== "Done"),
    [tasks, trainerId],
  );
  const myCertifications = useMemo(
    () => certifications.filter((certification) => String(certification.trainerId) === String(trainerId)),
    [certifications, trainerId],
  );
  const myAvailability = useMemo(
    () => availability.filter((record) => String(record.trainerId) === String(trainerId)),
    [availability, trainerId],
  );
  const quickActions = useMemo(
    () =>
      getQuickActions("trainer").map((action, index) => ({
        label: action.title,
        description: action.description,
        icon: action.icon,
        link: action.url,
        color: QUICK_ACTION_COLORS[index % QUICK_ACTION_COLORS.length],
      })),
    [],
  );
  const insights = useMemo(
    () =>
      buildOperationalAlerts({
        role: "trainer",
        sessions: mySessions,
        trainings: myTrainings,
        availability: myAvailability,
        certifications: myCertifications,
        trainerObservations: [],
        trainerUtilization: [],
        students,
        enrollments,
        complianceRecords,
        complianceItems,
        tasks: myTasks,
      }),
    [mySessions, myTrainings, myAvailability, myCertifications, students, enrollments, complianceRecords, complianceItems, myTasks],
  );
  const recentActivity = useMemo(() => buildRecentActivityFeed({ adminLogs, notifications }), [adminLogs, notifications]);

  const stats = [
    { label: "Today / Upcoming Sessions", value: todaySessions.length, icon: CalendarDays, color: "text-primary bg-primary/10", link: "/calendar" },
    { label: "Active Programs", value: myTrainings.length, icon: TrendingUp, color: "text-muted-foreground bg-muted", link: "/progress" },
    { label: "Open Tasks", value: myTasks.length, icon: ClipboardCheck, color: "text-primary bg-primary/10", link: "/tasks" },
    { label: "My Alerts", value: insights.alerts.length, icon: AlertTriangle, color: "text-muted-foreground bg-muted", link: "/certifications" },
  ];

  return (
    <DashboardShell isLoadingData={isLoadingData} fetchError={fetchError}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <Hero
          badge={`${roleMeta.workspaceLabel} • ${user?.name || "Trainer"}`}
          title="Daily Training Workflow"
          description="Start with today’s sessions, record attendance, capture learner observations, and keep progress, leave, and certifications in sync."
          actions={
            <>
              <Button className="rounded-full px-6 bg-primary hover:bg-primary/90" onClick={() => navigate("/attendance")}>
                <ClipboardCheck className="mr-2 h-4 w-4" /> Mark Attendance
              </Button>
              <Button variant="outline" className="rounded-full px-6" onClick={() => navigate("/observations")}>
                Record Observations
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((item, index) => (
            <StatCard key={item.label} {...item} delay={index * 50} />
          ))}
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" /> My Standardized Workflow
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <QuickActionCard key={action.label} {...action} delay={index * 40} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PremiumCard className="glass-card">
            <PremiumCardHeader className="pb-2 flex flex-row items-center justify-between">
              <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Today / Upcoming Sessions
              </PremiumCardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/calendar")}>
                Open Calendar <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </PremiumCardHeader>
            <PremiumCardContent>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {todaySessions.length > 0 ? (
                  todaySessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => navigate(`/calendar?date=${session.date}&view=day&sessionId=${session.id}`)}
                      className="w-full text-left rounded-xl border border-border/50 bg-muted/10 px-4 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold truncate">{session.title}</p>
                        <StatusBadge status={session.status} domain="session" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {session.date} • {session.startTime} - {session.endTime} • {session.location}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-6">No sessions scheduled yet.</p>
                )}
              </div>
            </PremiumCardContent>
          </PremiumCard>

          <PremiumCard className="glass-card">
            <PremiumCardHeader className="pb-2">
              <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Daily Completion Checklist
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="space-y-3">
              <button onClick={() => navigate("/attendance")} className="w-full text-left rounded-xl border border-border/50 bg-muted/10 px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">1. Capture learner attendance</p>
                  <StatusBadge status="In Progress" domain="observation" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Use the session/date workflow to keep progress and reporting aligned.</p>
              </button>
              <button onClick={() => navigate("/observations")} className="w-full text-left rounded-xl border border-border/50 bg-muted/10 px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">2. Record learner observations</p>
                  <StatusBadge status="In Progress" domain="observation" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Observation updates feed readiness, progress, and operational reviews.</p>
              </button>
              <button onClick={() => navigate("/progress")} className="w-full text-left rounded-xl border border-border/50 bg-muted/10 px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">3. Review readiness and transitions</p>
                  <StatusBadge status={insights.complianceSummary.status} domain="compliance" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {insights.complianceSummary.coveragePct}% readiness/compliance coverage across your current cohorts.
                </p>
              </button>
              <button onClick={() => navigate("/certifications")} className="w-full text-left rounded-xl border border-border/50 bg-muted/10 px-4 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">4. Keep leave and certifications current</p>
                  <StatusBadge
                    status={insights.expiringCertificationCount > 0 ? "Needs Attention" : "On Track"}
                    domain="performance"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {insights.expiringCertificationCount} certification item(s) currently need follow-up.
                </p>
              </button>
            </PremiumCardContent>
          </PremiumCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OperationalAlertsCard alerts={insights.alerts} navigate={navigate} />
          <RecentActivityCard activity={recentActivity} />
        </div>
      </div>
    </DashboardShell>
  );
}

export default function Dashboard() {
  const user = useAppStore((state) => state.user);
  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";
  return isSupervisor ? <SupervisorDashboard /> : <TrainerDashboard />;
}
