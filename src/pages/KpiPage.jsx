import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, Plus, Settings2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { buildKpiOverview, buildProgramKpiRows, buildTrainerKpiRows } from "@/lib/compliance-kpi";
import { useAppStore } from "@/store/app-store";

const ALL_VALUE = "all";

const resolveTrainerIdForUser = (user) => String(user?.trainerId || user?.id || "");

const manualMetricOptions = [
  { key: "utilizationPct", label: "Utilization" },
  { key: "observationScore", label: "Observation Score" },
  { key: "knowledgeRetentionScore", label: "Knowledge Retention" },
  { key: "qualityScore", label: "Nesting / Quality" },
  { key: "throughputPct", label: "Throughput" },
  { key: "attritionPct", label: "Attrition" },
  { key: "compliancePct", label: "Compliance Completion" },
  { key: "satisfactionPct", label: "Trainer Satisfaction" },
];

const formatTrainerName = (trainer) =>
  trainer?.name ||
  `${trainer?.firstName || ""} ${trainer?.lastName || ""}`.trim() ||
  "Trainer";

const defaultManualEntry = {
  trainerId: "",
  trainingId: "",
  metricKey: "knowledgeRetentionScore",
  value: "",
  effectiveDate: "",
  notes: "",
};

const defaultTargetEditor = {
  metricKey: "",
  targetValue: "",
};

function MetricCell({ value, metricDetail }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-muted-foreground">Pending</span>;
  }

  return (
    <div className="inline-flex items-center gap-2">
      <StatusBadge status={metricDetail?.status || "On Track"} domain="performance" />
      <span>{value}%</span>
    </div>
  );
}

