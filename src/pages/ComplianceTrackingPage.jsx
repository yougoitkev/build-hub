import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  PremiumCard,
  PremiumCardContent,
  PremiumCardDescription,
  PremiumCardHeader,
  PremiumCardTitle,
} from "@/components/learning/PremiumCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/data/api";
import { useAppStore } from "@/store/app-store";

const ALL_VALUE = "all";
const NONE_VALUE = "none";

const STATUS_OPTIONS = ["Completed", "Not Completed", "In Progress", "Not Required"];
const COMPLIANCE_ITEMS = [
  "Client Compliance",
  "Internal Compliance",
  "LMS Completion",
  "Policy Review",
];

const emptyForm = {
  trainerId: "",
  programId: "",
  sessionId: "",
  studentId: "",
  complianceItem: COMPLIANCE_ITEMS[0],
  status: "Completed",
  completionDate: new Date().toISOString().slice(0, 10),
  score: "",
  comments: "",
};

const getTrainerId = (t) =>
  String(t?.id ?? t?.trainerId ?? t?.portalId ?? t?.portalid ?? "");

const getTrainerName = (t) =>
  t?.name ||
  `${t?.firstName || t?.first_name || ""} ${t?.lastName || t?.last_name || ""}`.trim() ||
  t?.portalId ||
  "Trainer";

const studentName = (s) =>
  s?.name || `${s?.firstName || ""} ${s?.lastName || ""}`.trim() || s?.id || "Learner";

const statusBadgeKind = (status) => {
  switch (status) {
    case "Completed":
      return "On Track";
    case "In Progress":
      return "Needs Attention";
    case "Not Completed":
      return "Critical";
    default:
      return "Pending";
  }
};

