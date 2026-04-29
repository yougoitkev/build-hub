import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, ShieldCheck, Users } from "lucide-react";
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
import { buildComplianceLearnerRows, buildComplianceSummary, buildComplianceTrainerRows } from "@/lib/compliance-kpi";
import { useAppStore } from "@/store/app-store";

const ALL_VALUE = "all";

const defaultEditorState = {
  trainingId: "",
  learnerId: "",
  notes: "",
  itemStatuses: {},
  itemDates: {},
};

const resolveTrainerIdForUser = (user) => String(user?.trainerId || user?.id || "");

const formatTrainerName = (trainer) =>
  trainer?.name ||
  `${trainer?.firstName || ""} ${trainer?.lastName || ""}`.trim() ||
  "Trainer";

const getTrainingLabel = (training) => training?.title || training?.courseCode || training?.id || "Program";

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

export default function ComplianceTrackingPage() {
  const user = useAppStore((state) => state.user);
  const trainings = useAppStore((state) => state.trainings);
  const sessions = useAppStore((state) => state.sessions);
  const students = useAppStore((state) => state.students);
  const enrollments = useAppStore((state) => state.enrollments);
  const trainers = useAppStore((state) => state.trainers);
  const complianceItems = useAppStore((state) => state.complianceItems);
  const complianceRecords = useAppStore((state) => state.complianceRecords);
  const upsertComplianceRecords = useAppStore((state) => state.upsertComplianceRecords);

  const isTrainer = user?.role === "trainer";
  const currentTrainerId = resolveTrainerIdForUser(user);

  const [trainerFilter, setTrainerFilter] = useState(isTrainer ? currentTrainerId : ALL_VALUE);
  const [trainingFilter, setTrainingFilter] = useState(ALL_VALUE);
  const [learnerFilter, setLearnerFilter] = useState(ALL_VALUE);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState(defaultEditorState);

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
      const matchesTraining = trainingFilter === ALL_VALUE || String(training.id) === trainingFilter;
      const dateValue = training.startDate || training.start_date || training.endDate || training.end_date || "";
      const matchesFrom = !dateFrom || dateValue >= dateFrom;
      const matchesTo = !dateTo || dateValue <= dateTo;
      return matchesTrainer && matchesTraining && matchesFrom && matchesTo;
    });
  }, [currentTrainerId, dateFrom, dateTo, isTrainer, trainerFilter, trainingFilter, trainings]);

  const complianceSummary = useMemo(
    () =>
      buildComplianceSummary({
        trainings: visibleTrainings,
        sessions,
        students,
        enrollments,
        complianceRecords,
        complianceItems,
      }),
    [complianceItems, complianceRecords, enrollments, sessions, students, visibleTrainings],
  );

  const trainerRows = useMemo(
    () =>
      buildComplianceTrainerRows({
        trainers: visibleTrainers,
        trainings: visibleTrainings,
        sessions,
        students,
        enrollments,
        complianceRecords,
        complianceItems,
      }),
    [complianceItems, complianceRecords, enrollments, sessions, students, visibleTrainings, visibleTrainers],
  );

  const selectedTrainingId = trainingFilter !== ALL_VALUE ? trainingFilter : "";
  const learnerRows = useMemo(
    () =>
      selectedTrainingId
        ? buildComplianceLearnerRows({
            trainingId: selectedTrainingId,
            trainings: visibleTrainings,
            sessions,
            students,
            enrollments,
            complianceRecords,
            complianceItems,
          })
        : [],
    [complianceItems, complianceRecords, enrollments, selectedTrainingId, sessions, students, visibleTrainings],
  );

  const filteredLearnerRows = useMemo(
    () => learnerRows.filter((row) => learnerFilter === ALL_VALUE || row.learnerId === learnerFilter),
    [learnerFilter, learnerRows],
  );

  const selectedTraining = useMemo(
    () => visibleTrainings.find((training) => String(training.id) === selectedTrainingId) || null,
    [selectedTrainingId, visibleTrainings],
  );

  const learnerOptions = filteredLearnerRows.length ? filteredLearnerRows : learnerRows;
  const canEditTraining = !isTrainer || (selectedTraining && String(selectedTraining.trainerId || selectedTraining.trainer_id) === currentTrainerId);
  const visibleItems = complianceItems.filter((item) => item?.active !== false);

  const openEditor = (learnerRow = null) => {
    if (!selectedTrainingId) {
      toast.error("Select a class or batch before entering compliance.");
      return;
    }

    const nextLearnerRow = learnerRow || learnerRows[0];
    const nextStatuses = {};
    const nextDates = {};

    visibleItems.forEach((item) => {
      const existing = nextLearnerRow?.itemStates?.find((state) => state.itemId === item.id);
      nextStatuses[item.id] = existing?.status || "Not Started";
      nextDates[item.id] = existing?.completedAt || "";
    });

    setEditor({
      trainingId: selectedTrainingId,
      learnerId: nextLearnerRow?.learnerId || "",
      notes: nextLearnerRow?.itemStates?.find((state) => state.notes)?.notes || "",
      itemStatuses: nextStatuses,
      itemDates: nextDates,
    });
    setEditorOpen(true);
  };

  const handleEditorLearnerChange = (learnerId) => {
    const learnerRow = learnerRows.find((row) => row.learnerId === learnerId);
    const nextStatuses = {};
    const nextDates = {};

    visibleItems.forEach((item) => {
      const existing = learnerRow?.itemStates?.find((state) => state.itemId === item.id);
      nextStatuses[item.id] = existing?.status || "Not Started";
      nextDates[item.id] = existing?.completedAt || "";
    });

    setEditor((current) => ({
      ...current,
      learnerId,
      itemStatuses: nextStatuses,
      itemDates: nextDates,
    }));
  };

  const handleSave = () => {
    if (!editor.trainingId || !editor.learnerId) {
      toast.error("Select both a class and learner.");
      return;
    }

    const learner = students.find((student) => String(student.id) === editor.learnerId);
    const training = trainings.find((item) => String(item.id) === editor.trainingId);

    if (!learner || !training) {
      toast.error("Unable to resolve the selected learner or class.");
      return;
    }

    const updates = visibleItems.map((item) => ({
      itemId: item.id,
      status: editor.itemStatuses[item.id] || "Not Started",
      completedAt: editor.itemDates[item.id] || "",
      notes: editor.notes,
    }));

    upsertComplianceRecords({
      trainingId: editor.trainingId,
      trainerId: String(training.trainerId || training.trainer_id || learner.trainerId || ""),
      learnerId: editor.learnerId,
      learnerName: `${learner.firstName || ""} ${learner.lastName || ""}`.trim() || learner.name || "Learner",
      updates,
      notes: editor.notes,
    });

    toast.success("Compliance records saved.");
    setEditorOpen(false);
    setEditor(defaultEditorState);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon={ShieldCheck}
        eyebrow="Compliance"
        title="Compliance Tracking"
        description="Supervisor-managed manual compliance tracking for learner readiness, class coverage, and audit-safe pre-call compliance monitoring."
        meta={
          <>
            <StatusBadge status={complianceSummary.status} domain="compliance" />
            <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {visibleItems.length} required items
            </div>
          </>
        }
        actions={
          <Button className="rounded-full" onClick={() => openEditor()} disabled={!selectedTrainingId || !canEditTraining}>
            <Plus className="mr-2 h-4 w-4" />
            Manual Entry
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Started" value={complianceSummary.requiredCount} detail="Learners tracked in scope" />
        <SummaryCard label="Transitioned" value={complianceSummary.transitionedCount} detail="Learners marked ready or completed" />
        <SummaryCard label="Compliant" value={complianceSummary.compliantCount} detail="Learners meeting all required items" />
        <SummaryCard label="Completion" value={`${complianceSummary.coveragePct}%`} detail="Current compliance completion rate" />
        <SummaryCard label="Shortfall" value={complianceSummary.shortfallCount} detail="Compliance gap against transition readiness" />
      </div>

      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="text-lg">Filters</PremiumCardTitle>
          <PremiumCardDescription>Filter compliance tracking by trainer, class, learner, and date range.</PremiumCardDescription>
        </PremiumCardHeader>
        <PremiumCardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {!isTrainer ? (
            <FilterField label="Trainer">
              <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                <SelectTrigger><SelectValue placeholder="All trainers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All trainers</SelectItem>
                  {visibleTrainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={String(trainer.id)}>{formatTrainerName(trainer)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          ) : null}

          <FilterField label="Class / Batch">
            <Select
              value={trainingFilter}
              onValueChange={(value) => {
                setTrainingFilter(value);
                setLearnerFilter(ALL_VALUE);
              }}
            >
              <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All classes</SelectItem>
                {visibleTrainings.map((training) => (
                  <SelectItem key={training.id} value={String(training.id)}>{getTrainingLabel(training)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Learner">
            <Select value={learnerFilter} onValueChange={setLearnerFilter}>
              <SelectTrigger><SelectValue placeholder="All learners" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All learners</SelectItem>
                {learnerRows.map((learner) => (
                  <SelectItem key={learner.learnerId} value={learner.learnerId}>{learner.learnerName}</SelectItem>
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
                setTrainerFilter(isTrainer ? currentTrainerId : ALL_VALUE);
                setTrainingFilter(ALL_VALUE);
                setLearnerFilter(ALL_VALUE);
                setDateFrom("");
                setDateTo("");
              }}
            >
              Reset Filters
            </Button>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {complianceSummary.shortfallCount > 0 ? (
        <div className="rounded-2xl border border-destructive/35 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Compliance risk detected</p>
              <p className="mt-1">
                {complianceSummary.shortfallCount} learner(s) are transitioned or call-ready without matching compliance completion. This violates the pre-call compliance rule and should be corrected immediately.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Tabs defaultValue="learners" className="space-y-4">
        <TabsList className="flex w-fit flex-wrap rounded-full border border-border/50 bg-background/70 p-1">
          <TabsTrigger value="learners" className="rounded-full">Learner Detail</TabsTrigger>
          <TabsTrigger value="summary" className="rounded-full">Class Summary</TabsTrigger>
          <TabsTrigger value="trainers" className="rounded-full">Trainer Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="learners">
          <PremiumCard>
            <PremiumCardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <PremiumCardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Learner Compliance Detail
                </PremiumCardTitle>
                <PremiumCardDescription>Manual item-by-item compliance entry linked to the selected class and learner.</PremiumCardDescription>
              </div>
              <Button variant="outline" className="rounded-full" onClick={() => openEditor()} disabled={!selectedTrainingId || !canEditTraining}>
                <Plus className="mr-2 h-4 w-4" />
                Update Learner
              </Button>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              {!selectedTrainingId ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Select a class or batch to review learner-level compliance and enter manual updates.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Learner</TableHead>
                      <TableHead>Lifecycle</TableHead>
                      <TableHead>Completion</TableHead>
                      {visibleItems.map((item) => (
                        <TableHead key={item.id}>{item.name}</TableHead>
                      ))}
                      <TableHead>Last Completed</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLearnerRows.length ? (
                      filteredLearnerRows.map((learner) => (
                        <TableRow key={learner.learnerId}>
                          <TableCell className="font-medium">{learner.learnerName}</TableCell>
                          <TableCell><StatusBadge status={learner.lifecycle.status} domain="learner" /></TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold">{learner.completionPct}%</div>
                              <div className="text-xs text-muted-foreground">
                                {learner.completedItems}/{learner.requiredItems} items complete
                              </div>
                            </div>
                          </TableCell>
                          {visibleItems.map((item) => {
                            const itemState = learner.itemStates.find((state) => String(state.itemId) === String(item.id));
                            return (
                              <TableCell key={item.id}>
                                <StatusBadge status={itemState?.status || "Not Started"} domain="compliance" />
                              </TableCell>
                            );
                          })}
                          <TableCell>{learner.lastCompletedAt || "Pending"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEditor(learner)} disabled={!canEditTraining}>
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={visibleItems.length + 5} className="py-8 text-center text-sm text-muted-foreground">
                          No learners match the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="summary">
          <PremiumCard>
            <PremiumCardHeader>
              <PremiumCardTitle className="text-lg">Class Compliance Summary</PremiumCardTitle>
              <PremiumCardDescription>Coverage, transition readiness, and shortfall risk by cohort.</PremiumCardDescription>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Class / Batch</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Transitioned</TableHead>
                    <TableHead>Compliant</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Shortfall</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceSummary.cohorts.length ? (
                    complianceSummary.cohorts.map((cohort) => (
                      <TableRow key={cohort.id}>
                        <TableCell className="font-medium">{cohort.title}</TableCell>
                        <TableCell>{trainers.find((trainer) => String(trainer.id) === String(cohort.trainerId))?.name || "Unassigned"}</TableCell>
                        <TableCell>{cohort.startedCount}</TableCell>
                        <TableCell>{cohort.transitionedCount}</TableCell>
                        <TableCell>{cohort.compliantCount}</TableCell>
                        <TableCell>{cohort.coveragePct}%</TableCell>
                        <TableCell>{cohort.shortfallCount}</TableCell>
                        <TableCell><StatusBadge status={cohort.status} domain="compliance" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                        No compliance cohorts match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="trainers">
          <PremiumCard>
            <PremiumCardHeader>
              <PremiumCardTitle className="text-lg">Trainer Compliance Coverage</PremiumCardTitle>
              <PremiumCardDescription>Supervisor summary of class count, coverage, and shortfall by trainer.</PremiumCardDescription>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Trainer</TableHead>
                    <TableHead>Tracked Cohorts</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Transitioned</TableHead>
                    <TableHead>Compliant</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Shortfall</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainerRows.length ? (
                    trainerRows.map((row) => (
                      <TableRow key={row.trainerId || row.trainer}>
                        <TableCell className="font-medium">{row.trainer}</TableCell>
                        <TableCell>{row.cohorts}</TableCell>
                        <TableCell>{row.startedCount}</TableCell>
                        <TableCell>{row.transitionedCount}</TableCell>
                        <TableCell>{row.compliantCount}</TableCell>
                        <TableCell>{row.coveragePct}%</TableCell>
                        <TableCell>{row.shortfallCount}</TableCell>
                        <TableCell><StatusBadge status={row.status} domain="compliance" /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                        No trainer-level compliance summaries are available for the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>
      </Tabs>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manual Compliance Entry</DialogTitle>
            <DialogDescription>
              Capture or update learner compliance completion for the selected class. These changes feed KPI scorecards, reporting, and audit history.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <FilterField label="Class / Batch">
              <Select value={editor.trainingId} onValueChange={(value) => setEditor((current) => ({ ...current, trainingId: value }))}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {visibleTrainings.map((training) => (
                    <SelectItem key={training.id} value={String(training.id)}>{getTrainingLabel(training)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Learner">
              <Select value={editor.learnerId} onValueChange={handleEditorLearnerChange}>
                <SelectTrigger><SelectValue placeholder="Select learner" /></SelectTrigger>
                <SelectContent>
                  {learnerOptions.map((learner) => (
                    <SelectItem key={learner.learnerId} value={learner.learnerId}>{learner.learnerName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>

                <FilterField label="Status">
                  <Select
                    value={editor.itemStatuses[item.id] || "Not Started"}
                    onValueChange={(value) =>
                      setEditor((current) => ({
                        ...current,
                        itemStatuses: { ...current.itemStatuses, [item.id]: value },
                      }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Waived">Waived</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>

                <FilterField label="Completed Date">
                  <Input
                    type="date"
                    value={editor.itemDates[item.id] || ""}
                    onChange={(event) =>
                      setEditor((current) => ({
                        ...current,
                        itemDates: { ...current.itemDates, [item.id]: event.target.value },
                      }))
                    }
                  />
                </FilterField>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={editor.notes}
              onChange={(event) => setEditor((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Add audit notes, blockers, or completion context..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Save Compliance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
