import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, BarChart3, HardDriveDownload, ShieldCheck, TrendingUp, CalendarOff } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import { api } from "@/data/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import {
  normalizeAvailabilityRecord,
  normalizeTrainer,
  normalizeTrainerAttendanceRecord,
  normalizeTrainerObservation,
  normalizeTrainerUtilization,
} from "@/lib/phase-backend";
import {
  buildComplianceRows,
  buildTrainerScorecardRows,
  buildTransitionRows,
  buildWeeklyAbsenceRows,
  downloadRowsAsCsv,
} from "@/lib/reporting";

const reportConfigs = [
  {
    title: "Student List",
    description: "Export all student records with current status and levels.",
    icon: FileSpreadsheet,
    type: "students",
  },
  {
    title: "Attendance Report",
    description: "Export attendance records with overrides and remarks.",
    icon: FileSpreadsheet,
    type: "attendance",
  },
  {
    title: "Training Summary",
    description: "Export training cohort sizes, capacity, and enrollment status.",
    icon: BarChart3,
    type: "trainings",
  },
];

const requestWindow = {
  from: "2026-01-01",
  to: "2026-12-31",
};

const mapTrainingRecord = (training) => ({
  id: String(training.id),
  trainerId: String(training.trainer_id || training.trainerId || ""),
  title: training.title || "",
  startDate: training.start_date || training.startDate || "",
  endDate: training.end_date || training.endDate || "",
  status: training.status || "Upcoming",
  studentCount: Number(training.student_count || training.studentCount || 0),
  capacity: Number(training.capacity || 0),
});

const mapSessionRecord = (session) => ({
  id: String(session.id),
  scheduledTrainingId: String(session.scheduled_training_id || session.scheduledTrainingId || ""),
  trainingId: String(session.training_program_id || session.trainingId || session.training_id || ""),
  trainerId: String(session.trainer_id || session.trainerId || ""),
  trainerName: session.trainer_name || session.trainerName || "",
  title: session.title || "",
  date: session.session_date || session.date || "",
  startTime: session.start_time || session.startTime || "",
  endTime: session.end_time || session.endTime || "",
  location: session.location || "TBD",
  studentIds: Array.isArray(session.student_ids) ? session.student_ids.map(String) : Array.isArray(session.studentIds) ? session.studentIds.map(String) : [],
});

const mapStudentRecord = (student) => ({
  id: String(student.id ?? student.emp_id ?? student.empId ?? student.portalid ?? student.portal_id ?? ""),
  trainerId: String(student.trainer_id || student.trainerId || ""),
  firstName: student.first_name || student.firstName || student.learner_name?.split(" ")[0] || "",
  lastName: student.last_name || student.lastName || student.learner_name?.split(" ").slice(1).join(" ") || "",
  status: student.status || "Active",
  level1: student.level_1 || student.level1 || "Not Started",
  level2: student.level_2 || student.level2 || "Not Started",
  level3: student.level_3 || student.level3 || "Not Started",
});

const mapFeedback = (entry) => ({
  id: String(entry.id || ""),
  trainerId: String(entry.trainer_id || entry.trainerId || ""),
  trainerName: entry.trainer_name || entry.trainerName || "",
  rating: Number(entry.rating || 0),
  category: entry.category || "",
  text: entry.text || "",
  date: entry.date || entry.created_at || "",
});

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const buildImportStatus = (latestImport) => {
  if (!latestImport) {
    return {
      status: "pending",
      timestamp: new Date().toISOString(),
      message: "No import activity available yet.",
      recordsProcessed: 0,
      errors: 0,
    };
  }

  const status = latestImport.status || "pending";
  const timestamp = latestImport.processed_at || latestImport.uploaded_at || new Date().toISOString();
  const filename = latestImport.filename || "Import";

  const messageByStatus = {
    processing: `${filename} is still being processed.`,
    validated: `${filename} is validated and ready to apply.`,
    applied: `${filename} was applied successfully.`,
    failed: latestImport.error_message || `${filename} failed to process.`,
  };

  return {
    status,
    timestamp,
    message: messageByStatus[status] || `${filename} status is ${status}.`,
    recordsProcessed: Number(latestImport.valid_rows || 0),
    errors: Number(latestImport.error_rows || 0),
  };
};

