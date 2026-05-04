import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
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
const TARGET_SCORE = 80;
const CRITICAL_SCORE = 60;

const SCORE_FIELDS = [
  { key: "utilizationScore", label: "Utilization" },
  { key: "complianceScore", label: "Compliance" },
  { key: "knowledgeRetentionScore", label: "Knowledge Retention" },
  { key: "observationScore", label: "Observation" },
  { key: "reliabilityScore", label: "Reliability" },
];

const emptyForm = {
  trainerId: "",
  reportingPeriod: new Date().toISOString().slice(0, 7),
  trainingId: "",
  utilizationScore: "",
  complianceScore: "",
  knowledgeRetentionScore: "",
  observationScore: "",
  reliabilityScore: "",
  overallScore: "",
  comments: "",
};

const formatScore = (value) =>
  value === null || value === undefined || value === "" ? "—" : `${Number(value).toFixed(0)}%`;

const computeOverall = (form) => {
  const values = SCORE_FIELDS.map((field) => Number(form[field.key])).filter(
    (value) => Number.isFinite(value) && value >= 0,
  );
  if (!values.length) return null;
  return Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);
};

const statusForScore = (score) => {
  if (score === null || score === undefined || score === "") return "Pending";
  const value = Number(score);
  if (value >= TARGET_SCORE) return "On Track";
  if (value >= CRITICAL_SCORE) return "Needs Attention";
  return "Critical";
};

const getTrainerName = (trainer) =>
  trainer?.name ||
  `${trainer?.firstName || trainer?.first_name || ""} ${trainer?.lastName || trainer?.last_name || ""}`.trim() ||
  trainer?.portalId ||
  trainer?.id ||
  "Trainer";

const getTrainerId = (trainer) =>
  String(trainer?.id ?? trainer?.trainerId ?? trainer?.portalId ?? trainer?.portalid ?? "");

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

