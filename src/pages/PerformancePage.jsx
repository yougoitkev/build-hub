import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/app-store";
import { TRAINER_COLORS } from "@/lib/mock-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Users, CheckCircle2, Clock, Filter, CalendarDays, BarChart2, ChevronLeft, ChevronRight, LocateFixed } from "lucide-react";
import { format, addDays, differenceInDays, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, isSameDay } from "date-fns";
import { toast } from "sonner";
import { api } from "@/data/api";

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

const mapScheduledTrainingRecord = (training) => ({
  id: normalizeId(training.id),
  trainingProgramId: normalizeId(training.training_program_id || training.trainingProgramId),
  trainerId: normalizeId(training.trainer_id || training.trainerId),
  title: training.title || "",
  courseCode: training.course_code || training.courseCode || "",
  startDate: training.start_date || training.startDate || "",
  endDate: training.end_date || training.endDate || "",
  status: training.status || "Upcoming",
  studentCount: Number(training.student_count || training.studentCount || 0),
});

const buildProgramLanes = (programs) => {
  const laneEndDates = [];
  const laidOutPrograms = [...programs]
    .sort((left, right) => {
      const startDiff = parseISO(left.startDate).getTime() - parseISO(right.startDate).getTime();
      if (startDiff !== 0) return startDiff;
      return parseISO(left.endDate).getTime() - parseISO(right.endDate).getTime();
    })
    .map((program) => {
      const startTime = parseISO(program.startDate).getTime();
      const endTime = parseISO(program.endDate).getTime();
      let laneIndex = laneEndDates.findIndex((laneEndTime) => startTime > laneEndTime);
      if (laneIndex === -1) {
        laneIndex = laneEndDates.length;
        laneEndDates.push(endTime);
      } else {
        laneEndDates[laneIndex] = endTime;
      }
      return { ...program, laneIndex };
    });
  return { laneCount: Math.max(laneEndDates.length, 1), programs: laidOutPrograms };
};

const getProgramLabel = (title, width) => {
  const baseLabel = String(title || "").split(" - ")[0].trim();
  if (!baseLabel) return "";
  if (width >= 120) return baseLabel;
  if (width >= 72) return baseLabel.length > 12 ? `${baseLabel.slice(0, 12)}...` : baseLabel;
  if (width >= 44) return baseLabel.length > 7 ? `${baseLabel.slice(0, 7)}...` : baseLabel;
  return "";
};

