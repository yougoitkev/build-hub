import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Hero } from "@/components/learning/Hero";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles = {
  Approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
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
  if (!record?.startDate || !record?.endDate) {
    return "Dates not available";
  }

  if (record.startDate === record.endDate) {
    return format(parseISO(record.startDate), "MMM d, yyyy");
  }

  return `${format(parseISO(record.startDate), "MMM d, yyyy")} to ${format(parseISO(record.endDate), "MMM d, yyyy")}`;
};

const getDurationLabel = (record) => {
  if (!record?.startDate || !record?.endDate) {
    return "";
  }

  const days = differenceInCalendarDays(parseISO(record.endDate), parseISO(record.startDate)) + 1;
  return `${days} day${days === 1 ? "" : "s"}`;
};

function SummaryCard({ label, value, hint, icon: Icon, tone }) {
  return (
    <PremiumCard className="border-border/60 bg-card/80">
      <PremiumCardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-foreground">{value}</p>
            {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", tone)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </PremiumCardContent>
    </PremiumCard>
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
        if (statusFilter !== "all" && String(record.status).toLowerCase() !== statusFilter) {
          return false;
        }
        if (trainerFilter !== "all" && String(record.trainerId) !== String(trainerFilter)) {
          return false;
        }
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
      if (String(record.status) !== "Approved" || !record.startDate) {
        return false;
      }
      return parseISO(record.startDate) >= monthStart;
    }).length;
  }, [sortedRequests]);
  const trainersOnLeaveToday = useMemo(() => {
    const today = startOfDay(new Date());
    return sortedRequests.filter((record) => {
      if (String(record.status) !== "Approved" || !record.startDate || !record.endDate) {
        return false;
      }
      return isWithinInterval(today, {
        start: startOfDay(parseISO(record.startDate)),
        end: startOfDay(parseISO(record.endDate)),
      });
    }).length;
  }, [sortedRequests]);
  const latestTrainerDecision = myRequests.find((record) => String(record.status) !== "Pending")?.status || "Pending";

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
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <Hero
        badge={isSupervisor ? "Supervisor Leave Tracker" : "Trainer Leave Center"}
        title={isSupervisor ? "Review And Track Trainer Leave" : "Request Leave Without Leaving Your Workflow"}
        description={
          isSupervisor
            ? "Monitor every request, keep a live approval queue, and make sure schedule decisions are visible to the whole team."
            : "Apply for time off on a dedicated page, track the approval status, and keep your supervisor in the loop automatically."
        }
        actions={
          isSupervisor ? (
            <div className="flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {pendingRequests.length} pending request{pendingRequests.length === 1 ? "" : "s"}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm text-muted-foreground">
              <CalendarOff className="h-4 w-4 text-primary" />
              Requests sync into supervisor tracking and notifications
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {isSupervisor ? (
          <>
            <SummaryCard
              label="Pending Approval"
              value={pendingRequests.length}
              hint="Requests waiting on supervisor action"
              icon={Clock3}
              tone="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            />
            <SummaryCard
              label="Approved This Month"
              value={approvedThisMonth}
              hint="Confirmed leave windows scheduled this month"
              icon={CheckCircle2}
              tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            />
            <SummaryCard
              label="On Leave Today"
              value={trainersOnLeaveToday}
              hint="Approved absences active right now"
              icon={CalendarOff}
              tone="bg-primary/10 text-primary"
            />
          </>
        ) : (
          <>
            <SummaryCard
              label="My Requests"
              value={myRequests.length}
              hint="All leave submissions tied to your login"
              icon={FileText}
              tone="bg-primary/10 text-primary"
            />
            <SummaryCard
              label="Pending"
              value={myRequests.filter((record) => String(record.status) === "Pending").length}
              hint="Waiting for supervisor approval"
              icon={Clock3}
              tone="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            />
            <SummaryCard
              label="Latest Decision"
              value={latestTrainerDecision}
              hint="Most recent non-pending outcome"
              icon={latestTrainerDecision === "Rejected" ? XCircle : CheckCircle2}
              tone={latestTrainerDecision === "Rejected" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"}
            />
          </>
        )}
      </div>

      <Tabs defaultValue={isSupervisor ? "queue" : "apply"} className="space-y-4">
        <TabsList>
          {isSupervisor ? (
            <>
              <TabsTrigger value="queue">Approval Queue</TabsTrigger>
              <TabsTrigger value="history">All Requests</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="apply">Apply Leave</TabsTrigger>
              <TabsTrigger value="history">My Requests</TabsTrigger>
            </>
          )}
        </TabsList>
        {isSupervisor ? (
          <>
            <TabsContent value="queue" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                <PremiumCard>
                  <PremiumCardHeader>
                    <PremiumCardTitle className="text-base font-bold">Pending Requests</PremiumCardTitle>
                  </PremiumCardHeader>
                  <PremiumCardContent className="space-y-3">
                    {loading ? <p className="text-sm text-muted-foreground">Loading requests...</p> : null}
                    {!loading && pendingRequests.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                        No pending leave requests right now.
                      </p>
                    ) : null}
                    {!loading && pendingRequests.map((record) => {
                      const trainerName = trainers.find((trainer) => String(trainer.id) === String(record.trainerId))?.name || record.trainerId;
                      return (
                        <div key={record.id} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">{trainerName}</p>
                                <Badge className={statusStyles.Pending}>Pending</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{record.type} - {formatLeaveDates(record)} - {getDurationLabel(record)}</p>
                              {record.notes ? <p className="text-sm text-muted-foreground">{record.notes}</p> : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                onClick={() => handleDecision(record, "Approved")}
                                disabled={saving}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                              </Button>
                              <Button
                                variant="outline"
                                className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                onClick={() => handleDecision(record, "Rejected")}
                                disabled={saving}
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </PremiumCardContent>
                </PremiumCard>

                <Card className="border-primary/15 bg-primary/[0.03]">
                  <CardHeader>
                    <CardTitle className="text-base">Approval Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                      <p className="font-medium text-foreground">Notifications stay connected</p>
                      <p className="mt-2">Every approval or rejection posts into the shared notification panel so trainers and supervisors see the same workflow outcome after they log in on this machine.</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                      <p className="font-medium text-foreground">Tracking stays central</p>
                      <p className="mt-2">Use the history tab to filter by trainer or status when you need a clean audit trail for coaching, scheduling, or staffing reviews.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">Request History</CardTitle>
                  <div className="flex flex-wrap gap-3">
                    <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                      <SelectTrigger className="w-[220px]">
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
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trainer</TableHead>
                        <TableHead>Leave</TableHead>
                        <TableHead>Window</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Loading requests...</TableCell>
                        </TableRow>
                      ) : null}
                      {!loading && filteredSupervisorRequests.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{trainers.find((trainer) => String(trainer.id) === String(record.trainerId))?.name || record.trainerId}</TableCell>
                          <TableCell>{record.type}</TableCell>
                          <TableCell>
                            <div className="text-sm">{formatLeaveDates(record)}</div>
                            <div className="text-xs text-muted-foreground">{getDurationLabel(record)}</div>
                          </TableCell>
                          <TableCell><Badge className={statusStyles[record.status] || statusStyles.Pending}>{record.status}</Badge></TableCell>
                          <TableCell className="max-w-[240px] text-sm text-muted-foreground">{record.notes || "No notes provided"}</TableCell>
                          <TableCell className="text-right">
                            {record.status === "Pending" ? (
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleDecision(record, "Approved")} disabled={saving}>Approve</Button>
                                <Button variant="outline" size="sm" onClick={() => handleDecision(record, "Rejected")} disabled={saving}>Reject</Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Finalized</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!loading && filteredSupervisorRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No leave requests match the selected filters.</TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        ) : (          <>
            <TabsContent value="apply" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Apply For Leave</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4" onSubmit={handleSubmitRequest}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="leave-type">Leave type</Label>
                          <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
                            <SelectTrigger id="leave-type"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {leaveTypes.map((leaveType) => (
                                <SelectItem key={leaveType} value={leaveType}>{leaveType}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="leave-owner">Trainer</Label>
                          <Input id="leave-owner" value={trainerIdentity.trainerName || user?.name || "Trainer"} disabled />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="leave-start">Start date</Label>
                          <Input id="leave-start" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
                        </div>
                        <div>
                          <Label htmlFor="leave-end">End date</Label>
                          <Input id="leave-end" type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="leave-notes">Notes for supervisor</Label>
                        <Textarea id="leave-notes" placeholder="Add context, coverage details, or anything your supervisor should know." value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
                      </div>

                      <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                        Requests land in the supervisor approval queue and also post to the notification panel so the decision is easy to track after login.
                      </div>

                      <Button type="submit" disabled={saving || loading} className="w-full sm:w-auto">
                        <Send className="mr-2 h-4 w-4" /> Submit Request
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <PremiumCard>
                  <PremiumCardHeader>
                    <PremiumCardTitle className="text-base font-bold">Upcoming And Recent Status</PremiumCardTitle>
                  </PremiumCardHeader>
                  <PremiumCardContent className="space-y-3">
                    {loading ? <p className="text-sm text-muted-foreground">Loading your requests...</p> : null}
                    {!loading && myRequests.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                        No leave requests yet. Your submitted requests will show up here with approval status.
                      </p>
                    ) : null}
                    {!loading && myRequests.slice(0, 4).map((record) => (
                      <div key={record.id} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{record.type}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{formatLeaveDates(record)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{getDurationLabel(record)}</p>
                          </div>
                          <Badge className={statusStyles[record.status] || statusStyles.Pending}>{record.status}</Badge>
                        </div>
                        {record.notes ? <p className="mt-3 text-sm text-muted-foreground">{record.notes}</p> : null}
                      </div>
                    ))}
                  </PremiumCardContent>
                </PremiumCard>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">My Leave Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Loading your requests...</TableCell>
                        </TableRow>
                      ) : null}
                      {!loading && myRequests.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.type}</TableCell>
                          <TableCell>
                            <div className="text-sm">{formatLeaveDates(record)}</div>
                            <div className="text-xs text-muted-foreground">{getDurationLabel(record)}</div>
                          </TableCell>
                          <TableCell><Badge className={statusStyles[record.status] || statusStyles.Pending}>{record.status}</Badge></TableCell>
                          <TableCell className="max-w-[260px] text-sm text-muted-foreground">{record.notes || "No notes provided"}</TableCell>
                          <TableCell className="text-right">
                            {record.status === "Pending" ? (
                              <Button variant="outline" size="sm" onClick={() => handleCancelRequest(record)} disabled={saving}>
                                <Trash2 className="mr-2 h-4 w-4" /> Cancel
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">{record.status === "Approved" ? "Confirmed" : "Closed"}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!loading && myRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No leave requests available for your login.</TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}