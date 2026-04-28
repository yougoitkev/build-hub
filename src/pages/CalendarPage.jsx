import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/app-store";
import { TRAINER_COLORS } from "@/lib/mock-data";
import { PageHeader } from "@/components/layout/PageHeader";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Users, Clock, AlertTriangle, MapPinned } from "lucide-react";
import { format, addDays, startOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isValid, getWeekOfMonth } from "date-fns";
import { toast } from "sonner";
import { api } from "@/data/api";
import { detectScheduleConflicts } from "@/lib/tms-insights";
import { buildRoomUsageRows } from "@/lib/reporting";

const normalizeId = (value) => (value === undefined || value === null ? "" : String(value));

const mapTrainerRecord = (trainer) => ({
  id: normalizeId(trainer.id),
  portalId: trainer.portalid || trainer.portalId || "",
  email: trainer.emailid || trainer.email || "",
  name:
    trainer.full_name ||
    trainer.name ||
    `${trainer.first_name || trainer.firstName || ""} ${trainer.last_name || trainer.lastName || ""}`.trim(),
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
  sessionNo: session.session_no || session.sessionNo || null,
  notes: session.notes || "",
  studentIds: Array.isArray(session.student_ids) ? session.student_ids.map((id) => normalizeId(id)) : session.studentIds || [],
});