export default function KpiPage() {
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);
  const localTrainers = useAppStore((s) => s.trainers);
  const trainings = useAppStore((s) => s.trainings);
  const logAdminEvent = useAppStore((s) => s.logAdminEvent);

  // Trainers from backend, fall back to store
  const trainersQuery = useQuery({
    queryKey: ["kpi", "trainers"],
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
    if (list && list.length) return list;
    return localTrainers || [];
  }, [trainersQuery.data, localTrainers]);

  // KPI records: try backend, fall back to local cache
  const [localRecords, setLocalRecords] = useState(() => {
    try {
      const raw = window.localStorage.getItem("tms.kpi.records");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [trainerFilter, setTrainerFilter] = useState(ALL_VALUE);
  const [programFilter, setProgramFilter] = useState(ALL_VALUE);
  const [monthFilter, setMonthFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const recordsQuery = useQuery({
    queryKey: [
      "kpi",
      "records",
      { trainerFilter, programFilter, monthFilter, dateFrom, dateTo },
    ],
    queryFn: async () => {
      const query = {};
      if (trainerFilter !== ALL_VALUE) query.trainerId = trainerFilter;
      if (programFilter !== ALL_VALUE) query.programId = programFilter;
      if (monthFilter) query.month = monthFilter;
      if (dateFrom) query.startDate = dateFrom;
      if (dateTo) query.endDate = dateTo;
      return api.kpi.list(query);
    },
    retry: false,
    staleTime: 30_000,
  });

  const persistLocal = (next) => {
    setLocalRecords(next);
    try {
      window.localStorage.setItem("tms.kpi.records", JSON.stringify(next));
    } catch {
      // ignore quota
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

    return base.filter((record) => {
      if (trainerFilter !== ALL_VALUE && String(record.trainerId) !== trainerFilter) return false;
      if (programFilter !== ALL_VALUE && String(record.programId || record.trainingId || "") !== programFilter)
        return false;
      if (monthFilter && (record.reportingPeriod || "").slice(0, 7) !== monthFilter) return false;
      const date = record.reportingPeriod || record.updatedAt?.slice(0, 10) || "";
      if (dateFrom && date < dateFrom) return false;
      if (dateTo && date > dateTo) return false;
      return true;
    });
  }, [recordsQuery.data, localRecords, trainerFilter, programFilter, monthFilter, dateFrom, dateTo]);

  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form.overallScore) {
      const auto = computeOverall(form);
      if (auto !== null) {
        setForm((current) => ({ ...current, overallScore: String(auto) }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.utilizationScore,
    form.complianceScore,
    form.knowledgeRetentionScore,
    form.observationScore,
    form.reliabilityScore,
  ]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, reportingPeriod: monthFilter || emptyForm.reportingPeriod });
    setDialogOpen(true);
  };

  const openEdit = (record) => {
    setEditingId(record.id || record.kpiId);
    setForm({
      trainerId: String(record.trainerId || ""),
      reportingPeriod: record.reportingPeriod || "",
      trainingId: String(record.programId || record.trainingId || ""),
      utilizationScore: record.utilizationScore ?? "",
      complianceScore: record.complianceScore ?? "",
      knowledgeRetentionScore: record.knowledgeRetentionScore ?? "",
      observationScore: record.observationScore ?? "",
      reliabilityScore: record.reliabilityScore ?? "",
      overallScore: record.overallScore ?? "",
      comments: record.comments || "",
    });
    setDialogOpen(true);
  };

  const validate = () => {
    if (!form.trainerId) return "Trainer is required.";
    if (!form.reportingPeriod) return "Reporting period is required.";
    for (const field of SCORE_FIELDS) {
      const value = form[field.key];
      if (value === "" || value === null || value === undefined) continue;
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
        return `${field.label} must be between 0 and 100.`;
      }
    }
    if (form.overallScore !== "" && (Number(form.overallScore) < 0 || Number(form.overallScore) > 100)) {
      return "Overall KPI must be between 0 and 100.";
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const trainer = trainers.find((t) => getTrainerId(t) === form.trainerId);
    const overall = form.overallScore !== "" ? Number(form.overallScore) : computeOverall(form);

    const payload = {
      trainerId: form.trainerId,
      trainerName: getTrainerName(trainer),
      reportingPeriod: form.reportingPeriod,
      programId: form.trainingId || null,
      utilizationScore: form.utilizationScore === "" ? null : Number(form.utilizationScore),
      complianceScore: form.complianceScore === "" ? null : Number(form.complianceScore),
      knowledgeRetentionScore:
        form.knowledgeRetentionScore === "" ? null : Number(form.knowledgeRetentionScore),
      observationScore: form.observationScore === "" ? null : Number(form.observationScore),
      reliabilityScore: form.reliabilityScore === "" ? null : Number(form.reliabilityScore),
      overallScore: overall,
      comments: form.comments,
      createdBy: user?.portalId || user?.id || "system",
    };

    setSaving(true);
    try {
      if (editingId) {
        try {
          await api.kpi.update(editingId, payload);
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 404) throw err;
        }
        const next = localRecords.map((r) =>
          (r.id || r.kpiId) === editingId ? { ...r, ...payload, id: editingId, updatedAt: new Date().toISOString() } : r,
        );
        persistLocal(next);
        logAdminEvent({
          action: "KPI Entry Updated",
          entityId: editingId,
          payloadSummary: `Updated KPI for ${payload.trainerName} (${payload.reportingPeriod}).`,
        });
        toast.success("KPI entry updated.");
      } else {
        let created = null;
        try {
          created = await api.kpi.create(payload);
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 404) throw err;
        }
        const id = created?.id || created?.kpiId || `kpi-${Date.now()}`;
        const record = {
          id,
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        persistLocal([record, ...localRecords]);
        logAdminEvent({
          action: "KPI Entry Created",
          entityId: id,
          payloadSummary: `Captured KPI for ${payload.trainerName} (${payload.reportingPeriod}).`,
        });
        toast.success("KPI entry saved.");
      }
      queryClient.invalidateQueries({ queryKey: ["kpi", "records"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      toast.error(err?.message || "Failed to save KPI entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    const id = record.id || record.kpiId;
    if (!id) return;
    if (!window.confirm(`Delete KPI entry for ${record.trainerName}?`)) return;
    try {
      try {
        await api.kpi.remove(id);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 404) throw err;
      }
      persistLocal(localRecords.filter((r) => (r.id || r.kpiId) !== id));
      logAdminEvent({
        action: "KPI Entry Deleted",
        entityId: id,
        payloadSummary: `Deleted KPI for ${record.trainerName}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["kpi", "records"] });
      toast.success("KPI entry deleted.");
    } catch (err) {
      toast.error(err?.message || "Failed to delete KPI entry.");
    }
  };

  // Summary
  const summary = useMemo(() => {
    if (!records.length) {
      return {
        reviewed: 0,
        avg: "—",
        belowTarget: 0,
        highest: "—",
        currentMonth: monthFilter || new Date().toISOString().slice(0, 7),
      };
    }
    const uniqueTrainers = new Set(records.map((r) => String(r.trainerId)));
    const valid = records.filter((r) => Number.isFinite(Number(r.overallScore)));
    const avg = valid.length
      ? Math.round(valid.reduce((sum, r) => sum + Number(r.overallScore), 0) / valid.length)
      : 0;
    const highest = valid.length ? Math.max(...valid.map((r) => Number(r.overallScore))) : 0;
    const belowTarget = valid.filter((r) => Number(r.overallScore) < TARGET_SCORE).length;
    return {
      reviewed: uniqueTrainers.size,
      avg: valid.length ? `${avg}%` : "—",
      belowTarget,
      highest: valid.length ? `${highest}%` : "—",
      currentMonth: monthFilter || new Date().toISOString().slice(0, 7),
    };
  }, [records, monthFilter]);

  const isLoading = trainersQuery.isLoading || recordsQuery.isLoading;
  const trainerLoadError = trainersQuery.isError;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon={TrendingUp}
        eyebrow="KPI"
        title="Trainer KPI"
        description="Manually record and review trainer KPI scores. Trainers are pulled from the directory; entries save to the KPI service and reload automatically."
        meta={
          <>
            <StatusBadge
              status={summary.belowTarget > 0 ? "Needs Attention" : "On Track"}
              domain="performance"
            />
            <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {records.length} record{records.length === 1 ? "" : "s"}
            </div>
          </>
        }
        actions={
          <Button className="rounded-full" onClick={openCreate} disabled={!trainers.length}>
            <Plus className="mr-2 h-4 w-4" />
            Add KPI Entry
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Trainers Reviewed" value={summary.reviewed} detail="Unique trainers in scope" />
        <SummaryCard label="Average KPI" value={summary.avg} detail={`Target ${TARGET_SCORE}%`} />
        <SummaryCard label="Below Target" value={summary.belowTarget} detail="Scores under target" />
        <SummaryCard label="Highest KPI" value={summary.highest} detail="Top performer" />
        <SummaryCard label="Reporting Month" value={summary.currentMonth} detail="Active filter" />
      </div>

      {trainerLoadError ? (
        <div className="rounded-2xl border border-destructive/35 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Trainer directory could not be loaded from backend. Showing cached trainer list.</p>
          </div>
        </div>
      ) : null}

      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="text-lg">Filters</PremiumCardTitle>
          <PremiumCardDescription>Search and narrow KPI records.</PremiumCardDescription>
        </PremiumCardHeader>
        <PremiumCardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <FilterField label="Trainer">
            <Select value={trainerFilter} onValueChange={setTrainerFilter}>
              <SelectTrigger><SelectValue placeholder="All trainers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All trainers</SelectItem>
                {trainers.map((trainer) => (
                  <SelectItem key={getTrainerId(trainer)} value={getTrainerId(trainer)}>
                    {getTrainerName(trainer)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Program">
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger><SelectValue placeholder="All programs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All programs</SelectItem>
                {trainings.map((training) => (
                  <SelectItem key={training.id} value={String(training.id)}>
                    {training.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Month">
            <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
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
                setMonthFilter("");
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
          <PremiumCardTitle className="text-lg">KPI Records</PremiumCardTitle>
          <PremiumCardDescription>Manual KPI entries linked to trainers and reporting periods.</PremiumCardDescription>
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
                  <TableHead>Period</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Knowledge</TableHead>
                  <TableHead>Observation</TableHead>
                  <TableHead>Reliability</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id || record.kpiId}>
                    <TableCell className="font-medium">{record.trainerName}</TableCell>
                    <TableCell>{record.reportingPeriod}</TableCell>
                    <TableCell>{formatScore(record.utilizationScore)}</TableCell>
                    <TableCell>{formatScore(record.complianceScore)}</TableCell>
                    <TableCell>{formatScore(record.knowledgeRetentionScore)}</TableCell>
                    <TableCell>{formatScore(record.observationScore)}</TableCell>
                    <TableCell>{formatScore(record.reliabilityScore)}</TableCell>
                    <TableCell className="font-semibold">{formatScore(record.overallScore)}</TableCell>
                    <TableCell>
                      <StatusBadge status={statusForScore(record.overallScore)} domain="performance" />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(record.updatedAt || record.createdAt || "").slice(0, 10) || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(record)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(record)}
                          aria-label="Delete"
                        >
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
              No KPI records found. Add a KPI entry to begin tracking trainer performance.
            </div>
          )}
        </PremiumCardContent>
      </PremiumCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit KPI Entry" : "Add KPI Entry"}</DialogTitle>
            <DialogDescription>
              Capture per-metric scores for a trainer and reporting period. Scores must be 0–100.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Trainer *</Label>
              <Select value={form.trainerId} onValueChange={(v) => setForm((f) => ({ ...f, trainerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                <SelectContent>
                  {trainers.map((trainer) => (
                    <SelectItem key={getTrainerId(trainer)} value={getTrainerId(trainer)}>
                      {getTrainerName(trainer)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reporting Period *</Label>
              <Input
                type="month"
                value={form.reportingPeriod}
                onChange={(e) => setForm((f) => ({ ...f, reportingPeriod: e.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Program (optional)</Label>
              <Select
                value={form.trainingId || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, trainingId: v === "none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="No program" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No program</SelectItem>
                  {trainings.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {SCORE_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label} (0–100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form[field.key]}
                  onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value, overallScore: "" }))}
                />
              </div>
            ))}

            <div className="space-y-2">
              <Label>Overall KPI (auto-calculated)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.overallScore}
                onChange={(e) => setForm((f) => ({ ...f, overallScore: e.target.value }))}
                placeholder="Auto from per-metric average"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Comments</Label>
              <Textarea
                rows={3}
                value={form.comments}
                onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
                placeholder="Notes, context, follow-ups…"
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