export default function KpiPage() {
  const user = useAppStore((state) => state.user);
  const trainings = useAppStore((state) => state.trainings);
  const sessions = useAppStore((state) => state.sessions);
  const students = useAppStore((state) => state.students);
  const enrollments = useAppStore((state) => state.enrollments);
  const trainers = useAppStore((state) => state.trainers);
  const observations = useAppStore((state) => state.observations);
  const trainerUtilization = useAppStore((state) => state.trainerUtilization);
  const trainerObservations = useAppStore((state) => state.trainerObservations);
  const feedback = useAppStore((state) => state.feedback);
  const complianceItems = useAppStore((state) => state.complianceItems);
  const complianceRecords = useAppStore((state) => state.complianceRecords);
  const kpiTargets = useAppStore((state) => state.kpiTargets);
  const kpiManualEntries = useAppStore((state) => state.kpiManualEntries);
  const addKpiManualEntry = useAppStore((state) => state.addKpiManualEntry);
  const updateKpiTarget = useAppStore((state) => state.updateKpiTarget);

  const isTrainer = user?.role === "trainer";
  const canManageTargets = user?.role === "supervisor" || user?.role === "admin";
  const currentTrainerId = resolveTrainerIdForUser(user);

  const [trainerFilter, setTrainerFilter] = useState(isTrainer ? currentTrainerId : ALL_VALUE);
  const [programFilter, setProgramFilter] = useState(ALL_VALUE);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState({ ...defaultManualEntry, trainerId: isTrainer ? currentTrainerId : "", effectiveDate: new Date().toISOString().slice(0, 10) });
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetEditor, setTargetEditor] = useState(defaultTargetEditor);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");

  const visibleTrainers = useMemo(
    () => (isTrainer ? trainers.filter((trainer) => String(trainer.id) === currentTrainerId) : trainers),
    [currentTrainerId, isTrainer, trainers],
  );

  const visibleTrainings = useMemo(() => {
    const trainerScoped = isTrainer
      ? trainings.filter((training) => String(training.trainerId || training.trainer_id) === currentTrainerId)
      : trainings;

    return trainerScoped.filter((training) => {
      const matchesTrainer = trainerFilter === ALL_VALUE || String(training.trainerId || training.trainer_id) === trainerFilter;
      const matchesProgram = programFilter === ALL_VALUE || String(training.id) === programFilter;
      const dateValue = training.startDate || training.start_date || training.endDate || training.end_date || "";
      const matchesFrom = !dateFrom || dateValue >= dateFrom;
      const matchesTo = !dateTo || dateValue <= dateTo;
      return matchesTrainer && matchesProgram && matchesFrom && matchesTo;
    });
  }, [currentTrainerId, dateFrom, dateTo, isTrainer, programFilter, trainerFilter, trainings]);

  const trainerRows = useMemo(
    () =>
      buildTrainerKpiRows({
        trainers: visibleTrainers,
        trainings: visibleTrainings,
        sessions,
        students,
        enrollments,
        trainerUtilization,
        trainerObservations,
        observations,
        feedback,
        complianceRecords,
        complianceItems,
        kpiManualEntries,
        kpiTargets,
        fromDate: dateFrom,
        toDate: dateTo,
      }).sort((left, right) => right.overallScore - left.overallScore),
    [complianceItems, complianceRecords, dateFrom, dateTo, enrollments, feedback, kpiManualEntries, kpiTargets, observations, sessions, students, trainerObservations, trainerUtilization, visibleTrainings, visibleTrainers],
  );

  const programRows = useMemo(
    () =>
      buildProgramKpiRows({
        trainings: visibleTrainings,
        sessions,
        students,
        enrollments,
        trainers: visibleTrainers,
        trainerUtilization,
        trainerObservations,
        observations,
        feedback,
        complianceRecords,
        complianceItems,
        kpiManualEntries,
        kpiTargets,
        fromDate: dateFrom,
        toDate: dateTo,
      }).sort((left, right) => right.overallScore - left.overallScore),
    [complianceItems, complianceRecords, dateFrom, dateTo, enrollments, feedback, kpiManualEntries, kpiTargets, observations, sessions, students, trainerObservations, trainerUtilization, visibleTrainings, visibleTrainers],
  );

  const overview = useMemo(() => buildKpiOverview(trainerRows), [trainerRows]);
  const selectedTrainerRow = trainerRows.find((row) => row.trainerId === selectedTrainerId) || trainerRows[0] || null;
  const selectedProgramRow = programRows.find((row) => row.trainingId === selectedProgramId) || programRows[0] || null;
  const visibleManualEntries = useMemo(
    () =>
      kpiManualEntries.filter((entry) => {
        if (isTrainer && String(entry.trainerId) !== currentTrainerId) {
          return false;
        }

        if (trainerFilter !== ALL_VALUE && String(entry.trainerId) !== trainerFilter) {
          return false;
        }

        if (programFilter !== ALL_VALUE && String(entry.trainingId || "") !== programFilter) {
          return false;
        }

        const dateValue = entry.effectiveDate || entry.updatedAt?.slice(0, 10) || "";
        if (dateFrom && dateValue < dateFrom) {
          return false;
        }
        if (dateTo && dateValue > dateTo) {
          return false;
        }

        return true;
      }),
    [currentTrainerId, dateFrom, dateTo, isTrainer, kpiManualEntries, programFilter, trainerFilter],
  );

  const handleManualEntrySave = () => {
    if (!manualEntry.trainerId || !manualEntry.metricKey || manualEntry.value === "" || !manualEntry.effectiveDate) {
      toast.error("Complete the required KPI entry fields.");
      return;
    }

    addKpiManualEntry({
      trainerId: manualEntry.trainerId,
      trainingId: manualEntry.trainingId || "",
      metricKey: manualEntry.metricKey,
      value: Number(manualEntry.value),
      effectiveDate: manualEntry.effectiveDate,
      notes: manualEntry.notes,
    });

    toast.success("KPI manual entry saved.");
    setManualOpen(false);
    setManualEntry({ ...defaultManualEntry, trainerId: isTrainer ? currentTrainerId : "", effectiveDate: new Date().toISOString().slice(0, 10) });
  };

  const handleTargetSave = () => {
    if (!targetEditor.metricKey || targetEditor.targetValue === "") {
      toast.error("Select a metric and target value.");
      return;
    }

    updateKpiTarget(targetEditor.metricKey, {
      targetValue: Number(targetEditor.targetValue),
    });

    toast.success("KPI target updated.");
    setTargetOpen(false);
    setTargetEditor(defaultTargetEditor);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={TrendingUp}
        eyebrow="KPI"
        title="KPI Scorecards"
        description="Review supervisor-owned KPI scorecards powered by manual metric inputs and manual compliance completion tracking."
        meta={
          <>
            <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {trainerRows.length} trainer scorecards
            </div>
            <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {programRows.length} class scorecards
            </div>
          </>
        }
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={() => setTargetOpen(true)} disabled={!canManageTargets}>
              <Settings2 className="mr-2 h-4 w-4" />
              Targets
            </Button>
            <Button className="rounded-full" onClick={() => setManualOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Manual KPI Entry
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-5">
        <PremiumCard>
          <PremiumCardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Overall KPI</p>
            <p className="mt-3 text-3xl font-bold">{overview.overallScore}%</p>
          </PremiumCardContent>
        </PremiumCard>
        <PremiumCard>
          <PremiumCardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Compliance Avg</p>
            <p className="mt-3 text-3xl font-bold">{overview.compliancePct}%</p>
          </PremiumCardContent>
        </PremiumCard>
        <PremiumCard>
          <PremiumCardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Utilization Avg</p>
            <p className="mt-3 text-3xl font-bold">{overview.utilizationPct}%</p>
          </PremiumCardContent>
        </PremiumCard>
        <PremiumCard>
          <PremiumCardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Below Target</p>
            <p className="mt-3 text-3xl font-bold">{overview.belowTargetCount}</p>
          </PremiumCardContent>
        </PremiumCard>
        <PremiumCard>
          <PremiumCardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Pending Inputs</p>
            <p className="mt-3 text-3xl font-bold">{overview.pendingInputCount}</p>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      {overview.belowTargetCount > 0 && (
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/5 px-5 py-4 text-sm text-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Below-target KPI performance detected</p>
              <p className="mt-1">
                {overview.belowTargetCount} trainer scorecard(s) currently sit below at least one KPI target. Use the drill-down panels to see which components need intervention.
              </p>
            </div>
          </div>
        </div>
      )}

      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="text-lg">Filters</PremiumCardTitle>
        </PremiumCardHeader>
        <PremiumCardContent className="grid gap-4 md:grid-cols-4">
          {!isTrainer && (
            <div className="space-y-2">
              <Label>Trainer</Label>
              <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                <SelectTrigger><SelectValue placeholder="All trainers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All trainers</SelectItem>
                  {visibleTrainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={String(trainer.id)}>{formatTrainerName(trainer)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Program / Batch</Label>
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger><SelectValue placeholder="All programs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All programs</SelectItem>
                {visibleTrainings.map((training) => (
                  <SelectItem key={training.id} value={String(training.id)}>{training.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>From</Label>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>To</Label>
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        </PremiumCardContent>
      </PremiumCard>

      <Tabs defaultValue="trainers" className="space-y-4">
        <TabsList className="flex w-fit flex-wrap rounded-full border border-border/50 bg-background/70 p-1">
          <TabsTrigger value="trainers" className="rounded-full">Trainer Scorecards</TabsTrigger>
          <TabsTrigger value="programs" className="rounded-full">Class Scorecards</TabsTrigger>
          <TabsTrigger value="manual" className="rounded-full">Manual Inputs</TabsTrigger>
          <TabsTrigger value="targets" className="rounded-full">Targets</TabsTrigger>
        </TabsList>

        <TabsContent value="trainers" className="space-y-6">
          <PremiumCard>
            <PremiumCardHeader>
              <PremiumCardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Trainer KPI Summary
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Trainer</TableHead>
                      <TableHead>Overall</TableHead>
                      <TableHead>Compliance</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Observation</TableHead>
                      <TableHead>Knowledge</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Throughput</TableHead>
                      <TableHead>Attrition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainerRows.length ? (
                      trainerRows.map((row) => (
                        <TableRow key={row.trainerId} className="cursor-pointer" onClick={() => setSelectedTrainerId(row.trainerId)}>
                          <TableCell className="font-medium">{row.trainer}</TableCell>
                          <TableCell className="font-semibold">{row.overallScore}%</TableCell>
                          <TableCell><MetricCell value={row.compliancePct} metricDetail={row.metricDetails.find((metric) => metric.key === "compliancePct")} /></TableCell>
                          <TableCell><MetricCell value={row.utilizationPct} metricDetail={row.metricDetails.find((metric) => metric.key === "utilizationPct")} /></TableCell>
                          <TableCell><MetricCell value={row.observationScore} metricDetail={row.metricDetails.find((metric) => metric.key === "observationScore")} /></TableCell>
                          <TableCell><MetricCell value={row.knowledgeRetentionScore} metricDetail={row.metricDetails.find((metric) => metric.key === "knowledgeRetentionScore")} /></TableCell>
                          <TableCell><MetricCell value={row.qualityScore} metricDetail={row.metricDetails.find((metric) => metric.key === "qualityScore")} /></TableCell>
                          <TableCell><MetricCell value={row.throughputPct} metricDetail={row.metricDetails.find((metric) => metric.key === "throughputPct")} /></TableCell>
                          <TableCell><MetricCell value={row.attritionPct} metricDetail={row.metricDetails.find((metric) => metric.key === "attritionPct")} /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                          No trainer KPI scorecards are available for the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </PremiumCardContent>
          </PremiumCard>

          {selectedTrainerRow && (
            <PremiumCard>
              <PremiumCardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <PremiumCardTitle className="text-lg">{selectedTrainerRow.trainer}</PremiumCardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedTrainerRow.learnersTracked} learners tracked across {selectedTrainerRow.activePrograms} active program(s)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedTrainerRow.belowTargetMetrics.length > 0 ? (
                    selectedTrainerRow.belowTargetMetrics.map((metric) => (
                      <StatusBadge key={metric} status="Below Target" domain="performance" />
                    ))
                  ) : (
                    <StatusBadge status="On Track" domain="performance" />
                  )}
                </div>
              </PremiumCardHeader>
              <PremiumCardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  {selectedTrainerRow.metricDetails.map((metric) => (
                    <div key={metric.key} className="rounded-2xl border border-border/60 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                        <StatusBadge status={metric.status === "Pending Input" ? "Needs Attention" : metric.status} domain="performance" />
                      </div>
                      <p className="mt-3 text-2xl font-bold">{metric.value === null ? "Pending" : `${metric.value}%`}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Target: {metric.targetValue}%</p>
                      <p className="mt-2 text-xs text-muted-foreground">{metric.source}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border/60 p-4">
                  <p className="text-sm font-semibold">Recent manual KPI inputs</p>
                  {selectedTrainerRow.manualEntries.length ? (
                    <div className="mt-3 space-y-2">
                      {selectedTrainerRow.manualEntries.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="rounded-xl bg-muted/25 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium">{manualMetricOptions.find((item) => item.key === entry.metricKey)?.label || entry.metricKey}</span>
                            <span>{entry.value}%</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{entry.effectiveDate} - {entry.notes || "No notes provided"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No recent manual KPI inputs for this trainer.</p>
                  )}
                </div>
              </PremiumCardContent>
            </PremiumCard>
          )}
        </TabsContent>

        <TabsContent value="programs" className="space-y-6">
          <PremiumCard>
            <PremiumCardHeader>
              <PremiumCardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Class / Batch KPI Summary
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Program</TableHead>
                      <TableHead>Trainer</TableHead>
                      <TableHead>Overall</TableHead>
                      <TableHead>Compliance</TableHead>
                      <TableHead>Knowledge</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Throughput</TableHead>
                      <TableHead>Attrition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programRows.length ? (
                      programRows.map((row) => (
                        <TableRow key={row.trainingId} className="cursor-pointer" onClick={() => setSelectedProgramId(row.trainingId)}>
                          <TableCell className="font-medium">{row.program}</TableCell>
                          <TableCell>{row.trainer}</TableCell>
                          <TableCell className="font-semibold">{row.overallScore}%</TableCell>
                          <TableCell><MetricCell value={row.compliancePct} metricDetail={row.metricDetails.find((metric) => metric.key === "compliancePct")} /></TableCell>
                          <TableCell><MetricCell value={row.knowledgeRetentionScore} metricDetail={row.metricDetails.find((metric) => metric.key === "knowledgeRetentionScore")} /></TableCell>
                          <TableCell><MetricCell value={row.qualityScore} metricDetail={row.metricDetails.find((metric) => metric.key === "qualityScore")} /></TableCell>
                          <TableCell><MetricCell value={row.throughputPct} metricDetail={row.metricDetails.find((metric) => metric.key === "throughputPct")} /></TableCell>
                          <TableCell><MetricCell value={row.attritionPct} metricDetail={row.metricDetails.find((metric) => metric.key === "attritionPct")} /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                          No class KPI scorecards are available for the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </PremiumCardContent>
          </PremiumCard>

          {selectedProgramRow && (
            <PremiumCard>
              <PremiumCardHeader>
                <PremiumCardTitle className="text-lg">{selectedProgramRow.program}</PremiumCardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedProgramRow.trainer} - {selectedProgramRow.learnersTracked} learners tracked
                </p>
              </PremiumCardHeader>
              <PremiumCardContent className="grid gap-4 md:grid-cols-4">
                {selectedProgramRow.metricDetails.map((metric) => (
                  <div key={metric.key} className="rounded-2xl border border-border/60 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                      <StatusBadge status={metric.status === "Pending Input" ? "Needs Attention" : metric.status} domain="performance" />
                    </div>
                    <p className="mt-3 text-2xl font-bold">{metric.value === null ? "Pending" : `${metric.value}%`}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{metric.source}</p>
                  </div>
                ))}
              </PremiumCardContent>
            </PremiumCard>
          )}
        </TabsContent>

        <TabsContent value="manual">
          <PremiumCard>
            <PremiumCardHeader className="flex flex-row items-center justify-between gap-3">
              <PremiumCardTitle className="text-lg">Manual KPI Inputs</PremiumCardTitle>
              <Button className="rounded-full" onClick={() => setManualOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Input
              </Button>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Metric</TableHead>
                      <TableHead>Trainer</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleManualEntries.length ? (
                      visibleManualEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{manualMetricOptions.find((item) => item.key === entry.metricKey)?.label || entry.metricKey}</TableCell>
                          <TableCell>{trainers.find((trainer) => String(trainer.id) === String(entry.trainerId))?.name || entry.trainerId}</TableCell>
                          <TableCell>{trainings.find((training) => String(training.id) === String(entry.trainingId))?.title || "Trainer-level"}</TableCell>
                          <TableCell>{entry.value}%</TableCell>
                          <TableCell>{entry.effectiveDate}</TableCell>
                          <TableCell className="max-w-[320px] text-sm text-muted-foreground">{entry.notes || "No notes"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          No manual KPI inputs match the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="targets">
          <PremiumCard>
            <PremiumCardHeader className="flex flex-row items-center justify-between gap-3">
              <PremiumCardTitle className="text-lg">KPI Targets and Thresholds</PremiumCardTitle>
              <Button variant="outline" className="rounded-full" onClick={() => setTargetOpen(true)} disabled={!canManageTargets}>
                <Settings2 className="mr-2 h-4 w-4" />
                Edit Target
              </Button>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Metric</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpiTargets.map((target) => (
                      <TableRow key={target.metricKey}>
                        <TableCell className="font-medium">{target.label}</TableCell>
                        <TableCell>{target.targetValue}%</TableCell>
                        <TableCell>{target.direction === "max" ? "Max allowed" : "Minimum required"}</TableCell>
                        <TableCell>{target.weight}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>
      </Tabs>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manual KPI Entry</DialogTitle>
            <DialogDescription>
              Capture manual KPI metrics for scorecards. This workflow is intentionally manual so supervisors can manage KPI tracking before deeper integrations are in place.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Trainer</Label>
              <Select value={manualEntry.trainerId} onValueChange={(value) => setManualEntry((current) => ({ ...current, trainerId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                <SelectContent>
                  {visibleTrainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={String(trainer.id)}>{formatTrainerName(trainer)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Program / Batch</Label>
              <Select value={manualEntry.trainingId || ALL_VALUE} onValueChange={(value) => setManualEntry((current) => ({ ...current, trainingId: value === ALL_VALUE ? "" : value }))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Trainer-level metric</SelectItem>
                  {visibleTrainings.map((training) => (
                    <SelectItem key={training.id} value={String(training.id)}>{training.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Metric</Label>
              <Select value={manualEntry.metricKey} onValueChange={(value) => setManualEntry((current) => ({ ...current, metricKey: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {manualMetricOptions.map((item) => (
                    <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={manualEntry.value}
                onChange={(event) => setManualEntry((current) => ({ ...current, value: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={manualEntry.effectiveDate}
                onChange={(event) => setManualEntry((current) => ({ ...current, effectiveDate: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={manualEntry.notes}
              onChange={(event) => setManualEntry((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Explain where this KPI came from, what period it covers, and any caveats."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>Cancel</Button>
            <Button onClick={handleManualEntrySave}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Save KPI Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={targetOpen} onOpenChange={setTargetOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>KPI Target</DialogTitle>
            <DialogDescription>
              Adjust threshold targets for KPI evaluation. These thresholds drive below-target highlighting across scorecards.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Metric</Label>
              <Select value={targetEditor.metricKey} onValueChange={(value) => {
                const target = kpiTargets.find((item) => item.metricKey === value);
                setTargetEditor({
                  metricKey: value,
                  targetValue: target ? String(target.targetValue) : "",
                });
              }}>
                <SelectTrigger><SelectValue placeholder="Select metric" /></SelectTrigger>
                <SelectContent>
                  {kpiTargets.map((target) => (
                    <SelectItem key={target.metricKey} value={target.metricKey}>{target.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Value (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={targetEditor.targetValue}
                onChange={(event) => setTargetEditor((current) => ({ ...current, targetValue: event.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetOpen(false)}>Cancel</Button>
            <Button onClick={handleTargetSave} disabled={!canManageTargets}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Save Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