function FilterField({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SummaryCard({ label, value, detail }) {
  return (
    <PremiumCard>
      <PremiumCardContent className="p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="mt-3 text-3xl font-bold">{value}</p>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </PremiumCardContent>
    </PremiumCard>
  );
}

export default function ComplianceTrackingPage() {
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);
  const localTrainers = useAppStore((s) => s.trainers);
  const trainings = useAppStore((s) => s.trainings);
  const sessions = useAppStore((s) => s.sessions);
  const students = useAppStore((s) => s.students);
  const enrollments = useAppStore((s) => s.enrollments);
  const logAdminEvent = useAppStore((s) => s.logAdminEvent);

  const trainersQuery = useQuery({
    queryKey: ["compliance", "trainers"],
    queryFn: () => api.trainers.list(),
    staleTime: 60_000,
  });

  const trainers = useMemo(() => {
    const remote = trainersQuery.data;
    const list = Array.isArray(remote)
      ? remote
      : Array.isArray(remote?.results)
        ? remote.results
        : Array.isArray(remote?.data)
          ? remote.data
          : null;
    return list && list.length ? list : localTrainers || [];
  }, [trainersQuery.data, localTrainers]);

  const [trainerFilter, setTrainerFilter] = useState(ALL_VALUE);
  const [programFilter, setProgramFilter] = useState(ALL_VALUE);
  const [sessionFilter, setSessionFilter] = useState(ALL_VALUE);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const recordsQuery = useQuery({
    queryKey: ["compliance", "records", { trainerFilter, programFilter, sessionFilter, dateFrom, dateTo }],
    queryFn: async () => {
      const query = {};
      if (trainerFilter !== ALL_VALUE) query.trainerId = trainerFilter;
      if (programFilter !== ALL_VALUE) query.programId = programFilter;
      if (sessionFilter !== ALL_VALUE) query.sessionId = sessionFilter;
      if (dateFrom) query.startDate = dateFrom;
      if (dateTo) query.endDate = dateTo;
      return api.compliance.list(query);
    },
    retry: false,
    staleTime: 30_000,
  });

  const [localRecords, setLocalRecords] = useState(() => {
    try {
      const raw = window.localStorage.getItem("tms.compliance.records");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const persistLocal = (next) => {
    setLocalRecords(next);
    try {
      window.localStorage.setItem("tms.compliance.records", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const records = useMemo(() => {
    const remote = recordsQuery.data;
    const list = Array.isArray(remote)
      ? remote
      : Array.isArray(remote?.results)
        ? remote.results
        : Array.isArray(remote?.data)
          ? remote.data
          : null;

    const base = list && list.length ? list : localRecords;

    return base.filter((r) => {
      if (trainerFilter !== ALL_VALUE && String(r.trainerId) !== trainerFilter) return false;
      if (programFilter !== ALL_VALUE && String(r.programId || "") !== programFilter) return false;
      if (sessionFilter !== ALL_VALUE && String(r.sessionId || "") !== sessionFilter) return false;
      const date = r.completionDate || (r.updatedAt || "").slice(0, 10);
      if (dateFrom && date && date < dateFrom) return false;
      if (dateTo && date && date > dateTo) return false;
      return true;
    });
  }, [recordsQuery.data, localRecords, trainerFilter, programFilter, sessionFilter, dateFrom, dateTo]);

  // Form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const formProgramSessions = useMemo(() => {
    if (!form.programId) return sessions;
    return sessions.filter((s) => String(s.trainingId) === String(form.programId));
  }, [form.programId, sessions]);

  const formStudents = useMemo(() => {
    if (!form.programId) return students;
    const enrolledIds = new Set(
      enrollments
        .filter((e) => String(e.trainingId) === String(form.programId))
        .map((e) => String(e.studentId)),
    );
    return students.filter((s) => enrolledIds.has(String(s.id)));
  }, [form.programId, enrollments, students]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (record) => {
    setEditingId(record.id || record.complianceId);
    setForm({
      trainerId: String(record.trainerId || ""),
      programId: String(record.programId || ""),
      sessionId: String(record.sessionId || ""),
      studentId: String(record.studentId || ""),
      complianceItem: record.complianceItem || COMPLIANCE_ITEMS[0],
      status: record.status || "Completed",
      completionDate: record.completionDate || "",
      score: record.score ?? "",
      comments: record.comments || "",
    });
    setDialogOpen(true);
  };

  const validate = () => {
    if (!form.trainerId) return "Trainer is required.";
    if (!form.complianceItem) return "Compliance item is required.";
    if (!form.status) return "Completion status is required.";
    if (form.score !== "" && form.score !== null) {
      const n = Number(form.score);
      if (!Number.isFinite(n) || n < 0 || n > 100) return "Score must be between 0 and 100.";
    }
    return null;
  };

  // Audit risk: agents taking calls vs. agents completed compliance, scoped by current filters
  const auditRisk = useMemo(() => {
    let scopedStudents = students;
    if (programFilter !== ALL_VALUE) {
      const enrolledIds = new Set(
        enrollments
          .filter((e) => String(e.trainingId) === programFilter)
          .map((e) => String(e.studentId)),
      );
      scopedStudents = students.filter((s) => enrolledIds.has(String(s.id)));
    }
    const takingCalls = scopedStudents.filter((s) =>
      ["Active", "Production", "Live", "Taking Calls"].includes(s.status),
    ).length || scopedStudents.length;

    const completedSet = new Set(
      records.filter((r) => r.status === "Completed").map((r) => String(r.studentId)),
    );
    const completed = completedSet.size;
    return {
      takingCalls,
      completed,
      atRisk: completed < takingCalls,
      gap: Math.max(0, takingCalls - completed),
    };
  }, [students, enrollments, records, programFilter]);

  const summary = useMemo(() => {
    const total = records.length;
    const completed = records.filter((r) => r.status === "Completed").length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    const atRiskClasses = new Set(
      records.filter((r) => r.status === "Not Completed" && r.programId).map((r) => r.programId),
    );
    return {
      learners: new Set(records.map((r) => r.studentId).filter(Boolean)).size,
      completed,
      pct: total ? `${pct}%` : "—",
      atRiskClasses: atRiskClasses.size,
      auditRisk: auditRisk.atRisk ? auditRisk.gap : 0,
    };
  }, [records, auditRisk]);

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const trainer = trainers.find((t) => getTrainerId(t) === form.trainerId);
    const program = trainings.find((t) => String(t.id) === form.programId);
    const session = sessions.find((s) => String(s.id) === form.sessionId);
    const student = students.find((s) => String(s.id) === form.studentId);

    const payload = {
      trainerId: form.trainerId,
      trainerName: getTrainerName(trainer),
      programId: form.programId || null,
      programName: program?.title || null,
      sessionId: form.sessionId || null,
      sessionName: session?.title || null,
      studentId: form.studentId || null,
      studentName: student ? studentName(student) : null,
      complianceItem: form.complianceItem,
      status: form.status,
      completionDate: form.completionDate || null,
      score: form.score === "" ? null : Number(form.score),
      comments: form.comments,
      riskFlag: form.status === "Not Completed",
      createdBy: user?.portalId || user?.id || "system",
    };

    setSaving(true);
    try {
      if (editingId) {
        try {
          await api.compliance.update(editingId, payload);
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 404) throw err;
        }
        const next = localRecords.map((r) =>
          (r.id || r.complianceId) === editingId
            ? { ...r, ...payload, id: editingId, updatedAt: new Date().toISOString() }
            : r,
        );
        persistLocal(next);
        logAdminEvent({
          action: "Compliance Entry Updated",
          entityId: editingId,
          payloadSummary: `Updated compliance for ${payload.studentName || payload.trainerName}.`,
        });
        toast.success("Compliance entry updated.");
      } else {
        let created = null;
        try {
          created = await api.compliance.create(payload);
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 404) throw err;
        }
        const id = created?.id || created?.complianceId || `comp-${Date.now()}`;
        const record = {
          id,
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        persistLocal([record, ...localRecords]);
        logAdminEvent({
          action: payload.riskFlag ? "Compliance Risk Flagged" : "Compliance Entry Created",
          entityId: id,
          payloadSummary: `${payload.complianceItem} for ${payload.studentName || payload.trainerName}: ${payload.status}.`,
        });
        toast.success("Compliance entry saved.");
      }
      queryClient.invalidateQueries({ queryKey: ["compliance", "records"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      toast.error(err?.message || "Failed to save compliance entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    const id = record.id || record.complianceId;
    if (!id) return;
    if (!window.confirm(`Delete compliance entry?`)) return;
    try {
      try {
        await api.compliance.remove(id);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 404) throw err;
      }
      persistLocal(localRecords.filter((r) => (r.id || r.complianceId) !== id));
      logAdminEvent({
        action: "Compliance Entry Deleted",
        entityId: id,
        payloadSummary: `Deleted compliance entry for ${record.studentName || record.trainerName}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["compliance", "records"] });
      toast.success("Compliance entry deleted.");
    } catch (err) {
      toast.error(err?.message || "Failed to delete compliance entry.");
    }
  };

  const filterSessions = useMemo(() => {
    if (programFilter === ALL_VALUE) return sessions;
    return sessions.filter((s) => String(s.trainingId) === programFilter);
  }, [programFilter, sessions]);

  const isLoading = trainersQuery.isLoading || recordsQuery.isLoading;
  const trainerLoadError = trainersQuery.isError;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon={ShieldCheck}
        eyebrow="Compliance"
        title="Compliance Tracking"
        description="Manually track training compliance for trainers, classes, and learners. Pre-call compliance gaps surface as audit risks."
        meta={
          <>
            <StatusBadge
              status={auditRisk.atRisk ? "Critical" : "On Track"}
              domain="compliance"
            />
            <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {records.length} record{records.length === 1 ? "" : "s"}
            </div>
          </>
        }
        actions={
          <Button className="rounded-full" onClick={openCreate} disabled={!trainers.length}>
            <Plus className="mr-2 h-4 w-4" />
            Add Compliance Entry
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Learners Started" value={summary.learners} detail="Unique learners tracked" />
        <SummaryCard label="Completed" value={summary.completed} detail="Compliance items completed" />
        <SummaryCard label="Completion %" value={summary.pct} detail="Across visible records" />
        <SummaryCard label="Classes at Risk" value={summary.atRiskClasses} detail="Programs with non-completion" />
        <SummaryCard label="Audit Risk" value={summary.auditRisk} detail="Agents taking calls without compliance" />
      </div>

      {auditRisk.atRisk ? (
        <div className="rounded-2xl border border-destructive/35 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Audit Risk: pre-call compliance gap</p>
              <p className="mt-1">
                {auditRisk.takingCalls} agent(s) taking calls, only {auditRisk.completed} completed compliance.
                Agents must complete compliance before taking calls.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {trainerLoadError ? (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50/50 px-5 py-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Trainer directory could not be loaded from backend. Showing cached trainer list.</p>
          </div>
        </div>
      ) : null}

      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="text-lg">Filters</PremiumCardTitle>
          <PremiumCardDescription>Narrow compliance records.</PremiumCardDescription>
        </PremiumCardHeader>
        <PremiumCardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <FilterField label="Trainer">
            <Select value={trainerFilter} onValueChange={setTrainerFilter}>
              <SelectTrigger><SelectValue placeholder="All trainers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All trainers</SelectItem>
                {trainers.map((t) => (
                  <SelectItem key={getTrainerId(t)} value={getTrainerId(t)}>
                    {getTrainerName(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Program">
            <Select
              value={programFilter}
              onValueChange={(v) => {
                setProgramFilter(v);
                setSessionFilter(ALL_VALUE);
              }}
            >
              <SelectTrigger><SelectValue placeholder="All programs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All programs</SelectItem>
                {trainings.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Session / Class">
            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger><SelectValue placeholder="All sessions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All sessions</SelectItem>
                {filterSessions.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="From">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </FilterField>

          <FilterField label="To">
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </FilterField>

          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => {
                setTrainerFilter(ALL_VALUE);
                setProgramFilter(ALL_VALUE);
                setSessionFilter(ALL_VALUE);
                setDateFrom("");
                setDateTo("");
              }}
            >
              Reset
            </Button>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="text-lg">Compliance Records</PremiumCardTitle>
          <PremiumCardDescription>
            Manual entries. Records flagged with risk indicate non-completion against pre-call compliance.
          </PremiumCardDescription>
        </PremiumCardHeader>
        <PremiumCardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : records.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Trainer</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Compliance Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Score %</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id || r.complianceId}>
                    <TableCell className="font-medium">{r.trainerName || "—"}</TableCell>
                    <TableCell>{r.programName || "—"}</TableCell>
                    <TableCell>{r.sessionName || "—"}</TableCell>
                    <TableCell>{r.studentName || "—"}</TableCell>
                    <TableCell>{r.complianceItem}</TableCell>
                    <TableCell><StatusBadge status={statusBadgeKind(r.status)} domain="compliance" /></TableCell>
                    <TableCell>{r.completionDate || "—"}</TableCell>
                    <TableCell>{r.score === null || r.score === undefined || r.score === "" ? "—" : `${r.score}%`}</TableCell>
                    <TableCell>
                      {r.riskFlag ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Risk
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(r.updatedAt || r.createdAt || "").slice(0, 10) || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r)} aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No compliance records found. Add a compliance entry to begin tracking completion.
            </div>
          )}
        </PremiumCardContent>
      </PremiumCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Compliance Entry" : "Add Compliance Entry"}</DialogTitle>
            <DialogDescription>
              Capture compliance completion linked to trainer, class, and learner.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Trainer *</Label>
              <Select value={form.trainerId} onValueChange={(v) => setForm((f) => ({ ...f, trainerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                <SelectContent>
                  {trainers.map((t) => (
                    <SelectItem key={getTrainerId(t)} value={getTrainerId(t)}>{getTrainerName(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Program</Label>
              <Select
                value={form.programId || NONE_VALUE}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    programId: v === NONE_VALUE ? "" : v,
                    sessionId: "",
                    studentId: "",
                  }))
                }
              >
                <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>—</SelectItem>
                  {trainings.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Session / Class</Label>
              <Select
                value={form.sessionId || NONE_VALUE}
                onValueChange={(v) => setForm((f) => ({ ...f, sessionId: v === NONE_VALUE ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>—</SelectItem>
                  {formProgramSessions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Student / Learner</Label>
              <Select
                value={form.studentId || NONE_VALUE}
                onValueChange={(v) => setForm((f) => ({ ...f, studentId: v === NONE_VALUE ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select learner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>—</SelectItem>
                  {formStudents.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{studentName(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Compliance Item *</Label>
              <Select value={form.complianceItem} onValueChange={(v) => setForm((f) => ({ ...f, complianceItem: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_ITEMS.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Completion Status *</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Completion Date</Label>
              <Input
                type="date"
                value={form.completionDate}
                onChange={(e) => setForm((f) => ({ ...f, completionDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Score % (0–100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.score}
                onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Comments</Label>
              <Textarea
                rows={3}
                value={form.comments}
                onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
                placeholder="Notes, evidence link, follow-ups…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update Entry" : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