// ─── Gantt component ─────────────────────────────────────
function TrainerGantt({ trainerRows, rangeStart, totalDays, cellWidth, onProgramClick, trainerSessionCounts }) {
  const dateHeaders = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i));
  }, [rangeStart, totalDays]);

  const today = new Date();
  const todayOffset = differenceInDays(today, rangeStart);
  const todayVisible = todayOffset >= 0 && todayOffset < totalDays;

  // Next 2 days offsets for highlight band
  const highlightDays = [0, 1, 2].map(d => todayOffset + d).filter(d => d >= 0 && d < totalDays);

  const getBarStyle = (status) => {
    if (status === "Completed") {
      return { bar: "bg-emerald-500/90 border-emerald-400 text-white", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    }
    if (status === "Ongoing") {
      return { bar: "bg-amber-400/90 border-amber-300 text-amber-950", badge: "bg-amber-100 text-amber-700 border-amber-200" };
    }
    return { bar: "bg-sky-400/60 border-sky-300 text-sky-950", badge: "bg-sky-100 text-sky-700 border-sky-200" };
  };

  return (
    <div className="relative w-full border border-border/50 rounded-xl bg-background flex flex-col overflow-hidden">
      {/* Date header */}
      <div className="flex border-b border-border/50 sticky top-0 z-20 bg-card/95 backdrop-blur-sm">
        <div className="w-[280px] shrink-0 border-r border-border/50 px-4 py-3 flex items-center sticky left-0 z-30 bg-card/95 backdrop-blur-sm">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Trainer</span>
        </div>
        <div className="flex overflow-visible">
          <div className="flex" style={{ width: `${totalDays * cellWidth}px` }}>
            {dateHeaders.map((date, i) => {
              const isToday = isSameDay(date, today);
              const isHighlight = highlightDays.includes(i);
              const isMonday = date.getDay() === 1;
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div key={i} className={`shrink-0 flex flex-col items-center justify-end border-r border-border/20 h-12 select-none ${isWeekend ? "bg-muted/30" : ""} ${isHighlight ? "bg-amber-400/15" : ""} ${isToday ? "bg-primary/15" : ""}`} style={{ width: `${cellWidth}px` }}>
                  {(isMonday || i === 0 || date.getDate() === 1) && <span className="text-[9px] font-bold text-muted-foreground uppercase absolute top-1 ml-1">{format(date, "MMM")}</span>}
                  <span className={`text-[11px] font-bold mb-1 ${isToday ? "text-primary" : isWeekend ? "text-muted-foreground/60" : "text-foreground"}`}>{format(date, "d")}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trainer rows */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {trainerRows.map((row) => {
          const color = TRAINER_COLORS[row.trainer.id];
          const { laneCount, programs } = buildProgramLanes(row.programs);
          const rowHeight = Math.max(64, laneCount * 44 + 20);
          const counts = trainerSessionCounts?.[row.trainer.id] || { total: 0, completed: 0, upcoming: 0 };

          return (
            <div key={row.trainer.id} className="flex border-b border-border/30 last:border-b-0 hover:bg-muted/5 transition-colors group" style={{ minHeight: `${rowHeight}px` }}>
              {/* Sticky left trainer info */}
              <div className="w-[280px] shrink-0 border-r border-border/50 bg-card/80 group-hover:bg-muted/30 transition-colors p-3 sticky left-0 z-10 flex flex-col justify-center gap-1.5">
                <div className="flex items-center gap-2.5">
                  <div className={`h-3 w-3 rounded-full shrink-0 ${color?.bg || "bg-muted"}`} />
                  <p className="text-sm font-bold text-foreground truncate">{row.trainer.name}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground ml-5">
                  <Users className="h-3 w-3" />
                  <span>{row.trainer.studentCount} students</span>
                </div>
                {/* Session count breakdown */}
                <div className="flex items-center gap-2 ml-5 mt-1">
                  <span className="text-[10px] font-bold text-muted-foreground">{counts.total} sessions</span>
                  <span className="text-[10px] flex items-center gap-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-emerald-700 font-medium">{counts.completed}</span>
                  </span>
                  <span className="text-[10px] flex items-center gap-0.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                    <span className="text-amber-700 font-medium">{counts.upcoming}</span>
                  </span>
                </div>
              </div>

              {/* Timeline area */}
              <div className="flex-1 relative overflow-x-auto" style={{ minWidth: `${totalDays * cellWidth}px` }}>
                <div className="relative h-full" style={{ width: `${totalDays * cellWidth}px`, minHeight: `${rowHeight}px` }}>
                  {/* Background columns */}
                  {dateHeaders.map((date, i) => {
                    const isHighlight = highlightDays.includes(i);
                    return (
                      <div key={i} className={`absolute top-0 bottom-0 ${date.getDay() === 0 || date.getDay() === 6 ? "bg-muted/20" : ""} ${isHighlight ? "bg-amber-400/10" : ""} ${isSameDay(date, today) ? "bg-primary/5" : ""}`} style={{ left: `${i * cellWidth}px`, width: `${cellWidth}px` }} />
                    );
                  })}
                  {/* Today line */}
                  {todayVisible && <div className="absolute top-0 bottom-0 w-[2px] bg-primary/60 z-10" style={{ left: `${todayOffset * cellWidth}px` }} />}

                  {/* Program bars */}
                  {programs.map((prog) => {
                    const startOffset = differenceInDays(parseISO(prog.startDate), rangeStart);
                    const duration = differenceInDays(parseISO(prog.endDate), parseISO(prog.startDate)) + 1;
                    if (startOffset + duration < 0 || startOffset > totalDays) return null;
                    const left = Math.max(0, startOffset) * cellWidth;
                    const width = Math.min(duration, totalDays - startOffset) * cellWidth - 4;
                    const top = 12 + prog.laneIndex * 42;
                    const style = getBarStyle(prog.status);
                    const label = getProgramLabel(prog.title, width);
                    const isClickable = prog.status === "Upcoming" || prog.status === "Ongoing";

                    return (
                      <TooltipProvider key={prog.id} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute h-9 rounded-lg border flex items-center px-3 gap-2 shadow-sm transition-all duration-200 hover:scale-y-105 hover:shadow-md hover:z-20 z-10 ${style.bar} ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                              style={{ left: `${left}px`, top: `${top}px`, width: `${Math.max(width, 20)}px` }}
                              onClick={() => isClickable && onProgramClick(prog)}
                            >
                              {label && <span className="text-xs font-bold truncate">{label}</span>}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-2 py-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>{prog.status}</span>
                                <p className="font-bold text-sm">{prog.title}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>Trainer:</span><span className="font-medium text-foreground text-right">{row.trainer.name}</span>
                                <span>Start:</span><span className="font-medium text-foreground text-right">{format(parseISO(prog.startDate), "MMM d, yyyy")}</span>
                                <span>End:</span><span className="font-medium text-foreground text-right">{format(parseISO(prog.endDate), "MMM d, yyyy")}</span>
                                <span>Students:</span><span className="font-medium text-foreground text-right">{prog.studentCount}</span>
                              </div>
                              {isClickable && <p className="text-[10px] text-primary font-medium mt-1">Click to open in Calendar →</p>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────
export default function PerformancePage() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const ganttScrollRef = useRef(null);

  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";
  const [selectedTrainer, setSelectedTrainer] = useState("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("ongoing");
  const [trainers, setTrainers] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadPerformanceData = async () => {
      if (isMounted) { setIsLoadingData(true); setFetchError(false); }
      const results = await Promise.allSettled([api.trainers.list(), api.scheduledTrainings.list()]);
      if (!isMounted) return;
      const [trainersResult, trainingsResult] = results;
      if (results.some((r) => r.status === "rejected")) {
        setTrainers([]); setTrainings([]); setFetchError(true); setIsLoadingData(false);
        toast.error("Failed to load performance data."); return;
      }
      setTrainers(Array.isArray(trainersResult.value?.trainers) ? trainersResult.value.trainers.map(mapTrainerRecord) : []);
      setTrainings(Array.isArray(trainingsResult.value?.scheduled_trainings) ? trainingsResult.value.scheduled_trainings.map(mapScheduledTrainingRecord) : []);
      setIsLoadingData(false);
    };
    loadPerformanceData();
    return () => { isMounted = false; };
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

  // Month-based range: show previous month start to next month end
  const rangeStart = useMemo(() => {
    return startOfMonth(subMonths(currentMonth, 1));
  }, [currentMonth]);

  const rangeEnd = useMemo(() => {
    return endOfMonth(addMonths(currentMonth, 1));
  }, [currentMonth]);

  const totalDays = differenceInDays(rangeEnd, rangeStart) + 1;
  const cellWidth = 36;

  const visibleTrainings = useMemo(() => {
    if (statusFilter === "ongoing") {
      return trainings.filter((training) => training.status === "Ongoing");
    }
    return trainings;
  }, [statusFilter, trainings]);

  const scrollToCurrentDate = (baseMonth = new Date()) => {
    const container = ganttScrollRef.current;
    if (!container) {
      return;
    }

    const visibleWidth = container.clientWidth;
    const currentOffset = differenceInDays(new Date(), startOfMonth(subMonths(baseMonth, 1)));
    const targetLeft = Math.max(currentOffset * cellWidth - visibleWidth / 2, 0);
    container.scrollTo({ left: targetLeft, behavior: "smooth" });
  };

  const trainerRows = useMemo(() => {
    let filteredTrainers = trainers;
    if (!isSupervisor) {
      filteredTrainers = trainers.filter((t) => t.id === trainerId);
    } else if (selectedTrainer !== "all") {
      filteredTrainers = trainers.filter((t) => t.id === selectedTrainer);
    }
    return filteredTrainers
      .map((trainer) => {
        const trainerPrograms = visibleTrainings
          .filter((tr) => String(tr.trainerId) === String(trainer.id))
          .map((prog) => ({ ...prog }));
        return {
          trainer: {
            ...trainer,
            studentCount: trainerPrograms.reduce((total, program) => total + Number(program.studentCount || 0), 0),
          },
          programs: trainerPrograms,
        };
      })
      .filter((row) => row.programs.length > 0 || selectedTrainer !== "all");
  }, [trainers, visibleTrainings, selectedTrainer, isSupervisor, trainerId]);

  // Session counts per trainer for the current month
  const trainerSessionCounts = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const counts = {};
    trainers.forEach(t => {
      const trainerProgs = visibleTrainings.filter(tr => String(tr.trainerId) === String(t.id));
      const inMonth = trainerProgs.filter(p => {
        const s = parseISO(p.startDate);
        const e = parseISO(p.endDate);
        return s <= monthEnd && e >= monthStart;
      });
      counts[t.id] = {
        total: inMonth.length,
        completed: inMonth.filter(p => p.status === "Completed").length,
        upcoming: inMonth.filter(p => p.status === "Upcoming" || p.status === "Ongoing").length,
      };
    });
    return counts;
  }, [trainers, visibleTrainings, currentMonth]);

  const kpi = useMemo(() => {
    const relevantTrainings = isSupervisor
      ? visibleTrainings
      : visibleTrainings.filter((t) => t.trainerId === trainerId);
    return {
      total: relevantTrainings.length,
      completed: relevantTrainings.filter((t) => t.status === "Completed").length,
      ongoing: relevantTrainings.filter((t) => t.status === "Ongoing").length,
      upcoming: relevantTrainings.filter((t) => t.status === "Upcoming").length,
    };
  }, [visibleTrainings, isSupervisor, trainerId]);

  const handleProgramClick = (prog) => {
    navigate(`/calendar?date=${prog.startDate}&view=week`);
  };

  const handleCurrentView = () => {
    const today = new Date();
    setStatusFilter("ongoing");
    setCurrentMonth(today);
    requestAnimationFrame(() => {
      scrollToCurrentDate(today);
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] gap-4 animate-fade-in max-w-[1800px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <BarChart2 className="h-7 w-7 text-primary" />
            {isSupervisor ? "All Trainer Progress" : "My Progress Timeline"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isSupervisor ? "Gantt view of ongoing trainer programs across the organization" : "Your ongoing training program timeline"}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleCurrentView}>
          <LocateFixed className="h-4 w-4" /> Current
        </Button>
      </div>

      {isLoadingData && <p className="text-sm text-muted-foreground">Loading data...</p>}
      {!isLoadingData && fetchError && <p className="text-sm text-destructive">Error in fetching data</p>}

      {!isLoadingData && !fetchError && (
      <>
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        {[ 
          { label: "Total Programs", value: kpi.total, icon: Activity, color: "text-primary bg-primary/10" },
          { label: "Completed", value: kpi.completed, icon: CheckCircle2, color: "text-muted-foreground bg-muted" },
          { label: "Ongoing", value: kpi.ongoing, icon: Clock, color: "text-primary bg-primary/10" },
          { label: "Upcoming", value: kpi.upcoming, icon: CalendarDays, color: "text-muted-foreground bg-muted" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-4 rounded-[var(--radius-shell)] border border-border/50 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className={`h-11 w-11 rounded-[var(--radius-panel)] flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-black tracking-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Strip with Month Nav */}
      <div className="flex flex-wrap items-center gap-3 shrink-0 bg-muted/20 border border-border/50 rounded-xl p-3">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {isSupervisor && (
          <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
            <SelectTrigger className="w-[180px] bg-background h-9">
              <SelectValue placeholder="All Trainers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trainers</SelectItem>
              {trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Month Navigation */}
        <div className="flex items-center gap-1 ml-2">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold min-w-[120px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentMonth(new Date())}>
          Today
        </Button>

        <div className="ml-auto flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded-sm bg-emerald-500 inline-block" /> Completed</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded-sm bg-amber-400 inline-block" /> Ongoing</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded-sm bg-sky-400/60 inline-block" /> Upcoming</span>
        </div>
      </div>

      {/* Gantt Chart */}
      <div ref={ganttScrollRef} className="flex-1 overflow-x-auto overflow-y-auto min-h-0 rounded-xl" style={{ maxWidth: '100%' }}>
        {trainerRows.length > 0 ? (
          <TrainerGantt
            trainerRows={trainerRows}
            rangeStart={rangeStart}
            totalDays={totalDays}
            cellWidth={cellWidth}
            onProgramClick={handleProgramClick}
            trainerSessionCounts={trainerSessionCounts}
          />
        ) : (
          <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-border/50 bg-card text-center">
            <div className="space-y-2 px-6">
              <p className="text-lg font-bold text-foreground">No ongoing programs found</p>
              <p className="text-sm text-muted-foreground">The progress page is currently focused on ongoing programs.</p>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
