import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/data/api";
import { normalizeAvailabilityRecord, normalizeTrainer, toApiId } from "@/lib/phase-backend";
import {
  createLeaveDecisionNotification,
  createLeaveRequestSubmittedNotification,
  resolveTrainerIdentity,
} from "@/lib/leave-notifications";
import { leaveTypes } from "@/lib/phase3-mock-data";
import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  CalendarOff,
  CheckCircle2,
  Clock3,
  FileText,
  Send,
  Sparkles,
  Trash2,
  XCircle,
  Plane,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles = {
  Approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  Pending: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  Rejected: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
};

const requestWindow = {
  from: format(startOfMonth(subMonths(new Date(), 6)), "yyyy-MM-dd"),
  to: format(endOfMonth(addMonths(new Date(), 12)), "yyyy-MM-dd"),
};

const sortByRecentWindow = (left, right) => {
  const leftStamp = `${left.startDate || ""}-${left.endDate || ""}`;
  const rightStamp = `${right.startDate || ""}-${right.endDate || ""}`;
  return rightStamp.localeCompare(leftStamp);
};

const formatLeaveDates = (record) => {
  if (!record?.startDate || !record?.endDate) return "Dates not available";
  if (record.startDate === record.endDate) {
    return format(parseISO(record.startDate), "MMM d, yyyy");
  }
  return `${format(parseISO(record.startDate), "MMM d")} – ${format(parseISO(record.endDate), "MMM d, yyyy")}`;
};

const getDurationLabel = (record) => {
  if (!record?.startDate || !record?.endDate) return "";
  const days = differenceInCalendarDays(parseISO(record.endDate), parseISO(record.startDate)) + 1;
  return `${days} day${days === 1 ? "" : "s"}`;
};

