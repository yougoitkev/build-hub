import React, { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Hero } from "@/components/learning/Hero";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  CheckCircle, PlusCircle, ArrowRight, Users, Activity, CalendarDays,
  ClipboardCheck, Eye, Shield, CalendarOff, BarChart3, Network, Grid3X3,
  ListTodo, FileText, Award, History, UserCog, FolderOpen, BookOpen,
  TrendingUp, Clock, AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, startOfDay } from "date-fns";
import { api } from "@/data/api";
import { toast } from "sonner";

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
  title: session.title || "",
  date: session.session_date || session.date || "",
  startTime: session.start_time || session.startTime || "--",
  endTime: session.end_time || session.endTime || "--",
  location: session.location || "TBD",
  studentIds: Array.isArray(session.student_ids) ? session.student_ids : session.studentIds || [],
});

const deriveTrainingStatus = (training) => {
  if (!training?.startDate || !training?.endDate) return training?.status || "Upcoming";
  const today = startOfDay(new Date());
  const startDate = startOfDay(new Date(`${training.startDate}T00:00:00`));
  const endDate = startOfDay(new Date(`${training.endDate}T00:00:00`));
  if (endDate < today) return "Completed";
  if (startDate > today) return "Upcoming";
  return "Ongoing";
};

const deriveTrainingStudentCount = (training, sessions) => {
  if (Number(training?.studentCount || 0) > 0) return Number(training.studentCount || 0);
  const relatedSessions = sessions.filter((s) =>
    String(s.scheduledTrainingId) === String(training.id) || String(s.trainingId) === String(training.id)
  );
  if (relatedSessions.length === 0) return 0;
  return Math.max(...relatedSessions.map((s) => Array.isArray(s.studentIds) ? s.studentIds.length : 0));
};

const enrichTrainingRecords = (trainings, sessions) =>
  trainings.map((t) => ({ ...t, status: deriveTrainingStatus(t), studentCount: deriveTrainingStudentCount(t, sessions) }));

function DashboardShell({ isLoadingData, fetchError, children }) {
  if (isLoadingData) return <div className="flex items-center justify-center h-64"><div className="flex flex-col items-center gap-3"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /><p className="text-sm text-muted-foreground">Loading dashboard...</p></div></div>;
  if (fetchError) return <p className="text-sm text-destructive">Error loading data</p>;
  return children;
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
        if (isMounted) { setIsLoadingData(true); setFetchError(false); }
        const [summary, trainersRes, trainingsRes, sessionsRes] = await Promise.all([
          api.dashboard.summary(), api.trainers.list(), api.scheduledTrainings.list(), api.scheduledTrainings.sessions(),
        ]);
        if (!isMounted) return;
        setDashboardSummary(summary);
        setTrainers(Array.isArray(trainersRes?.trainers) ? trainersRes.trainers.map(mapTrainerRecord) : []);
        setScheduledTrainings(Array.isArray(trainingsRes?.scheduled_trainings) ? trainingsRes.scheduled_trainings.map(mapTrainingRecord) : []);
        setSessions(Array.isArray(sessionsRes?.sessions) ? sessionsRes.sessions.map(mapSessionRecord) : []);
        setIsLoadingData(false);
      } catch (error) {
        if (isMounted) { setDashboardSummary(null); setTrainers([]); setScheduledTrainings([]); setSessions([]); setFetchError(true); setIsLoadingData(false); }
        toast.error(error?.message || "Failed to load dashboard.");
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  return { dashboardSummary, trainers, scheduledTrainings, sessions, isLoadingData, fetchError };
}