// Auto-assign colors to trainers dynamically
const DYNAMIC_COLORS = [
  { bg: "bg-blue-500", text: "text-blue-700", light: "bg-blue-100", border: "border-blue-300", hex: "#3b82f6" },
  { bg: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-100", border: "border-emerald-300", hex: "#10b981" },
  { bg: "bg-purple-500", text: "text-purple-700", light: "bg-purple-100", border: "border-purple-300", hex: "#8b5cf6" },
  { bg: "bg-amber-500", text: "text-amber-700", light: "bg-amber-100", border: "border-amber-300", hex: "#f59e0b" },
  { bg: "bg-rose-500", text: "text-rose-700", light: "bg-rose-100", border: "border-rose-300", hex: "#f43f5e" },
  { bg: "bg-cyan-500", text: "text-cyan-700", light: "bg-cyan-100", border: "border-cyan-300", hex: "#06b6d4" },
  { bg: "bg-orange-500", text: "text-orange-700", light: "bg-orange-100", border: "border-orange-300", hex: "#f97316" },
  { bg: "bg-indigo-500", text: "text-indigo-700", light: "bg-indigo-100", border: "border-indigo-300", hex: "#6366f1" },
];

const getPhaseLabel = (session) => {
  const label = `${session.title || ""} ${session.notes || ""}`.toLowerCase();
  if (label.includes("nest")) return "Nesting";
  if (label.includes("class")) return "Classroom";
  if (label.includes("onboard")) return "Onboarding";
  return session.sessionNo ? `Day ${session.sessionNo}` : "Scheduled";
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAppStore((s) => s.user);
  const today = useMemo(() => new Date(), []);
  const requestedDate = searchParams.get("date");
  const requestedView = searchParams.get("view");
  const selectedSessionId = normalizeId(searchParams.get("sessionId"));
  const initialDate = useMemo(() => {
    if (!requestedDate) return today;
    const parsed = parseISO(requestedDate);
    return isValid(parsed) ? parsed : today;
  }, [requestedDate, today]);

  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [view, setView] = useState(
    requestedView === "day" || requestedView === "week" || requestedView === "month" ? requestedView : "week"
  );
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [sessions, setSessions] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => { setCurrentDate(initialDate); }, [initialDate]);
  useEffect(() => {
    if (requestedView === "day" || requestedView === "week" || requestedView === "month") setView(requestedView);
  }, [requestedView]);

  useEffect(() => {
    let isMounted = true;
    const loadCalendarData = async () => {
      if (isMounted) { setIsLoadingData(true); setFetchError(false); }
      const query = {
        from: format(subMonths(currentDate, 1), "yyyy-MM-dd"),
        to: format(addMonths(currentDate, 2), "yyyy-MM-dd"),
      };
      const results = await Promise.allSettled([api.scheduledTrainings.sessions(query), api.trainers.list()]);
      if (!isMounted) return;
      const [sessionsResult, trainersResult] = results;
      if (results.some((r) => r.status === "rejected")) {
        setSessions([]); setTrainers([]); setFetchError(true); setIsLoadingData(false);
        toast.error("Failed to load calendar data."); return;
      }
      setSessions(Array.isArray(sessionsResult.value?.sessions) ? sessionsResult.value.sessions.map(mapSessionRecord) : []);
      setTrainers(Array.isArray(trainersResult.value?.trainers) ? trainersResult.value.trainers.map(mapTrainerRecord) : []);
      setIsLoadingData(false);
    };
    loadCalendarData();
    return () => { isMounted = false; };
  }, [currentDate]);

  // Build dynamic color map for trainers
  const trainerColorMap = useMemo(() => {
    const map = {};
    trainers.forEach((t, i) => {
      map[t.id] = TRAINER_COLORS[t.id] || DYNAMIC_COLORS[i % DYNAMIC_COLORS.length];
    });
    return map;
  }, [trainers]);

  const trainerId = useMemo(() => {
    const matchedTrainer = trainers.find((trainer) =>
      trainer.id === normalizeId(user?.trainerId || user?.id) ||
      String(trainer.portalId || "").toLowerCase() === String(user?.portalId || "").toLowerCase() ||
      String(trainer.email || "").toLowerCase() === String(user?.email || "").toLowerCase() ||
      String(trainer.name || "").toLowerCase() === String(user?.name || "").toLowerCase()
    );
    return normalizeId(matchedTrainer?.id || user?.trainerId || user?.id);
  }, [trainers, user]);

  const filteredSessions = useMemo(() => {
    let s = sessions;
    if (!isSupervisor) s = s.filter((sess) => String(sess.trainerId) === String(trainerId));
    if (trainerFilter !== "all") s = s.filter((sess) => String(sess.trainerId) === String(trainerFilter));
    return s;
  }, [sessions, isSupervisor, trainerId, trainerFilter]);

  const handleDateNavigate = (dir) => {
    if (view === "month") setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(dir > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, dir));
  };

  // Week navigation helpers
  const currentWeekOfMonth = getWeekOfMonth(currentDate, { weekStartsOn: 1 });
  const goToWeek = (weekNum) => {
    const monthStart = startOfMonth(currentDate);
    const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const targetDate = addWeeks(firstWeekStart, weekNum - 1);
    setCurrentDate(targetDate);
    setView("week");
  };

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const allDays = eachDayOfInterval({ start, end });
    const startPad = start.getDay() === 0 ? 6 : start.getDay() - 1;
    const padded = Array.from({ length: startPad }, (_, i) => addDays(start, -(startPad - i)));
    return [...padded, ...allDays];
  }, [currentDate]);

  const getSessionsForDate = (date) =>
    filteredSessions.filter((s) => isSameDay(new Date(s.date + "T00:00:00"), date));

  const getSessionColor = (session) => {
    const color = trainerColorMap[session.trainerId];
    if (!color) return { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" };
    return { bg: color.light, text: color.text, border: color.border };
  };

  const isSelectedSession = (session) => String(session.id) === String(selectedSessionId);

  const todaySessions = useMemo(() => getSessionsForDate(today), [filteredSessions, today]);
  const roomUsageRows = useMemo(() => buildRoomUsageRows({ sessions: filteredSessions }), [filteredSessions]);
  const scheduleConflicts = useMemo(() => detectScheduleConflicts(filteredSessions), [filteredSessions]);

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto">
      <PageHeader
        icon={CalendarIcon}
        eyebrow="Scheduling"
        title={isSupervisor ? "All Classes" : "My Calendar"}
        description={isSupervisor ? "View all trainer classes across the organization" : "Your scheduled training sessions"}
        meta={
          <>
            <div className="rounded-full border border-primary/10 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {filteredSessions.length} sessions in view
            </div>
            <Badge variant="outline" className={scheduleConflicts.length ? "border-rose-500/20 bg-rose-500/10 text-rose-700" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"}>
              {scheduleConflicts.length ? `${scheduleConflicts.length} conflicts detected` : "No schedule conflicts"}
            </Badge>
          </>
        }
        actions={
          <>
            {isSupervisor && (
              <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                <SelectTrigger className="w-[180px] rounded-full bg-background"><SelectValue placeholder="All Trainers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trainers</SelectItem>
                  {trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button className="rounded-full px-6 flex-1 md:flex-none" onClick={() => navigate('/create-program')}>
              <Plus className="h-4 w-4 mr-2" /> Schedule Training
            </Button>
          </>
        }
      />

      {isLoadingData && <p className="text-sm text-muted-foreground">Loading data...</p>}
      {!isLoadingData && fetchError && <p className="text-sm text-destructive">Error in fetching data</p>}

      {!isLoadingData && !fetchError && (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <PremiumCard className="overflow-hidden">
            <PremiumCardHeader className="bg-muted/10 border-b border-border/50 p-4 sm:px-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleDateNavigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleDateNavigate(1)}><ChevronRight className="h-4 w-4" /></Button>
                  <h2 className="text-lg font-bold min-w-[180px] ml-2">
                    {view === "day" ? format(currentDate, "MMMM d, yyyy") :
                      view === "week" ? `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}` :
                        format(currentDate, "MMMM yyyy")}
                  </h2>
                  <Button variant="ghost" size="sm" className="text-xs ml-2" onClick={() => { setCurrentDate(today); }}>
                    Today
                  </Button>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Week quick-switch buttons */}
                  {view === "week" && (
                    <div className="flex gap-1 mr-2">
                      {[1, 2, 3, 4, 5].map(w => (
                        <Button
                          key={w}
                          variant={currentWeekOfMonth === w ? "secondary" : "ghost"}
                          size="sm"
                          className={`text-[10px] h-7 px-2 ${currentWeekOfMonth === w ? "bg-primary/10 text-primary font-bold" : ""}`}
                          onClick={() => goToWeek(w)}
                        >
                          W{w}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1 bg-muted/50 rounded-lg p-1 border border-border/50 flex-1 sm:flex-none">
                    {["month", "week", "day"].map((v) => (
                      <Button key={v} variant={view === v ? "secondary" : "ghost"} size="sm" onClick={() => setView(v)} className={`text-xs capitalize flex-1 sm:flex-none ${view === v ? 'bg-background shadow-sm' : ''}`}>
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0 sm:p-4 bg-muted/5">
              {view === "week" && (
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {weekDays.map((day) => {
                    const daySessions = getSessionsForDate(day);
                    const isToday = isSameDay(day, today);
                    return (
                      <div key={day.toISOString()} className={`bg-card min-h-[160px] p-2 sm:p-3 rounded-xl border transition-all ${isToday ? "border-primary shadow-md ring-2 ring-primary/20" : "border-border/50 hover:border-primary/30"}`}>
                        <div className={`text-xs font-bold mb-3 flex flex-col items-center ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                          <span className="uppercase tracking-wider text-[10px] sm:text-xs mb-1">{format(day, "EEE")}</span>
                          <span className={`inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-full text-sm ${isToday ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground"}`}>
                            {format(day, "d")}
                          </span>
                        </div>
                        <div className="space-y-1.5 min-h-[50px]">
                          {daySessions.map((s) => {
                            const c = getSessionColor(s);
                            return (
                              <div key={s.id} className={`text-xs p-2 rounded-lg border cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all ${c.bg} ${c.text} ${c.border} ${isSelectedSession(s) ? "ring-2 ring-primary/40 shadow-md" : ""}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-bold truncate">{s.title}</p>
                                  <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {getPhaseLabel(s)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-medium opacity-80 mt-1">
                                  <span>{s.startTime}</span>
                                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{s.studentIds.length}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {view === "month" && (
                <div className="grid grid-cols-7 gap-px sm:gap-1 bg-border/20 sm:bg-transparent rounded-xl overflow-hidden sm:rounded-none">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="bg-muted/30 p-2 sm:p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">{d}</div>
                  ))}
                  {monthDays.map((day) => {
                    const daySessions = getSessionsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, today);
                    return (
                      <div key={day.toISOString()} className={`bg-card min-h-[100px] p-2 sm:rounded-lg border transition-all hover:border-primary/30 ${isCurrentMonth ? (isToday ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 sm:border-transparent") : "opacity-40 border-transparent bg-muted/10"}`}>
                        <div className="flex justify-end mb-1">
                          <span className={`text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                            {format(day, "d")}
                          </span>
                        </div>
                        <div className="space-y-1 min-h-[40px]">
                          {daySessions.slice(0, 4).map((s) => {
                            const c = getSessionColor(s);
                            return (
                              <div key={s.id} className={`text-[10px] font-medium p-1 sm:px-1.5 rounded-md truncate cursor-pointer hover:shadow-sm transition-all ${c.bg} ${c.text} ${isSelectedSession(s) ? "ring-2 ring-primary/40" : ""}`}>
                                {s.title.split(" - ")[0]}
                              </div>
                            );
                          })}
                          {daySessions.length > 4 && <div className="text-[10px] font-semibold text-muted-foreground px-1 float-right">+{daySessions.length - 4}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {view === "day" && (
                <div className="space-y-4 max-w-3xl mx-auto py-4">
                  {getSessionsForDate(currentDate).length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-semibold text-foreground">No sessions scheduled</p>
                    </div>
                  )}
                  {getSessionsForDate(currentDate).map((s) => {
                    const c = getSessionColor(s);
                    return (
                      <div key={s.id} className={`flex flex-col sm:flex-row gap-4 sm:gap-6 p-5 rounded-2xl border bg-card hover:border-primary/20 hover:shadow-md transition-all ${isSelectedSession(s) ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border/50"}`}>
                        <div className={`sm:w-32 shrink-0 border-l-4 ${c.border} pl-4 py-1 flex flex-col justify-center`}>
                          <p className="text-sm font-bold text-foreground">{s.startTime}</p>
                          <p className="text-sm font-medium text-muted-foreground">{s.endTime}</p>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-foreground mb-1">{s.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-3">
                            <span className="flex items-center"><Users className="h-3.5 w-3.5 mr-1" /> {s.trainerName}</span>
                            <span>·</span>
                            <span>{s.location}</span>
                            <span>·</span>
                            <span>{getPhaseLabel(s)}</span>
                          </div>
                          {s.notes && <p className="text-sm text-foreground/80 bg-muted/30 p-3 rounded-lg">{s.notes}</p>}
                          <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              <span className="text-foreground">{s.studentIds.length}</span> Enrolled
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </PremiumCardContent>
          </PremiumCard>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Trainer Legend - Scrollable */}
          {isSupervisor && (
            <PremiumCard className="bg-card">
              <PremiumCardHeader className="pb-2 border-b border-border/50">
                <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" /> Trainer Legend
                </PremiumCardTitle>
              </PremiumCardHeader>
              <PremiumCardContent className="p-0">
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1 p-4">
                    {trainers.map((trainer) => {
                      const color = trainerColorMap[trainer.id];
                      const trainerSessionCount = sessions.filter((s) => s.trainerId === trainer.id).length;
                      return (
                        <div
                          key={trainer.id}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer hover:-translate-y-0.5 ${trainerFilter === trainer.id ? "border-primary bg-primary/5 shadow-sm" : "border-transparent hover:bg-muted/20"}`}
                          onClick={() => setTrainerFilter(trainerFilter === trainer.id ? "all" : trainer.id)}
                        >
                          <div className={`h-3.5 w-3.5 rounded-full shrink-0 ${color?.bg || "bg-muted"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{trainer.name}</p>
                            <p className="text-[10px] text-muted-foreground">{trainerSessionCount} sessions</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </PremiumCardContent>
            </PremiumCard>
          )}

          {/* Today's Sessions Panel */}
          <PremiumCard>
            <PremiumCardHeader className="pb-2 border-b border-border/50">
              <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" /> Today's Sessions
                {todaySessions.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-[10px] h-5">{todaySessions.length}</Badge>
                )}
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <ScrollArea className="h-[280px]">
                {todaySessions.length > 0 ? (
                  <div className="space-y-1.5 p-4">
                    {todaySessions.map((s) => {
                      const c = getSessionColor(s);
                      return (
                        <div
                          key={s.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${c.bg} ${c.border} ${isSelectedSession(s) ? "ring-2 ring-primary/30 shadow-md" : ""}`}
                          onClick={() => {
                            setCurrentDate(today);
                            setView("day");
                          }}
                        >
                          <p className={`font-bold text-sm truncate ${c.text}`}>{s.title}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] font-medium text-muted-foreground">{s.startTime} – {s.endTime}</span>
                            <span className="text-[10px] font-medium text-muted-foreground">{s.trainerName}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{s.studentIds.length} enrolled</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground italic">No sessions today</p>
                  </div>
                )}
              </ScrollArea>
            </PremiumCardContent>
          </PremiumCard>

          <PremiumCard>
            <PremiumCardHeader className="pb-2 border-b border-border/50">
              <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPinned className="h-4 w-4" /> Room Usage
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="p-4 space-y-2">
              {roomUsageRows.length ? roomUsageRows.slice(0, 6).map((room) => (
                <div key={room.room} className="rounded-xl border border-border/50 bg-muted/10 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{room.room}</p>
                    <span className="text-xs text-muted-foreground">{room.sessions} sessions</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {room.cohorts} cohorts • {room.activeDates} active dates
                  </p>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No room usage data is available for the current filter.</p>
              )}
            </PremiumCardContent>
          </PremiumCard>

          <PremiumCard>
            <PremiumCardHeader className="pb-2 border-b border-border/50">
              <PremiumCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Conflict Watch
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="p-4 space-y-2">
              {scheduleConflicts.length ? scheduleConflicts.slice(0, 4).map((conflict) => (
                <div key={conflict.id} className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2">
                  <p className="text-sm font-semibold text-rose-700">{conflict.title}</p>
                  <p className="mt-1 text-xs text-rose-700/80">{conflict.detail}</p>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">Trainer and room schedules are currently conflict-free.</p>
              )}
            </PremiumCardContent>
          </PremiumCard>
        </div>
      </div>
      )}
    </div>
  );
}
