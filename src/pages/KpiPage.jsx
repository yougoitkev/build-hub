import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Settings2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { PremiumCard, PremiumCardContent, PremiumCardDescription, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
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

const manualMetricOptions = [
  { key: "utilizationPct", label: "Utilization %" },
  { key: "satisfactionPct", label: "Trainer Satisfaction %" },
  { key: "compliancePct", label: "Compliance %" },
  { key: "knowledgeRetentionScore", label: "Knowledge Retention %" },
  { key: "qualityScore", label: "Nesting / Quality %" },
  { key: "attritionPct", label: "Attrition %" },
  { key: "observationScore", label: "Observation Score %" },
  { key: "throughputPct", label: "Throughput %" },
];

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

const formatPercent = (value) => (value === null || value === undefined ? "Pending" : `${Number(value).toFixed(0)}%`);

function FilterField({ label, children }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
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
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </PremiumCardContent>
    </PremiumCard>
  );
}

function MetricList({ metrics }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.key} className="rounded-xl border border-border/50 bg-muted/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{metric.label}</p>
              <p className="mt-1 text-2xl font-bold">{metric.value === null || metric.value === undefined ? "Pending" : `${metric.value}%`}</p>
            </div>
            <StatusBadge status={metric.status} domain="performance" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Target: {metric.targetValue}% • Source: {metric.source}
          </p>
        </div>
      ))}
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
  const complianceItems = useAppStore((state) => state.complianceItems);
  const complianceRecords = useAppStore((state) => state.complianceRecords);
  const kpiTargets = useAppStore((state) => state.kpiTargets);
  const kpiManualEntries = useAppStore((state) => state.kpiManualEntries);
  const addKpiManualEntry = useAppStore((state) => state.addKpiManualEntry);
  const updateKpiTarget = useAppStore((state) => state.updateKpiTarget);

  const [trainerFilter, setTrainerFilter] = useState(ALL_VALUE);
  const [programFilter, setProgramFilter] = useState(ALL_VALUE);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [manualEntry, setManualEntry] = useState({ ...defaultManualEntry, effectiveDate: new Date().toISOString().slice(0, 10) });
  const [targetEditor, setTargetEditor] = useState(defaultTargetEditor);

  const visibleTrainers = trainers;
  const visibleTrainings = useMemo(
    () =>
      trainings.filter((training) => {
        const matchesTrainer = trainerFilter === ALL_VALUE || String(training.trainerId || training.trainer_id) === trainerFilter;
        const matchesProgram = programFilter === ALL_VALUE || String(training.id) === programFilter;
        const dateValue = training.startDate || training.start_date || training.endDate || training.end_date || "";
        const matchesFrom = !dateFrom || dateValue >= dateFrom;
        const matchesTo = !dateTo || dateValue <= dateTo;
        return matchesTrainer && matchesProgram && matchesFrom && matchesTo;
      }),
    [dateFrom, dateTo, programFilter, trainerFilter, trainings],
  );

  const trainerRows = useMemo(
    () =>
      buildTrainerKpiRows({
        trainers: visibleTrainers,
        trainings: visibleTrainings,
        sessions,
        students,
        enrollments,
        complianceRecords,
        complianceItems,
        kpiManualEntries,
        kpiTargets,
        fromDate: dateFrom,
        toDate: dateTo,
      }).sort((left, right) => right.overallScore - left.overallScore),
    [complianceItems, complianceRecords, dateFrom, dateTo, enrollments, kpiManualEntries, kpiTargets, sessions, students, visibleTrainings, visibleTrainers],
  );

  const programRows = useMemo(
    () =>
      buildProgramKpiRows({
        trainings: visibleTrainings,
        sessions,
        students,
        enrollments,
        trainers: visibleTrainers,
        complianceRecords,
        complianceItems,
        kpiManualEntries,
        kpiTargets,
        fromDate: dateFrom,
        toDate: dateTo,
      }).sort((left, right) => right.overallScore - left.overallScore),
    [complianceItems, complianceRecords, dateFrom, dateTo, enrollments, kpiManualEntries, kpiTargets, sessions, students, visibleTrainings, visibleTrainers],
  );

  const overview = useMemo(() => buildKpiOverview(trainerRows), [trainerRows]);

  const visibleManualEntries = useMemo(
    () =>
      kpiManualEntries.filter((entry) => {
        if (trainerFilter !== ALL_VALUE && String(entry.trainerId) !== trainerFilter) return false;
        if (programFilter !== ALL_VALUE && String(entry.trainingId || "") !== programFilter) return false;
        const dateValue = entry.effectiveDate || entry.updatedAt?.slice(0, 10) || "";
        if (dateFrom && dateValue < dateFrom) return false;
        if (dateTo && dateValue > dateTo) return false;
        return true;
      }),
    [dateFrom, dateTo, kpiManualEntries, programFilter, trainerFilter],
  );

  useEffect(() => {
    if (!trainerRows.length) {
      setSelectedTrainerId("");
      return;
    }

    const stillExists = trainerRows.some((row) => String(row.trainerId) === String(selectedTrainerId));
    if (!stillExists) {
      setSelectedTrainerId(String(trainerRows[0].trainerId));
    }
  }, [selectedTrainerId, trainerRows]);

  const selectedTrainerRow = useMemo(
    () => trainerRows.find((row) => String(row.trainerId) === String(selectedTrainerId)) || trainerRows[0] || null,
    [selectedTrainerId, trainerRows],
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
    setManualEntry({ ...defaultManualEntry, effectiveDate: new Date().toISOString().slice(0, 10) });
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

  const pageMeta = (
    <>
      <StatusBadge status={overview.belowTargetCount > 0 ? "Needs Attention" : "On Track"} domain="performance" />
      <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
        {trainerRows.length} trainer scorecards
      </div>
    </>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon={TrendingUp}
        eyebrow="KPI"
        title="Trainer KPI Scorecards"
        description="Supervisor-managed scorecards that combine manual KPI inputs, compliance completion, and class-level rollups in one connected TMS workflow."
        meta={pageMeta}
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={() => setTargetOpen(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Targets
            </Button>
            <Button className="rounded-full" onClick={() => setManualOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Manual Entry
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Overall Score" value={`${overview.overallScore}%`} detail="Average trainer KPI score" />
        <SummaryCard label="Compliance" value={`${overview.compliancePct}%`} detail="Rollup from compliance tracking" />
        <SummaryCard label="Utilization" value={`${overview.utilizationPct}%`} detail="Manual trainer productivity input" />
        <SummaryCard label="Below Target" value={overview.belowTargetCount} detail="Scorecards needing follow-up" />
        <SummaryCard label="Pending Inputs" value={overview.pendingInputCount} detail="Metrics still waiting on manual entry" />
      </div>

      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="text-lg">Filters</PremiumCardTitle>
          <PremiumCardDescription>Filter KPI scorecards by trainer, class, and reporting date range.</PremiumCardDescription>
        </PremiumCardHeader>
        <PremiumCardContent className="grid gap-4 md:grid-cols-4 xl:grid-cols-5">
          <FilterField label="Trainer">
            <Select value={trainerFilter} onValueChange={setTrainerFilter}>
              <SelectTrigger><SelectValue placeholder="All trainers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All trainers</SelectItem>
                {visibleTrainers.map((trainer) => (
                  <SelectItem key={trainer.id} value={String(trainer.id)}>{trainer.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Program / Batch">
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger><SelectValue placeholder="All programs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All programs</SelectItem>
                {visibleTrainings.map((training) => (
                  <SelectItem key={training.id} value={String(training.id)}>{training.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="From">
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </FilterField>

          <FilterField label="To">
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </FilterField>

          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => {
                setTrainerFilter(ALL_VALUE);
                setProgramFilter(ALL_VALUE);
                setDateFrom("");
                setDateTo("");
              }}
            >
              Reset Filters
            </Button>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {overview.belowTargetCount > 0 ? (
        <div className="rounded-2xl border border-destructive/35 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">KPI follow-up required</p>
              <p className="mt-1">
                {overview.belowTargetCount} trainer scorecard(s) are below target. Review the detailed metric breakdown and capture any missing manual inputs.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Tabs defaultValue="trainers" className="space-y-4">
        <TabsList className="flex w-fit flex-wrap rounded-full border border-border/50 bg-background/70 p-1">
          <TabsTrigger value="trainers" className="rounded-full">Trainer Scorecards</TabsTrigger>
          <TabsTrigger value="classes" className="rounded-full">Class Summary</TabsTrigger>
          <TabsTrigger value="manual" className="rounded-full">Manual Inputs</TabsTrigger>
          <TabsTrigger value="targets" className="rounded-full">Targets</TabsTrigger>
        </TabsList>

        <TabsContent value="trainers" className="space-y-6">
          <PremiumCard>
            <PremiumCardHeader>
              <PremiumCardTitle className="text-lg">Trainer KPI Summary</PremiumCardTitle>
              <PremiumCardDescription>Click a row to inspect the full component metric breakdown and recent manual entries.</PremiumCardDescription>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Trainer</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Knowledge</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Observation</TableHead>
                    <TableHead>Throughput</TableHead>
                    <TableHead>Attrition</TableHead>
                    <TableHead>Below Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainerRows.length ? (
                    trainerRows.map((row) => (
                      <TableRow
                        key={row.trainerId}
                        data-state={String(selectedTrainerId) === String(row.trainerId) ? "selected" : undefined}
                        className="cursor-pointer"
                        onClick={() => setSelectedTrainerId(String(row.trainerId))}
                      >
                        <TableCell className="font-medium">{row.trainer}</TableCell>
                        <TableCell className="font-semibold">{row.overallScore}%</TableCell>
                        <TableCell>{formatPercent(row.compliancePct)}</TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-2">
                            <StatusBadge status={row.utilizationStatus} domain="performance" />
                            <span>{formatPercent(row.utilizationPct)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatPercent(row.knowledgeRetentionScore)}</TableCell>
                        <TableCell>{formatPercent(row.qualityScore)}</TableCell>
                        <TableCell>{formatPercent(row.observationScore)}</TableCell>
                        <TableCell>{formatPercent(row.throughputPct)}</TableCell>
                        <TableCell>{formatPercent(row.attritionPct)}</TableCell>
                        <TableCell>
                          {row.belowTargetMetrics.length ? (
                            <div className="flex flex-wrap gap-1">
                              {row.belowTargetMetrics.slice(0, 2).map((metric) => (
                                <span key={metric} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                                  {metric}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <StatusBadge status="On Track" domain="performance" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                        No KPI scorecards match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </PremiumCardContent>
          </PremiumCard>

          {selectedTrainerRow ? (
            <div className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
              <PremiumCard>
                <PremiumCardHeader>
                  <PremiumCardTitle className="text-lg">{selectedTrainerRow.trainer} Metric Breakdown</PremiumCardTitle>
                  <PremiumCardDescription>
                    Detailed KPI components with target evaluation and source tracking.
                  </PremiumCardDescription>
                </PremiumCardHeader>
                <PremiumCardContent>
                  <MetricList metrics={selectedTrainerRow.metricDetails} />
                </PremiumCardContent>
              </PremiumCard>

              <PremiumCard>
                <PremiumCardHeader>
                  <PremiumCardTitle className="text-lg">Recent Manual Entries</PremiumCardTitle>
                  <PremiumCardDescription>Latest supervisor-entered KPI values for this trainer.</PremiumCardDescription>
                </PremiumCardHeader>
                <PremiumCardContent className="space-y-3">
                  {selectedTrainerRow.manualEntries.length ? (
                    selectedTrainerRow.manualEntries.slice(0, 6).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-border/50 bg-muted/10 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">
                            {manualMetricOptions.find((item) => item.key === entry.metricKey)?.label || entry.metricKey}
                          </p>
                          <span className="text-sm font-bold">{entry.value}%</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entry.effectiveDate} • {entry.trainingId ? (trainings.find((training) => String(training.id) === String(entry.trainingId))?.title || entry.trainingId) : "Trainer-level"}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">{entry.notes || "No notes provided."}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                      No manual entries have been captured for this trainer in the current filter range.
                    </div>
                  )}
                </PremiumCardContent>
              </PremiumCard>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="classes">
          <PremiumCard>
            <PremiumCardHeader>
              <PremiumCardTitle className="text-lg">Class / Program KPI Summary</PremiumCardTitle>
              <PremiumCardDescription>Class-level KPI visibility for throughput, compliance, nesting quality, and knowledge retention.</PremiumCardDescription>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Class / Batch</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Knowledge</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Throughput</TableHead>
                    <TableHead>Attrition</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programRows.length ? (
                    programRows.map((row) => (
                      <TableRow key={row.trainingId}>
                        <TableCell className="font-medium">{row.program}</TableCell>
                        <TableCell>{row.trainer}</TableCell>
                        <TableCell className="font-semibold">{row.overallScore}%</TableCell>
                        <TableCell>{formatPercent(row.compliancePct)}</TableCell>
                        <TableCell>{formatPercent(row.knowledgeRetentionScore)}</TableCell>
                        <TableCell>{formatPercent(row.qualityScore)}</TableCell>
                        <TableCell>{formatPercent(row.throughputPct)}</TableCell>
                        <TableCell>{formatPercent(row.attritionPct)}</TableCell>
                        <TableCell><StatusBadge status={row.status} domain="compliance" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                        No class KPI rows match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="manual">
          <PremiumCard>
            <PremiumCardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <PremiumCardTitle className="text-lg">Manual KPI Inputs</PremiumCardTitle>
                <PremiumCardDescription>Persisted supervisor entries that drive the KPI scorecards.</PremiumCardDescription>
              </div>
              <Button className="rounded-full" onClick={() => setManualOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
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
                        <TableCell>{entry.notes || "No notes"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        No manual KPI entries match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="targets">
          <PremiumCard>
            <PremiumCardHeader>
              <PremiumCardTitle className="text-lg">KPI Targets</PremiumCardTitle>
              <PremiumCardDescription>Maintain scorecard thresholds centrally so trainer and class views stay aligned.</PremiumCardDescription>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Metric</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead className="text-right">Update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiTargets.map((target) => (
                    <TableRow key={target.metricKey}>
                      <TableCell className="font-medium">{target.label}</TableCell>
                      <TableCell>{target.targetValue}%</TableCell>
                      <TableCell>{target.direction === "max" ? "Lower is better" : "Higher is better"}</TableCell>
                      <TableCell>{target.weight}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTargetEditor({ metricKey: target.metricKey, targetValue: String(target.targetValue) });
                            setTargetOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>
      </Tabs>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manual KPI Entry</DialogTitle>
            <DialogDescription>
              Capture supervisor-entered KPI values for trainer or class scorecards. Saved values are persisted and reused across reporting views.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <FilterField label="Trainer">
              <Select value={manualEntry.trainerId} onValueChange={(value) => setManualEntry((current) => ({ ...current, trainerId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                <SelectContent>
                  {visibleTrainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={String(trainer.id)}>{trainer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Program / Batch">
              <Select value={manualEntry.trainingId || ALL_VALUE} onValueChange={(value) => setManualEntry((current) => ({ ...current, trainingId: value === ALL_VALUE ? "" : value }))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Trainer-level metric</SelectItem>
                  {trainings.map((training) => (
                    <SelectItem key={training.id} value={String(training.id)}>{training.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Metric">
              <Select value={manualEntry.metricKey} onValueChange={(value) => setManualEntry((current) => ({ ...current, metricKey: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {manualMetricOptions.map((item) => (
                    <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Value (%)">
              <Input type="number" min="0" max="100" value={manualEntry.value} onChange={(event) => setManualEntry((current) => ({ ...current, value: event.target.value }))} />
            </FilterField>

            <FilterField label="Effective Date">
              <Input type="date" value={manualEntry.effectiveDate} onChange={(event) => setManualEntry((current) => ({ ...current, effectiveDate: event.target.value }))} />
            </FilterField>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={manualEntry.notes} onChange={(event) => setManualEntry((current) => ({ ...current, notes: event.target.value }))} placeholder="Document source notes, exceptions, or reviewer comments." />
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
              Update the threshold used to evaluate KPI scorecards and below-target highlighting.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <FilterField label="Metric">
              <Select
                value={targetEditor.metricKey}
                onValueChange={(value) => {
                  const target = kpiTargets.find((item) => item.metricKey === value);
                  setTargetEditor({
                    metricKey: value,
                    targetValue: target ? String(target.targetValue) : "",
                  });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select metric" /></SelectTrigger>
                <SelectContent>
                  {kpiTargets.map((target) => (
                    <SelectItem key={target.metricKey} value={target.metricKey}>{target.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Target Value (%)">
              <Input type="number" min="0" max="100" value={targetEditor.targetValue} onChange={(event) => setTargetEditor((current) => ({ ...current, targetValue: event.target.value }))} />
            </FilterField>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetOpen(false)}>Cancel</Button>
            <Button onClick={handleTargetSave}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Save Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