function SupervisorDashboard() {
  const navigate = useNavigate();
  const { dashboardSummary, trainers, scheduledTrainings, sessions, isLoadingData, fetchError } = useDashboardData();

  const trainerProgramCounts = useMemo(() => {
    const counts = new Map();
    scheduledTrainings.forEach((t) => counts.set(t.trainerId, (counts.get(t.trainerId) || 0) + 1));
    return counts;
  }, [scheduledTrainings]);

  const stats = {
    trainers: trainers.length,
    programs: Number(dashboardSummary?.training_program_count || scheduledTrainings.length),
    sessions: Number(dashboardSummary?.training_session_count || 0),
    students: Number(dashboardSummary?.student_count || 0),
  };

  const upcomingTrainings = useMemo(() => {
    const summaryUpcoming = Array.isArray(dashboardSummary?.upcoming_trainings) ? dashboardSummary.upcoming_trainings.map(mapTrainingRecord) : [];
    const apiUpcoming = summaryUpcoming.length > 0 ? summaryUpcoming : scheduledTrainings;
    return enrichTrainingRecords(apiUpcoming, sessions).filter((t) => t.status === "Upcoming" || t.status === "Ongoing");
  }, [dashboardSummary?.upcoming_trainings, scheduledTrainings, sessions]);

  const supervisorQuickActions = [
    { label: "Manage Trainers", description: "Add, edit, view all trainers", icon: UserCog, link: "/trainers", color: "text-primary bg-primary/10" },
    { label: "Manage Supervisors", description: "Create supervisor profiles", icon: Shield, link: "/supervisors", color: "text-violet-600 bg-violet-100" },
    { label: "Students", description: "View all student records", icon: Users, link: "/students", color: "text-indigo-600 bg-indigo-100" },
    { label: "Org Chart", description: "Reporting hierarchy", icon: Network, link: "/org-chart", color: "text-teal-600 bg-teal-100" },
    { label: "Calendar", description: "Schedules & sessions", icon: CalendarDays, link: "/calendar", color: "text-amber-600 bg-amber-100" },
    { label: "Trainer Attendance", description: "Daily trainer attendance view", icon: ClipboardCheck, link: "/trainer-attendance", color: "text-emerald-600 bg-emerald-100" },
    { label: "Leave Requests", description: "Review and approve time off", icon: CalendarOff, link: "/leave-requests", color: "text-amber-600 bg-amber-100" },
    { label: "Observations", description: "Trainer performance surveys", icon: Eye, link: "/trainer-observations", color: "text-rose-600 bg-rose-100" },
    { label: "Utilization", description: "Billed vs available hours", icon: BarChart3, link: "/trainer-utilization", color: "text-cyan-600 bg-cyan-100" },
    { label: "Skills Matrix", description: "Trainer competency grid", icon: Grid3X3, link: "/skills-matrix", color: "text-orange-600 bg-orange-100" },
    { label: "Progress", description: "Student milestone tracking", icon: TrendingUp, link: "/progress", color: "text-lime-600 bg-lime-100" },
    { label: "Tasks", description: "Assignments & follow-ups", icon: ListTodo, link: "/tasks", color: "text-sky-600 bg-sky-100" },
    { label: "Materials", description: "Training documents", icon: FileText, link: "/materials", color: "text-slate-600 bg-slate-100" },
    { label: "Certifications", description: "Expiry tracking & uploads", icon: Award, link: "/certifications", color: "text-yellow-600 bg-yellow-100" },
    { label: "Audit Trail", description: "System activity logs", icon: History, link: "/audit", color: "text-gray-600 bg-gray-100" },
    { label: "Reports", description: "Export & analytics", icon: FolderOpen, link: "/reports", color: "text-purple-600 bg-purple-100" },
  ];

  return (
    <DashboardShell isLoadingData={isLoadingData} fetchError={fetchError}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <Hero
          badge="Supervisor Overview"
          title="Training Command Center"
          description="Monitor trainers, programs, and performance across the organization."
          actions={
            <>
              <Button className="rounded-full px-6 bg-primary hover:bg-primary/90" onClick={() => navigate("/trainers")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Trainer
              </Button>
              <Button variant="outline" className="rounded-full px-6" onClick={() => navigate("/calendar")}>
                View Calendar
              </Button>
            </>
          }
        />

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Trainers" value={stats.trainers} icon={Users} color="text-primary bg-primary/10" link="/trainers" delay={0} />
          <StatCard label="Programs" value={stats.programs} icon={Activity} color="text-emerald-600 bg-emerald-100" link="/progress" delay={50} />
          <StatCard label="Sessions" value={stats.sessions} icon={CalendarDays} color="text-amber-600 bg-amber-100" link="/calendar" delay={100} />
          <StatCard label="Students" value={stats.students} icon={Users} color="text-purple-600 bg-purple-100" link="/students" delay={150} />
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {supervisorQuickActions.map((action, i) => (
              <QuickActionCard key={action.label} {...action} delay={i * 40} />
            ))}
          </div>
        </div>

        {/* Bottom Row: Trainers + Upcoming */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PremiumCard className="glass-card animate-fade-scale" style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
            <PremiumCardHeader className="pb-2">
              <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Trainer Overview
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                {trainers.map((trainer) => (
                  <div key={trainer.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => navigate("/trainers")}>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {trainer.name?.split(" ").map(n => n[0]).join("") || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{trainer.name}</p>
                      <p className="text-[11px] text-muted-foreground">{trainerProgramCounts.get(trainer.id) || 0} programs</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${trainer.status === "Active" ? "border-emerald-300 text-emerald-700" : ""}`}>
                      {trainer.status}
                    </Badge>
                  </div>
                ))}
                {trainers.length === 0 && <p className="text-sm text-muted-foreground italic text-center py-6">No trainers found</p>}
              </div>
            </PremiumCardContent>
          </PremiumCard>

          <div className="lg:col-span-2">
            <PremiumCard className="glass-card animate-fade-scale" style={{ animationDelay: "250ms", animationFillMode: "backwards" }}>
              <PremiumCardHeader className="pb-2 flex flex-row items-center justify-between">
                <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Upcoming Trainings
                </PremiumCardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/calendar")}>
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </PremiumCardHeader>
              <PremiumCardContent>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  {upcomingTrainings.map((training) => (
                    <div key={training.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="secondary" className="text-[10px]">{training.status}</Badge>
                          <span className="text-[10px] text-muted-foreground">{training.startDate || "-"}</span>
                        </div>
                        <p className="text-sm text-foreground/80">{training.title}</p>
                      </div>
                    </div>
                  ))}
                  {upcomingTrainings.length === 0 && <p className="text-sm text-muted-foreground italic text-center py-6">No upcoming trainings</p>}
                </div>
              </PremiumCardContent>
            </PremiumCard>
          </div>
        </div>

        {/* Recent Activity */}
        <PremiumCard className="glass-card animate-fade-scale" style={{ animationDelay: "300ms", animationFillMode: "backwards" }}>
          <PremiumCardHeader className="pb-2">
            <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Recent Activity
            </PremiumCardTitle>
          </PremiumCardHeader>
          <PremiumCardContent>
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
              {[
                { action: "Trainer Added", user: "Admin", time: "2h ago", entity: "Sarah Wilson" },
                { action: "Leave Request", user: "John Doe", time: "3h ago", entity: "Apr 10-12, 2026" },
                { action: "Program Created", user: "Supervisor", time: "5h ago", entity: "Advanced React" },
                { action: "Attendance Submitted", user: "Jane Smith", time: "6h ago", entity: "Day 15 - Cohort A" },
                { action: "Observation Updated", user: "Mike Chen", time: "1d ago", entity: "Performance Review" },
                { action: "Material Uploaded", user: "Admin", time: "1d ago", entity: "Manual v2.0" },
                { action: "Certification Added", user: "HR", time: "2d ago", entity: "AWS - Tom Lee" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/20 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-primary/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.action} — <span className="text-muted-foreground">{item.entity}</span></p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
          </PremiumCardContent>
        </PremiumCard>
      </div>
    </DashboardShell>
  );
}

function TrainerDashboard() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const { dashboardSummary, trainers, scheduledTrainings, sessions, isLoadingData, fetchError } = useDashboardData();

  const trainerId = useMemo(() => {
    const matched = trainers.find((t) =>
      t.id === normalizeId(user?.trainerId || user?.id) ||
      String(t.portalId || "").toLowerCase() === String(user?.portalId || "").toLowerCase() ||
      String(t.email || "").toLowerCase() === String(user?.email || "").toLowerCase() ||
      String(t.name || "").toLowerCase() === String(user?.name || "").toLowerCase()
    );
    return normalizeId(matched?.id || user?.trainerId || user?.id);
  }, [trainers, user]);

  const myScheduledTrainings = useMemo(() => scheduledTrainings.filter((t) => String(t.trainerId) === String(trainerId)), [scheduledTrainings, trainerId]);

  const myTrainings = useMemo(() => {
    const summaryPrograms = Array.isArray(dashboardSummary?.my_trainings) ? dashboardSummary.my_trainings.map(mapTrainingRecord) : [];
    const apiPrograms = myScheduledTrainings.length > 0 ? myScheduledTrainings : summaryPrograms;
    return enrichTrainingRecords(apiPrograms, sessions);
  }, [dashboardSummary?.my_trainings, myScheduledTrainings, sessions]);

  const upcomingSessions = useMemo(() => {
    const today = startOfDay(new Date());
    return sessions
      .filter((s) => String(s.trainerId) === String(trainerId))
      .filter((s) => s.date && startOfDay(new Date(`${s.date}T00:00:00`)) >= today)
      .sort((a, b) => new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`));
  }, [sessions, trainerId]);

  const trainerStats = {
    students: Number(dashboardSummary?.student_count || dashboardSummary?.active_student_count || 0),
    programs: myTrainings.length,
    sessions: Number(dashboardSummary?.training_session_count || upcomingSessions.length),
    activeStudents: Number(dashboardSummary?.active_student_count || 0),
  };

  const trainerQuickActions = [
    { label: "Mark Attendance", description: "Record daily attendance", icon: ClipboardCheck, link: "/attendance", color: "text-emerald-600 bg-emerald-100" },
    { label: "Add Observations", description: "Daily student ratings", icon: Eye, link: "/observations", color: "text-rose-600 bg-rose-100" },
    { label: "My Students", description: "View student profiles", icon: Users, link: "/students", color: "text-indigo-600 bg-indigo-100" },
    { label: "Request Leave", description: "Submit leave requests", icon: CalendarOff, link: "/leave-requests", color: "text-amber-600 bg-amber-100" },
    { label: "Schedule Training", description: "Create new program", icon: PlusCircle, link: "/create-program", color: "text-primary bg-primary/10" },
    { label: "My Calendar", description: "Sessions & schedule", icon: CalendarDays, link: "/calendar", color: "text-cyan-600 bg-cyan-100" },
    { label: "Progress", description: "Student milestones", icon: TrendingUp, link: "/progress", color: "text-lime-600 bg-lime-100" },
    { label: "Tasks", description: "Assignments & to-dos", icon: ListTodo, link: "/tasks", color: "text-sky-600 bg-sky-100" },
    { label: "Materials", description: "Training documents", icon: FileText, link: "/materials", color: "text-slate-600 bg-slate-100" },
    { label: "Certifications", description: "My certifications", icon: Award, link: "/certifications", color: "text-yellow-600 bg-yellow-100" },
  ];

  return (
    <DashboardShell isLoadingData={isLoadingData} fetchError={fetchError}>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <Hero
          badge={`Welcome back, ${user?.name || "Trainer"}`}
          title="Your Training Workspace"
          description="Manage classes, track students, and record daily observations."
          actions={
            <>
              <Button className="rounded-full px-6 bg-primary hover:bg-primary/90" onClick={() => navigate("/create-program")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Schedule Training
              </Button>
              <Button variant="outline" className="rounded-full px-6" onClick={() => navigate("/calendar")}>
                My Calendar
              </Button>
            </>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="My Students" value={trainerStats.students} icon={Users} color="text-primary bg-primary/10" link="/students" delay={0} />
          <StatCard label="Programs" value={trainerStats.programs} icon={Activity} color="text-emerald-600 bg-emerald-100" link="/progress" delay={50} />
          <StatCard label="Sessions" value={trainerStats.sessions} icon={CalendarDays} color="text-amber-600 bg-amber-100" link="/calendar" delay={100} />
          <StatCard label="Active" value={trainerStats.activeStudents} icon={CheckCircle} color="text-purple-600 bg-purple-100" link="/students" delay={150} />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {trainerQuickActions.map((action, i) => (
              <QuickActionCard key={action.label} {...action} delay={i * 40} />
            ))}
          </div>
        </div>

        {/* Sessions + Programs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PremiumCard className="glass-card animate-fade-scale" style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
            <PremiumCardHeader className="pb-2">
              <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Upcoming Sessions
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {upcomingSessions.length > 0 ? upcomingSessions.slice(0, 8).map((session) => (
                  <div key={session.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col items-center bg-primary/10 rounded-lg px-2.5 py-1.5 shrink-0">
                      <span className="text-[10px] font-bold text-primary uppercase">{session.date ? format(new Date(`${session.date}T00:00:00`), "MMM") : "-"}</span>
                      <span className="text-lg font-black text-primary leading-tight">{session.date ? format(new Date(`${session.date}T00:00:00`), "d") : "-"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{session.title}</p>
                      <p className="text-[11px] text-muted-foreground">{session.startTime} – {session.endTime} · {session.location}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{session.studentIds.length} students</Badge>
                  </div>
                )) : <p className="text-muted-foreground italic text-center py-6 text-sm">No upcoming sessions</p>}
              </div>
            </PremiumCardContent>
          </PremiumCard>

          <PremiumCard className="glass-card animate-fade-scale" style={{ animationDelay: "250ms", animationFillMode: "backwards" }}>
            <PremiumCardHeader className="pb-2 flex flex-row items-center justify-between">
              <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> My Programs
              </PremiumCardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/progress")}>
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </PremiumCardHeader>
            <PremiumCardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {myTrainings.length > 0 ? myTrainings.map((training) => (
                  <div key={training.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => navigate("/calendar")}>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{training.title}</p>
                      <p className="text-[11px] text-muted-foreground">{training.courseCode} · {training.studentCount} students</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{training.status}</Badge>
                  </div>
                )) : <p className="text-muted-foreground italic text-center py-6 text-sm">No programs found</p>}
              </div>
            </PremiumCardContent>
          </PremiumCard>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function Dashboard() {
  const user = useAppStore((s) => s.user);
  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";
  return isSupervisor ? <SupervisorDashboard /> : <TrainerDashboard />;
}