function GlassStat({ label, value, hint, icon: Icon, accent = "from-primary/20 to-primary/5", delay = 0 }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border/40 bg-card/60 backdrop-blur-2xl p-6",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.15)]",
        "transition-all duration-500 hover:-translate-y-1 animate-fade-scale"
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div className={cn("absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br blur-2xl opacity-60 group-hover:opacity-90 transition-opacity duration-500", accent)} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-background/80 backdrop-blur border border-border/40 shadow-sm">
            <Icon className="h-4 w-4 text-foreground/70" />
          </div>
        </div>
        <p className="mt-4 text-4xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
        {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

function LeaveRow({ record, trainerName, statusStyle, actions, delay = 0 }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/40 bg-card/40 backdrop-blur-xl p-5",
        "hover:bg-card/70 hover:border-border/70 hover:shadow-md transition-all duration-300",
        "animate-fade-scale"
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 shrink-0">
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {trainerName ? <p className="text-sm font-semibold text-foreground">{trainerName}</p> : null}
              <span className="text-xs text-muted-foreground">{record.type}</span>
              <Badge variant="outline" className={cn("text-[10px] font-semibold border", statusStyle)}>
                {record.status}
              </Badge>
            </div>
            <p className="mt-1 text-base font-medium text-foreground tabular-nums">{formatLeaveDates(record)}</p>
            <p className="text-xs text-muted-foreground">{getDurationLabel(record)}</p>
            {record.notes ? (
              <p className="mt-2 text-sm text-muted-foreground/90 line-clamp-2">{record.notes}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}

export default function LeaveRequestsPage() {
  const user = useAppStore((state) => state.user);
  const [trainers, setTrainers] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [form, setForm] = useState({
    type: "Annual Leave",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";
  const trainerIdentity = useMemo(() => resolveTrainerIdentity(trainers, user), [trainers, user]);
  const activeTrainer = useMemo(
    () => trainers.find((trainer) => String(trainer.id) === String(trainerIdentity.trainerId)) || null,
    [trainerIdentity.trainerId, trainers]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [trainerResponse, availabilityResponse] = await Promise.all([
        api.trainers.list(),
        api.availabilityPage.list(requestWindow),
      ]);
      setTrainers((trainerResponse?.trainers || []).map(normalizeTrainer));
      setLeaveRequests((availabilityResponse?.availability || []).map(normalizeAvailabilityRecord));
    } catch {
      toast.error("Failed to load leave requests");
      setTrainers([]);
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sortedRequests = useMemo(() => [...leaveRequests].sort(sortByRecentWindow), [leaveRequests]);
  const myRequests = useMemo(
    () => sortedRequests.filter((record) => String(record.trainerId) === String(trainerIdentity.trainerId)),
    [sortedRequests, trainerIdentity.trainerId]
  );
  const filteredSupervisorRequests = useMemo(
    () =>
      sortedRequests.filter((record) => {
        if (statusFilter !== "all" && String(record.status).toLowerCase() !== statusFilter) return false;
        if (trainerFilter !== "all" && String(record.trainerId) !== String(trainerFilter)) return false;
        return true;
      }),
    [sortedRequests, statusFilter, trainerFilter]
  );
  const pendingRequests = useMemo(
    () => sortedRequests.filter((record) => String(record.status) === "Pending"),
    [sortedRequests]
  );
  const approvedThisMonth = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    return sortedRequests.filter((record) => {
      if (String(record.status) !== "Approved" || !record.startDate) return false;
      return parseISO(record.startDate) >= monthStart;
    }).length;
  }, [sortedRequests]);
  const trainersOnLeaveToday = useMemo(() => {
    const today = startOfDay(new Date());
    return sortedRequests.filter((record) => {
      if (String(record.status) !== "Approved" || !record.startDate || !record.endDate) return false;
      return isWithinInterval(today, {
        start: startOfDay(parseISO(record.startDate)),
        end: startOfDay(parseISO(record.endDate)),
      });
    }).length;
  }, [sortedRequests]);
  const latestTrainerDecision = myRequests.find((record) => String(record.status) !== "Pending")?.status || "Pending";

  const formDuration = useMemo(() => {
    if (!form.startDate || !form.endDate || form.endDate < form.startDate) return 0;
    return differenceInCalendarDays(parseISO(form.endDate), parseISO(form.startDate)) + 1;
  }, [form.startDate, form.endDate]);

  const handleSubmitRequest = async (event) => {
    event.preventDefault();
    if (!trainerIdentity.trainerId || !activeTrainer?.backendId) {
      toast.error("We could not match your login to a trainer record.");
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error("Please select the leave dates.");
      return;
    }
    if (form.endDate < form.startDate) {
      toast.error("End date cannot be earlier than the start date.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        trainer_id: toApiId(activeTrainer.backendId),
        type: form.type,
        start_date: form.startDate,
        end_date: form.endDate,
        notes: form.notes,
        status: "Pending",
        created_by_portalid: user?.portalId || user?.id || "system",
      };
      const response = await api.availabilityPage.create(payload);
      await loadData();
      createLeaveRequestSubmittedNotification({
        request: {
          id: response?.availability?.id || response?.id,
          trainerId: trainerIdentity.trainerId,
          type: form.type,
          startDate: form.startDate,
          endDate: form.endDate,
        },
        trainerName: trainerIdentity.trainerName,
      });
      setForm({
        type: "Annual Leave",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        notes: "",
      });
      toast.success("Leave request submitted for approval.");
    } catch {
      toast.error("Failed to submit leave request");
    } finally {
      setSaving(false);
    }
  };

  const handleDecision = async (record, nextStatus) => {
    setSaving(true);
    try {
      const trainer = trainers.find((item) => String(item.id) === String(record.trainerId));
      await api.availabilityPage.update(record.backendId, {
        trainer_id: toApiId(trainer?.backendId ?? record.trainerId),
        type: record.type,
        start_date: record.startDate,
        end_date: record.endDate,
        notes: record.notes,
        status: nextStatus,
        created_by_portalid: user?.portalId || user?.id || "system",
      });
      await loadData();
      createLeaveDecisionNotification({
        decision: nextStatus,
        request: record,
        trainerName: trainer?.name || trainerIdentity.trainerName,
        actorName: user?.name || "Supervisor",
      });
      toast.success(`Leave request ${String(nextStatus).toLowerCase()}.`);
    } catch {
      toast.error("Failed to update leave request");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRequest = async (record) => {
    setSaving(true);
    try {
      await api.availabilityPage.remove(record.backendId);
      await loadData();
      toast.success("Leave request cancelled.");
    } catch {
      toast.error("Failed to cancel leave request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Ambient background gradients — Apple-style */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-accent/15 via-primary/5 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-t from-primary/10 to-transparent blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Hero — editorial Apple style */}
        <div className="text-center space-y-5 animate-fade-scale" style={{ animationFillMode: "backwards" }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 backdrop-blur-xl px-4 py-1.5 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium tracking-wide text-foreground/80">
              {isSupervisor ? "Leave Approval Center" : "Time Off"}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
            {isSupervisor ? "Approve with clarity." : "Take time, beautifully."}
          </h1>
          <p className="max-w-2xl mx-auto text-sm md:text-base text-muted-foreground leading-relaxed">
            {isSupervisor
              ? "Review every request in one calm, focused space. Approvals sync everywhere — calendar, notifications, schedules."
              : "Request time off in a few thoughtful taps. Track approvals as they happen. Stay in flow."}
          </p>
        </div>

        {/* Glass stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {isSupervisor ? (
            <>
              <GlassStat label="Pending" value={pendingRequests.length} hint="Awaiting your decision" icon={Clock3} accent="from-amber-400/30 to-amber-200/5" delay={50} />
              <GlassStat label="Approved this month" value={approvedThisMonth} hint="Confirmed leave windows" icon={CheckCircle2} accent="from-emerald-400/30 to-emerald-200/5" delay={150} />
              <GlassStat label="On leave today" value={trainersOnLeaveToday} hint="Active right now" icon={CalendarOff} accent="from-primary/30 to-primary/5" delay={250} />
            </>
          ) : (
            <>
              <GlassStat label="Total requests" value={myRequests.length} hint="All your submissions" icon={FileText} accent="from-primary/30 to-primary/5" delay={50} />
              <GlassStat label="Pending" value={myRequests.filter((r) => String(r.status) === "Pending").length} hint="Waiting on supervisor" icon={Clock3} accent="from-amber-400/30 to-amber-200/5" delay={150} />
              <GlassStat
                label="Latest decision"
                value={latestTrainerDecision}
                hint="Most recent outcome"
                icon={latestTrainerDecision === "Rejected" ? XCircle : CheckCircle2}
                accent={latestTrainerDecision === "Rejected" ? "from-rose-400/30 to-rose-200/5" : "from-emerald-400/30 to-emerald-200/5"}
                delay={250}
              />
            </>
          )}
        </div>

        <Tabs defaultValue={isSupervisor ? "queue" : "apply"} className="space-y-6">
          <TabsList className="mx-auto flex w-fit rounded-full border border-border/40 bg-background/60 backdrop-blur-xl p-1 shadow-sm">
            {isSupervisor ? (
              <>
                <TabsTrigger value="queue" className="rounded-full px-6 data-[state=active]:bg-foreground data-[state=active]:text-background transition-all">
                  Queue
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-full px-6 data-[state=active]:bg-foreground data-[state=active]:text-background transition-all">
                  All requests
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="apply" className="rounded-full px-6 data-[state=active]:bg-foreground data-[state=active]:text-background transition-all">
                  Request
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-full px-6 data-[state=active]:bg-foreground data-[state=active]:text-background transition-all">
                  History
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {isSupervisor ? (
            <>
              <TabsContent value="queue" className="space-y-3">
                {loading ? (
                  <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-12 text-center text-sm text-muted-foreground">
                    Loading requests…
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border/50 bg-card/30 backdrop-blur-xl p-16 text-center animate-fade-scale">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400/20 to-emerald-200/5 mb-4">
                      <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">All caught up</p>
                    <p className="mt-1 text-sm text-muted-foreground">No pending leave requests right now.</p>
                  </div>
                ) : (
                  pendingRequests.map((record, idx) => {
                    const trainerName = trainers.find((t) => String(t.id) === String(record.trainerId))?.name || record.trainerId;
                    return (
                      <LeaveRow
                        key={record.id}
                        record={record}
                        trainerName={trainerName}
                        statusStyle={statusStyles.Pending}
                        delay={idx * 60}
                        actions={
                          <>
                            <Button
                              size="sm"
                              className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20"
                              onClick={() => handleDecision(record, "Approved")}
                              disabled={saving}
                            >
                              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-border/60 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 hover:border-rose-500/40"
                              onClick={() => handleDecision(record, "Rejected")}
                              disabled={saving}
                            >
                              <XCircle className="mr-1.5 h-4 w-4" /> Decline
                            </Button>
                          </>
                        }
                      />
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <div className="flex flex-wrap gap-3 justify-end">
                  <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                    <SelectTrigger className="w-[200px] rounded-full bg-background/60 backdrop-blur-xl border-border/40">
                      <SelectValue placeholder="Filter by trainer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All trainers</SelectItem>
                      {trainers.map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px] rounded-full bg-background/60 backdrop-blur-xl border-border/40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  {loading ? (
                    <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-12 text-center text-sm text-muted-foreground">
                      Loading…
                    </div>
                  ) : filteredSupervisorRequests.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-border/50 bg-card/30 backdrop-blur-xl p-12 text-center text-sm text-muted-foreground">
                      No leave requests match the selected filters.
                    </div>
                  ) : (
                    filteredSupervisorRequests.map((record, idx) => {
                      const trainerName = trainers.find((t) => String(t.id) === String(record.trainerId))?.name || record.trainerId;
                      return (
                        <LeaveRow
                          key={record.id}
                          record={record}
                          trainerName={trainerName}
                          statusStyle={statusStyles[record.status] || statusStyles.Pending}
                          delay={idx * 40}
                          actions={
                            record.status === "Pending" ? (
                              <>
                                <Button size="sm" variant="ghost" className="rounded-full text-emerald-600 hover:bg-emerald-500/10" onClick={() => handleDecision(record, "Approved")} disabled={saving}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="ghost" className="rounded-full text-rose-600 hover:bg-rose-500/10" onClick={() => handleDecision(record, "Rejected")} disabled={saving}>
                                  Decline
                                </Button>
                              </>
                            ) : null
                          }
                        />
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </>
          ) : (
            <>
              <TabsContent value="apply" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  {/* Form card — soft glass */}
                  <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/60 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.08)] animate-fade-scale" style={{ animationFillMode: "backwards" }}>
                    <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl" />
                    <div className="relative p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                          <Plane className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-foreground">New request</h2>
                          <p className="text-xs text-muted-foreground">Tell us when and why</p>
                        </div>
                      </div>

                      <form className="space-y-5" onSubmit={handleSubmitRequest}>
                        <div className="space-y-2">
                          <Label htmlFor="leave-type" className="text-xs font-medium text-muted-foreground">Leave type</Label>
                          <Select value={form.type} onValueChange={(value) => setForm((c) => ({ ...c, type: value }))}>
                            <SelectTrigger id="leave-type" className="h-11 rounded-2xl bg-background/60 backdrop-blur border-border/40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {leaveTypes.map((lt) => (
                                <SelectItem key={lt} value={lt}>{lt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="leave-start" className="text-xs font-medium text-muted-foreground">From</Label>
                            <Input
                              id="leave-start"
                              type="date"
                              value={form.startDate}
                              onChange={(e) => setForm((c) => ({ ...c, startDate: e.target.value }))}
                              className="h-11 rounded-2xl bg-background/60 backdrop-blur border-border/40"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="leave-end" className="text-xs font-medium text-muted-foreground">To</Label>
                            <Input
                              id="leave-end"
                              type="date"
                              value={form.endDate}
                              onChange={(e) => setForm((c) => ({ ...c, endDate: e.target.value }))}
                              className="h-11 rounded-2xl bg-background/60 backdrop-blur border-border/40"
                            />
                          </div>
                        </div>

                        {formDuration > 0 ? (
                          <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 animate-fade-scale">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            <p className="text-sm text-foreground">
                              <span className="font-semibold tabular-nums">{formDuration}</span>
                              <span className="text-muted-foreground"> day{formDuration === 1 ? "" : "s"} of leave</span>
                            </p>
                          </div>
                        ) : null}

                        <div className="space-y-2">
                          <Label htmlFor="leave-notes" className="text-xs font-medium text-muted-foreground">Notes for supervisor</Label>
                          <Textarea
                            id="leave-notes"
                            placeholder="Add coverage details or context…"
                            value={form.notes}
                            onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
                            className="min-h-[100px] rounded-2xl bg-background/60 backdrop-blur border-border/40 resize-none"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={saving || loading}
                          className="w-full h-12 rounded-2xl bg-foreground text-background hover:bg-foreground/90 shadow-lg shadow-foreground/10 hover:shadow-xl hover:shadow-foreground/20 transition-all duration-300 group"
                        >
                          <Send className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          {saving ? "Submitting…" : "Submit request"}
                        </Button>
                      </form>
                    </div>
                  </div>

                  {/* Recent status panel */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
                      <span className="text-xs text-muted-foreground">{myRequests.length} total</span>
                    </div>
                    {loading ? (
                      <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-8 text-center text-sm text-muted-foreground">
                        Loading…
                      </div>
                    ) : myRequests.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-border/50 bg-card/30 backdrop-blur-xl p-10 text-center animate-fade-scale">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 mb-3">
                          <CalendarOff className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Nothing here yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">Your submitted requests will appear here.</p>
                      </div>
                    ) : (
                      myRequests.slice(0, 4).map((record, idx) => (
                        <LeaveRow
                          key={record.id}
                          record={record}
                          statusStyle={statusStyles[record.status] || statusStyles.Pending}
                          delay={idx * 60}
                        />
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-3">
                {loading ? (
                  <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-12 text-center text-sm text-muted-foreground">
                    Loading…
                  </div>
                ) : myRequests.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border/50 bg-card/30 backdrop-blur-xl p-16 text-center">
                    <p className="text-sm text-muted-foreground">No leave requests available for your login.</p>
                  </div>
                ) : (
                  myRequests.map((record, idx) => (
                    <LeaveRow
                      key={record.id}
                      record={record}
                      statusStyle={statusStyles[record.status] || statusStyles.Pending}
                      delay={idx * 40}
                      actions={
                        record.status === "Pending" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full text-rose-600 hover:bg-rose-500/10"
                            onClick={() => handleCancelRequest(record)}
                            disabled={saving}
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" /> Cancel
                          </Button>
                        ) : null
                      }
                    />
                  ))
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}