function AnalyticsTable({ columns, rows, emptyMessage }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row, index) => (
              <TableRow key={`${row[columns[0].key]}-${index}`}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.cellClassName}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ReportsPage() {
  const storeStudents = useAppStore((state) => state.students);
  const storeEnrollments = useAppStore((state) => state.enrollments);
  const storeFeedback = useAppStore((state) => state.feedback);

  const [latestImport, setLatestImport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [exportingType, setExportingType] = useState("");
  const [trainers, setTrainers] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [trainerUtilization, setTrainerUtilization] = useState([]);
  const [trainerObservations, setTrainerObservations] = useState([]);
  const [trainerAttendance, setTrainerAttendance] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [localTransitionData, setLocalTransitionData] = useState(null);
  const [localKPIData, setLocalKPIData] = useState(null);
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(false);

      const [
        importsResponse,
        trainerResponse,
        trainingsResponse,
        sessionsResponse,
        studentsResponse,
        utilizationResponse,
        observationsResponse,
        attendanceResponse,
        availabilityResponse,
        feedbackResponse,
        localTransitionDataResponse,
        localKPIDataResponse,
      ] = await Promise.allSettled([
        api.imports.list(),
        api.trainers.list(),
        api.scheduledTrainings.list(),
        api.scheduledTrainings.sessions(),
        api.studentsPage.list(),
        api.trainerUtilization.list({ period: "quarter" }),
        api.trainerObservations.list(),
        api.trainerAttendance.list(requestWindow),
        api.availabilityPage.list(requestWindow),
        api.feedback.list(),
        api.localReports.transition(),
        api.localReports.kpi(),
      ]);

      if (importsResponse.status === "fulfilled") {
        const imports = Array.isArray(importsResponse.value?.imports) ? importsResponse.value.imports : [];
        const sortedImports = [...imports].sort((left, right) => new Date(right.uploaded_at) - new Date(left.uploaded_at));
        setLatestImport(sortedImports[0] || null);
      } else {
        setLatestImport(null);
      }

      setTrainers(
        trainerResponse.status === "fulfilled" ? (trainerResponse.value?.trainers || []).map(normalizeTrainer) : [],
      );
      setTrainings(
        trainingsResponse.status === "fulfilled" ? (trainingsResponse.value?.scheduled_trainings || []).map(mapTrainingRecord) : [],
      );
      setSessions(
        sessionsResponse.status === "fulfilled" ? (sessionsResponse.value?.sessions || []).map(mapSessionRecord) : [],
      );
      setStudents(
        studentsResponse.status === "fulfilled"
          ? ((Array.isArray(studentsResponse.value?.students) ? studentsResponse.value.students : []).map(mapStudentRecord))
          : storeStudents,
      );
      setTrainerUtilization(
        utilizationResponse.status === "fulfilled"
          ? (utilizationResponse.value?.utilization || []).map(normalizeTrainerUtilization)
          : [],
      );
      setTrainerObservations(
        observationsResponse.status === "fulfilled"
          ? (observationsResponse.value?.observations || []).map(normalizeTrainerObservation)
          : [],
      );
      setTrainerAttendance(
        attendanceResponse.status === "fulfilled"
          ? (attendanceResponse.value?.records || []).map(normalizeTrainerAttendanceRecord)
          : [],
      );
      setAvailability(
        availabilityResponse.status === "fulfilled"
          ? (availabilityResponse.value?.availability || []).map(normalizeAvailabilityRecord)
          : [],
      );
      setFeedback(
        feedbackResponse.status === "fulfilled"
          ? (feedbackResponse.value?.feedback || []).map(mapFeedback)
          : storeFeedback,
      );
      
      if (localTransitionDataResponse?.status === "fulfilled") {
        setLocalTransitionData(localTransitionDataResponse.value);
      }
      
      if (localKPIDataResponse?.status === "fulfilled") {
        setLocalKPIData(localKPIDataResponse.value);
      }

      const failureCount = [
        trainerResponse,
        trainingsResponse,
        sessionsResponse,
        studentsResponse,
        utilizationResponse,
        observationsResponse,
        attendanceResponse,
        availabilityResponse,
        feedbackResponse,
      ].filter((result) => result.status === "rejected").length;

      if (failureCount > 0) {
        toast.info("Some report datasets could not be loaded from the backend. Available data is shown.");
      }
    } catch (error) {
      setFetchError(true);
      setLatestImport(null);
      setTrainers([]);
      setTrainings([]);
      setSessions([]);
      setStudents(storeStudents);
      setTrainerUtilization([]);
      setTrainerObservations([]);
      setTrainerAttendance([]);
      setAvailability([]);
      setFeedback(storeFeedback);
      toast.error(error?.message || "Failed to load reporting data.");
    } finally {
      setIsLoading(false);
    }
  }, [storeFeedback, storeStudents]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const importStatus = useMemo(() => buildImportStatus(latestImport), [latestImport]);
  const complianceRows = useMemo(
    () => buildComplianceRows({ trainings, sessions, students, enrollments: storeEnrollments, trainers }),
    [storeEnrollments, students, sessions, trainers, trainings],
  );
  const scorecardRows = useMemo(
    () =>
      buildTrainerScorecardRows({
        trainers,
        trainings,
        sessions,
        students,
        enrollments: storeEnrollments,
        trainerUtilization,
        trainerObservations,
        feedback,
      }).sort((left, right) => right.overallScore - left.overallScore),
    [feedback, storeEnrollments, students, sessions, trainerObservations, trainerUtilization, trainers, trainings],
  );
  const transitionRows = useMemo(
    () => buildTransitionRows({ trainings, sessions, students, enrollments: storeEnrollments, trainers }),
    [storeEnrollments, students, sessions, trainers, trainings],
  );
  const absenceRows = useMemo(
    () => buildWeeklyAbsenceRows({ trainerAttendance, trainers, availability }),
    [availability, trainerAttendance, trainers],
  );

  const summary = useMemo(
    () => ({
      complianceAtRisk: complianceRows.filter((row) => row.status !== "Complete").length,
      highPerformers: scorecardRows.filter((row) => row.overallScore >= 80).length,
      transitionReady: transitionRows.reduce((total, row) => total + Number(row.readyForTransition || 0), 0),
      avgAbsencePct: absenceRows.length
        ? Math.round(absenceRows.reduce((total, row) => total + Number(row.absencePct || 0), 0) / absenceRows.length)
        : 0,
    }),
    [absenceRows, complianceRows, scorecardRows, transitionRows],
  );

  const handleExport = async (type) => {
    try {
      setExportingType(type);
      const response = await api.reports.exports({ type });
      const filename = response?.filename;

      if (!filename) {
        throw new Error("Export filename not returned by backend.");
      }

      const blob = await api.reports.downloadExport(filename);
      downloadBlob(blob, filename);
      toast.success(`Exported ${filename}`);
    } catch (error) {
      toast.error(error?.message || "Failed to export report.");
    } finally {
      setExportingType("");
    }
  };

  const handleClientExport = (rows, filename) => {
    const didDownload = downloadRowsAsCsv(rows, filename);
    if (!didDownload) {
      toast.error("No rows available for export.");
      return;
    }
    toast.success(`Exported ${filename}`);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <PageHeader
        icon={BarChart3}
        eyebrow="Reporting"
        title="Operations Reports"
        description="Centralized exports for compliance coverage, trainer KPI scorecards, transition reporting, and weekly absence visibility."
        meta={
          <>
            <StatusBadge status={summary.complianceAtRisk > 0 ? "At Risk" : "Complete"} domain="compliance" />
            <div className="rounded-full border border-primary/10 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {scorecardRows.length} trainer scorecards
            </div>
          </>
        }
        actions={
          <Button variant="outline" className="rounded-full" onClick={loadData}>
            Refresh Data
          </Button>
        }
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading reporting data...</p>}
      {!isLoading && fetchError && <p className="text-sm text-destructive">Some report data could not be loaded.</p>}

      <div className="grid gap-4 md:grid-cols-4">
        <PremiumCard>
          <PremiumCardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Compliance Risks</p>
            <p className="mt-3 text-3xl font-bold">{summary.complianceAtRisk}</p>
            <p className="mt-1 text-xs text-muted-foreground">Cohorts not yet fully compliant</p>
          </PremiumCardContent>
        </PremiumCard>
        <PremiumCard>
          <PremiumCardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">High Performing Trainers</p>
            <p className="mt-3 text-3xl font-bold">{summary.highPerformers}</p>
            <p className="mt-1 text-xs text-muted-foreground">Scorecards at 80+ overall score</p>
          </PremiumCardContent>
        </PremiumCard>
        <PremiumCard>
          <PremiumCardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Ready For Transition</p>
            <p className="mt-3 text-3xl font-bold">{summary.transitionReady}</p>
            <p className="mt-1 text-xs text-muted-foreground">Learners ready to move forward</p>
          </PremiumCardContent>
        </PremiumCard>
        <PremiumCard>
          <PremiumCardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Average Absence</p>
            <p className="mt-3 text-3xl font-bold">{summary.avgAbsencePct}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Weekly trainer absence rate</p>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      <Tabs defaultValue="exports" className="space-y-4">
        <TabsList className="flex w-fit flex-wrap rounded-full border border-border/50 bg-background/70 p-1">
          <TabsTrigger value="exports" className="rounded-full">Exports</TabsTrigger>
          <TabsTrigger value="compliance" className="rounded-full">Compliance</TabsTrigger>
          <TabsTrigger value="scorecards" className="rounded-full">KPI Scorecards</TabsTrigger>
          <TabsTrigger value="transition" className="rounded-full">Transition</TabsTrigger>
          <TabsTrigger value="absence" className="rounded-full">Absence</TabsTrigger>
          <TabsTrigger value="deep-insights" className="rounded-full">Deep Insights (Backend)</TabsTrigger>
        </TabsList>

        <TabsContent value="exports" className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {reportConfigs.map((report) => (
              <PremiumCard key={report.title} className="hover:-translate-y-1 transition-transform duration-300 group">
                <PremiumCardContent className="p-6">
                  <div className="flex h-full flex-col">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <report.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{report.title}</h3>
                    <p className="mt-1 mb-6 text-sm leading-relaxed text-muted-foreground">{report.description}</p>
                    <Button className="w-full justify-start rounded-xl" onClick={() => handleExport(report.type)} disabled={exportingType === report.type}>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </PremiumCardContent>
              </PremiumCard>
            ))}
          </div>

          <PremiumCard>
            <PremiumCardHeader className="bg-muted/20 border-b border-border/50">
              <PremiumCardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <HardDriveDownload className="h-5 w-5 text-primary" />
                  Data Import Synchronization
                </div>
                <Button variant="outline" size="sm" onClick={loadData} className="rounded-full">
                  Refresh
                </Button>
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="p-6">
              <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                <div className={`absolute top-0 left-0 h-full w-1 ${importStatus.status === "pending" || importStatus.status === "processing" ? "bg-warning" : importStatus.status === "failed" ? "bg-destructive" : "bg-status-active"}`} />
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`relative inline-flex h-3 w-3 rounded-full ${importStatus.status === "pending" || importStatus.status === "processing" ? "bg-warning" : importStatus.status === "failed" ? "bg-destructive" : "bg-status-active"}`} />
                    <span className="text-lg font-bold capitalize">{importStatus.status.replace("_", " ")}</span>
                  </div>
                  <span className="rounded-md bg-muted/50 px-3 py-1 text-sm font-medium text-muted-foreground">{new Date(importStatus.timestamp).toLocaleString()}</span>
                </div>
                <p className="mb-6 font-medium text-foreground/80">{importStatus.message}</p>
                <div className="flex flex-wrap gap-4 border-t border-border/50 pt-4">
                  <div className="rounded-lg bg-primary/5 px-4 py-2">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Processed</p>
                    <p className="text-xl font-bold text-foreground">{importStatus.recordsProcessed} records</p>
                  </div>
                  <div className="rounded-lg bg-destructive/5 px-4 py-2">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Errors</p>
                    <p className="text-xl font-bold text-destructive">{importStatus.errors} failures</p>
                  </div>
                </div>
              </div>
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="compliance">
          <PremiumCard>
            <PremiumCardHeader className="flex flex-row items-center justify-between gap-3">
              <PremiumCardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Compliance Coverage
              </PremiumCardTitle>
              <Button variant="outline" className="rounded-full" onClick={() => handleClientExport(complianceRows, "compliance-coverage-report.csv")}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <AnalyticsTable
                columns={[
                  { key: "cohort", label: "Cohort" },
                  { key: "trainer", label: "Trainer" },
                  { key: "month", label: "Month" },
                  { key: "coveragePct", label: "Coverage", render: (value) => `${value}%` },
                  { key: "requiredLearners", label: "Required", cellClassName: "text-center" },
                  { key: "compliantLearners", label: "Compliant", cellClassName: "text-center" },
                  { key: "status", label: "Status", render: (value) => <StatusBadge status={value} domain="compliance" /> },
                ]}
                rows={complianceRows}
                emptyMessage="No compliance rows are available yet."
              />
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="scorecards">
          <PremiumCard>
            <PremiumCardHeader className="flex flex-row items-center justify-between gap-3">
              <PremiumCardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Trainer KPI Scorecards
              </PremiumCardTitle>
              <Button variant="outline" className="rounded-full" onClick={() => handleClientExport(scorecardRows, "trainer-kpi-scorecards.csv")}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <AnalyticsTable
                columns={[
                  { key: "trainer", label: "Trainer" },
                  { key: "overallScore", label: "Overall", render: (value) => `${value}%`, cellClassName: "font-bold" },
                  {
                    key: "utilizationPct",
                    label: "Utilization",
                    render: (value, row) => (
                      <div className="inline-flex items-center gap-2">
                        <StatusBadge status={row.utilizationStatus} domain="performance" />
                        <span>{value}%</span>
                      </div>
                    ),
                  },
                  {
                    key: "observationScore",
                    label: "Observation",
                    render: (value, row) => (
                      <div className="inline-flex items-center gap-2">
                        <StatusBadge status={row.observationStatus} domain="performance" />
                        <span>{value}%</span>
                      </div>
                    ),
                  },
                  { key: "compliancePct", label: "Compliance", render: (value) => `${value}%` },
                  { key: "throughputPct", label: "Throughput", render: (value) => `${value}%` },
                  { key: "attritionPct", label: "Attrition", render: (value) => `${value}%` },
                ]}
                rows={scorecardRows}
                emptyMessage="No trainer KPI scorecards are available yet."
              />
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="transition">
          <PremiumCard>
            <PremiumCardHeader className="flex flex-row items-center justify-between gap-3">
              <PremiumCardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                Transition Report
              </PremiumCardTitle>
              <Button variant="outline" className="rounded-full" onClick={() => handleClientExport(transitionRows, "transition-report.csv")}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <AnalyticsTable
                columns={[
                  { key: "month", label: "Month" },
                  { key: "cohort", label: "Cohort" },
                  { key: "trainer", label: "Trainer" },
                  { key: "started", label: "Started", cellClassName: "text-center" },
                  { key: "readyForTransition", label: "Ready", cellClassName: "text-center" },
                  { key: "completed", label: "Completed", cellClassName: "text-center" },
                  { key: "throughputPct", label: "Throughput", render: (value) => `${value}%` },
                  { key: "compliancePct", label: "Compliance", render: (value) => `${value}%` },
                  { key: "status", label: "Program Status", render: (value) => <StatusBadge status={value} domain="trainingProgram" /> },
                ]}
                rows={transitionRows}
                emptyMessage="No transition report rows are available yet."
              />
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="absence">
          <PremiumCard>
            <PremiumCardHeader className="flex flex-row items-center justify-between gap-3">
              <PremiumCardTitle className="flex items-center gap-2 text-lg">
                <CalendarOff className="h-5 w-5 text-primary" />
                Weekly Trainer Absence
              </PremiumCardTitle>
              <Button variant="outline" className="rounded-full" onClick={() => handleClientExport(absenceRows, "weekly-trainer-absence.csv")}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <AnalyticsTable
                columns={[
                  { key: "trainer", label: "Trainer" },
                  { key: "week", label: "Week" },
                  { key: "scheduledDays", label: "Scheduled", cellClassName: "text-center" },
                  { key: "absentDays", label: "Absent", cellClassName: "text-center" },
                  { key: "leaveRecords", label: "Leave Requests", cellClassName: "text-center" },
                  { key: "absencePct", label: "Absence %", render: (value) => `${value}%` },
                ]}
                rows={absenceRows}
                emptyMessage="No weekly absence rows are available yet."
              />
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="deep-insights">
          <div className="space-y-6">
            <PremiumCard>
              <PremiumCardHeader>
                <PremiumCardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Backend Calculated Transition Metrics
                </PremiumCardTitle>
              </PremiumCardHeader>
              <PremiumCardContent className="p-0">
                <Tabs defaultValue="Individual Performance">
                   <TabsList className="px-4 py-2 bg-muted/20">
                      {localTransitionData && Object.keys(localTransitionData).filter(k => k.includes('Individual')).map(sheet => (
                        <TabsTrigger key={sheet} value={sheet} className="text-xs">{sheet.replace('Individual Performance - ', '')}</TabsTrigger>
                      ))}
                   </TabsList>
                   {localTransitionData && Object.keys(localTransitionData).filter(k => k.includes('Individual')).map(sheet => (
                     <TabsContent key={sheet} value={sheet}>
                        <AnalyticsTable
                          columns={[
                            { key: "learnerName", label: "Learner" },
                            { key: "trainerName", label: "Trainer" },
                            { key: "calculatedQAAverage", label: "QA Avg (Backend)", render: (v) => v ? <strong>{(v * 100).toFixed(1)}%</strong> : 'N/A' },
                            { key: "programStatus", label: "Status" },
                            { key: "attendancePct", label: "Attendance", render: (v) => v ? `${(v * 100).toFixed(1)}%` : 'N/A' },
                          ]}
                          rows={localTransitionData[sheet]}
                          emptyMessage="No data for this sheet."
                        />
                     </TabsContent>
                   ))}
                </Tabs>
              </PremiumCardContent>
            </PremiumCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
