import React, { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Hero } from "@/components/learning/Hero";
import { CourseCard } from "@/components/learning/CourseCard";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, PlusCircle, ArrowRight, Users, Activity, CalendarDays, ClipboardCheck, Eye, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, startOfDay } from "date-fns";
import { api } from "@/data/api";
import { toast } from "sonner";

const normalizeId = (value) => (value === undefined || value === null ? "" : String(value));

const mapTrainerRecord = (trainer) => ({
  id: normalizeId(trainer.id),
  portalId: trainer.portalid || trainer.portalId || "",
  email: trainer.emailid || trainer.email || "",
  name:
    trainer.full_name ||
    trainer.name ||
    `${trainer.first_name || trainer.firstName || ""} ${trainer.last_name || trainer.lastName || ""}`.trim(),
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
  if (!training?.startDate || !training?.endDate) {
    return training?.status || "Upcoming";
  }

  const today = startOfDay(new Date());
  const startDate = startOfDay(new Date(`${training.startDate}T00:00:00`));
  const endDate = startOfDay(new Date(`${training.endDate}T00:00:00`));

  if (endDate < today) {
    return "Completed";
  }

  if (startDate > today) {
    return "Upcoming";
  }

  return "Ongoing";
};

const deriveTrainingStudentCount = (training, sessions) => {
  if (Number(training?.studentCount || 0) > 0) {
    return Number(training.studentCount || 0);
  }

  const relatedSessions = sessions.filter((session) =>
    String(session.scheduledTrainingId) === String(training.id) ||
    String(session.trainingId) === String(training.id)
  );

  if (relatedSessions.length === 0) {
    return 0;
  }

  return Math.max(...relatedSessions.map((session) => Array.isArray(session.studentIds) ? session.studentIds.length : 0));
};

const enrichTrainingRecords = (trainings, sessions) =>
  trainings.map((training) => ({
    ...training,
    status: deriveTrainingStatus(training),
    studentCount: deriveTrainingStudentCount(training, sessions),
  }));

function DashboardShell({ isLoadingData, fetchError, children }) {
  if (isLoadingData) {
    return <p className="text-sm text-muted-foreground">Loading data...</p>;
  }

  if (fetchError) {
    return <p className="text-sm text-destructive">Error in fetching data</p>;
  }

  return children;
}

function SupervisorDashboard() {
  const navigate = useNavigate();
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [scheduledTrainings, setScheduledTrainings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        if (isMounted) {
          setIsLoadingData(true);
          setFetchError(false);
        }

        const [summaryResponse, trainersResponse, trainingsResponse, sessionsResponse] = await Promise.all([
          api.dashboard.summary(),
          api.trainers.list(),
          api.scheduledTrainings.list(),
          api.scheduledTrainings.sessions(),
        ]);

        if (!isMounted) {
          return;
        }

        setDashboardSummary(summaryResponse);
        setTrainers(Array.isArray(trainersResponse?.trainers) ? trainersResponse.trainers.map(mapTrainerRecord) : []);
        setScheduledTrainings(
          Array.isArray(trainingsResponse?.scheduled_trainings)
            ? trainingsResponse.scheduled_trainings.map(mapTrainingRecord)
            : []
        );
        setSessions(Array.isArray(sessionsResponse?.sessions) ? sessionsResponse.sessions.map(mapSessionRecord) : []);
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
        toast.error(error?.message || "Failed to load dashboard summary.");
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const trainerProgramCounts = useMemo(() => {
    const counts = new Map();
    scheduledTrainings.forEach((training) => {
      counts.set(training.trainerId, (counts.get(training.trainerId) || 0) + 1);
    });
    return counts;
  }, [scheduledTrainings]);

  const supervisorStats = {
    trainers: trainers.length,
    programs: Number(dashboardSummary?.training_program_count || scheduledTrainings.length),
    sessions: Number(dashboardSummary?.training_session_count || 0),
    students: Number(dashboardSummary?.student_count || 0),
  };

  const upcomingTrainings = useMemo(() => {
    const summaryUpcoming = Array.isArray(dashboardSummary?.upcoming_trainings)
      ? dashboardSummary.upcoming_trainings.map(mapTrainingRecord)
      : [];

    const apiUpcoming = summaryUpcoming.length > 0 ? summaryUpcoming : scheduledTrainings;
    return enrichTrainingRecords(apiUpcoming, sessions).filter(
      (training) => training.status === "Upcoming" || training.status === "Ongoing"
    );
  }, [dashboardSummary?.upcoming_trainings, scheduledTrainings, sessions]);

  return (
    <DashboardShell isLoadingData={isLoadingData} fetchError={fetchError}>
      <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-700">
        <Hero
          badge="Supervisor Overview"
          title="Training Command Center"
          description="Monitor all trainers, classes, and performance across the organization."
          actions={
            <>
              <Button className="rounded-full px-6 bg-primary hover:bg-primary/90" onClick={() => navigate("/trainer-form")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Trainer
              </Button>
              <Button variant="outline" className="rounded-full px-6" onClick={() => navigate("/calendar")}>
                View Calendar
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Trainers", value: supervisorStats.trainers, icon: Users, color: "text-primary bg-primary/10", link: "/trainer-form" },
            { label: "Active Programs", value: supervisorStats.programs, icon: Activity, color: "text-emerald-600 bg-emerald-100", link: "/progress", emptyMsg: "No active programs available" },
            { label: "Upcoming Sessions", value: supervisorStats.sessions, icon: CalendarDays, color: "text-amber-600 bg-amber-100", link: "/calendar" },
            { label: "Total Students", value: supervisorStats.students, icon: Users, color: "text-purple-600 bg-purple-100", link: "/students" },
          ].map(({ label, value, icon: Icon, color, link, emptyMsg }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => { if (emptyMsg && value === 0) { toast.info(emptyMsg); return; } navigate(link); }}>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-black">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <PremiumCard className="glass-card">
              <PremiumCardHeader className="pb-2">
                <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" /> Trainer Overview
                </PremiumCardTitle>
              </PremiumCardHeader>
              <PremiumCardContent>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                  {trainers.map((trainer) => (
                    <div key={trainer.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => navigate("/progress")}>
                      <div className="h-3 w-3 rounded-full shrink-0 bg-primary/50" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{trainer.name}</p>
                        <p className="text-xs text-muted-foreground">{trainerProgramCounts.get(trainer.id) || 0} programs</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${trainer.status === "Active" ? "border-emerald-300 text-emerald-700" : ""}`}>
                        {trainer.status}
                      </Badge>
                    </div>
                  ))}
                  {trainers.length === 0 && (
                    <p className="text-sm text-muted-foreground italic text-center py-8">No trainers found</p>
                  )}
                </div>
              </PremiumCardContent>
            </PremiumCard>
          </div>

          <div className="lg:col-span-2">
            <PremiumCard className="glass-card">
              <PremiumCardHeader className="pb-2 flex flex-row items-center justify-between">
                <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Upcoming Trainings
                </PremiumCardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/calendar")}>
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </PremiumCardHeader>
              <PremiumCardContent>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                  {upcomingTrainings.map((training) => (
                    <div key={training.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors">
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
                  {upcomingTrainings.length === 0 && (
                    <p className="text-sm text-muted-foreground italic text-center py-8">No upcoming trainings</p>
                  )}
                </div>
              </PremiumCardContent>
            </PremiumCard>
          </div>
        </div>

        {/* Recent Activity */}
        <PremiumCard className="glass-card">
          <PremiumCardHeader className="pb-2">
            <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Activity
            </PremiumCardTitle>
          </PremiumCardHeader>
          <PremiumCardContent>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
              {[
                { action: "Trainer Added", user: "Admin", time: "2 hours ago", entity: "Sarah Wilson" },
                { action: "Leave Request Submitted", user: "John Doe", time: "3 hours ago", entity: "Apr 10-12, 2026" },
                { action: "Program Created", user: "Supervisor", time: "5 hours ago", entity: "Advanced React Training" },
                { action: "Attendance Submitted", user: "Jane Smith", time: "6 hours ago", entity: "Day 15 - Cohort A" },
                { action: "Observation Updated", user: "Mike Chen", time: "1 day ago", entity: "Student Performance Review" },
                { action: "Material Uploaded", user: "Admin", time: "1 day ago", entity: "Training Manual v2.0" },
                { action: "Certification Added", user: "HR System", time: "2 days ago", entity: "AWS Certification - Tom Lee" },
                { action: "Leave Approved", user: "Supervisor", time: "2 days ago", entity: "John Doe - Apr 10-12" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-primary/50 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.entity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">{item.user}</p>
                    <p className="text-[10px] text-muted-foreground">{item.time}</p>
                  </div>
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
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [scheduledTrainings, setScheduledTrainings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        if (isMounted) {
          setIsLoadingData(true);
          setFetchError(false);
        }

        const [summaryResponse, trainersResponse, trainingsResponse, sessionsResponse] = await Promise.all([
          api.dashboard.summary(),
          api.trainers.list(),
          api.scheduledTrainings.list(),
          api.scheduledTrainings.sessions(),
        ]);

        if (!isMounted) {
          return;
        }

        setDashboardSummary(summaryResponse);
        setTrainers(Array.isArray(trainersResponse?.trainers) ? trainersResponse.trainers.map(mapTrainerRecord) : []);
        setScheduledTrainings(
          Array.isArray(trainingsResponse?.scheduled_trainings)
            ? trainingsResponse.scheduled_trainings.map(mapTrainingRecord)
            : []
        );
        setSessions(Array.isArray(sessionsResponse?.sessions) ? sessionsResponse.sessions.map(mapSessionRecord) : []);
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
        toast.error(error?.message || "Failed to load dashboard summary.");
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const trainerId = useMemo(() => {
    const matchedTrainer = trainers.find((trainer) =>
      trainer.id === normalizeId(user?.trainerId || user?.id) ||
      String(trainer.portalId || "").toLowerCase() === String(user?.portalId || "").toLowerCase() ||
      String(trainer.email || "").toLowerCase() === String(user?.email || "").toLowerCase() ||
      String(trainer.name || "").toLowerCase() === String(user?.name || "").toLowerCase()
    );

    return normalizeId(matchedTrainer?.id || user?.trainerId || user?.id);
  }, [trainers, user]);

  const myScheduledTrainings = useMemo(
    () => scheduledTrainings.filter((training) => String(training.trainerId) === String(trainerId)),
    [scheduledTrainings, trainerId]
  );

  const myTrainings = useMemo(() => {
    const summaryPrograms = Array.isArray(dashboardSummary?.my_trainings) ? dashboardSummary.my_trainings.map(mapTrainingRecord) : [];
    const apiPrograms = myScheduledTrainings.length > 0 ? myScheduledTrainings : summaryPrograms;

    return enrichTrainingRecords(apiPrograms, sessions);
  }, [dashboardSummary?.my_trainings, myScheduledTrainings, sessions]);

  const upcomingSessions = useMemo(() => {
    const today = startOfDay(new Date());
    return sessions
      .filter((session) => String(session.trainerId) === String(trainerId))
      .filter((session) => session.date && startOfDay(new Date(`${session.date}T00:00:00`)) >= today)
      .sort((a, b) => new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`));
  }, [sessions, trainerId]);

  const trainerStats = {
    students: Number(dashboardSummary?.student_count || dashboardSummary?.active_student_count || 0),
    programs: myTrainings.length,
    sessions: Number(dashboardSummary?.training_session_count || upcomingSessions.length),
    activeStudents: Number(dashboardSummary?.active_student_count || 0),
  };

  return (
    <DashboardShell isLoadingData={isLoadingData} fetchError={fetchError}>
      <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-700">
        <Hero
          badge={`Welcome back, ${user?.name || "Trainer"}`}
          title="Your Training Workspace"
          description="Manage your classes, track student progress, and record daily observations."
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "My Students", value: trainerStats.students, icon: Users, color: "text-primary bg-primary/10", link: "/students" },
            { label: "Programs", value: trainerStats.programs, icon: Activity, color: "text-emerald-600 bg-emerald-100", link: "/performance" },
            { label: "Sessions", value: trainerStats.sessions, icon: CalendarDays, color: "text-amber-600 bg-amber-100", link: "/calendar" },
            { label: "Active Students", value: trainerStats.activeStudents, icon: CheckCircle, color: "text-purple-600 bg-purple-100", link: "/students" },
          ].map(({ label, value, icon: Icon, color, link }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(link)}>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-black">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <PremiumCard className="glass-card">
              <PremiumCardHeader className="pb-2">
                <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Upcoming Sessions</PremiumCardTitle>
              </PremiumCardHeader>
              <PremiumCardContent>
                {upcomingSessions.length > 0 ? (
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                    {upcomingSessions.map((session) => (
                      <div key={session.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col items-center bg-primary/10 rounded-xl p-3 shrink-0">
                          <span className="text-xs font-bold text-primary uppercase">{session.date ? format(new Date(`${session.date}T00:00:00`), "MMM") : "-"}</span>
                          <span className="text-xl font-black text-primary">{session.date ? format(new Date(`${session.date}T00:00:00`), "d") : "-"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{session.title}</p>
                          <p className="text-xs text-muted-foreground">{session.startTime} - {session.endTime} - {session.location}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">{session.studentIds.length} students</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-center py-8">No upcoming sessions</p>
                )}
              </PremiumCardContent>
            </PremiumCard>

            <PremiumCard className="glass-card">
              <PremiumCardHeader className="pb-2 flex flex-row items-center justify-between">
                <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">My Programs</PremiumCardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/performance")}>
                  View Timeline <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </PremiumCardHeader>
              <PremiumCardContent>
                <div className="max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myTrainings.map((training) => (
                      <CourseCard
                        key={training.id}
                        title={training.title}
                        description={`${training.courseCode} - ${training.startDate} to ${training.endDate}`}
                        progress={training.status === "Completed" ? 100 : training.status === "Ongoing" ? 50 : 0}
                        studentsCount={training.studentCount}
                        capacity={training.capacity || training.studentCount}
                        nextSession={training.status}
                        onClick={() => navigate("/calendar")}
                      />
                    ))}
                  </div>
                </div>
                {myTrainings.length === 0 && (
                  <p className="text-muted-foreground italic text-center py-8">No programs found</p>
                )}
              </PremiumCardContent>
            </PremiumCard>
          </div>

          <div className="space-y-6">
            <PremiumCard className="glass-card">
              <PremiumCardHeader className="pb-2">
                <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Quick Actions</PremiumCardTitle>
              </PremiumCardHeader>
              <PremiumCardContent>
                <div className="space-y-2">
                  {[
                    { label: "Mark Attendance", icon: ClipboardCheck, link: "/attendance" },
                    { label: "Add Observations", icon: Eye, link: "/observations" },
                    { label: "View Students", icon: Users, link: "/students" },
                    { label: "My Performance", icon: Activity, link: "/performance" },
                  ].map(({ label, icon: Icon, link }) => (
                    <Button key={label} variant="ghost" className="w-full justify-start gap-3 h-11" onClick={() => navigate(link)}>
                      <Icon className="h-4 w-4 text-primary" />
                      {label}
                    </Button>
                  ))}
                </div>
              </PremiumCardContent>
            </PremiumCard>
          </div>
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
