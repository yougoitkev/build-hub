import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/app-store";
import { AttendanceFilters } from "@/components/attendance/AttendanceFilters";
import { AttendanceMatrix } from "@/components/attendance/AttendanceMatrix";
import { BulkActionsToolbar } from "@/components/attendance/BulkActionsToolbar";
import { OverrideModal } from "@/components/attendance/OverrideModal";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/layout/PageHeader";
import { ClipboardCheck, History, Shield, Info, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/data/api";
import { format, parseISO, startOfDay } from "date-fns";

const buildFullName = (firstName, lastName) => `${firstName || ""} ${lastName || ""}`.trim();

const mapTrainingRecord = (training) => ({
  id: String(training.id),
  trainingProgramId: String(training.training_program_id || training.trainingProgramId || ""),
  title: training.title || "",
  courseCode: training.course_code || training.courseCode || "",
  capacity: Number(training.capacity || 0),
  studentCount: Number(training.student_count || training.studentCount || 0),
  status: training.status || "Upcoming",
  startDate: training.start_date || training.startDate || "",
  endDate: training.end_date || training.endDate || "",
});

const mapAttendanceStudent = (student) => ({
  id: String(student.student_id || student.id),
  studentId: String(student.student_id || student.id),
  portalId: student.portalid || "",
  firstName: student.first_name || student.firstName || "",
  lastName: student.last_name || student.lastName || "",
  empId: student.portalid || "",
  language: student.language || "",
});

const buildAttendanceMap = (students, attendanceRows) => {
  const map = {};

  students.forEach((student) => {
    const matchingRow = attendanceRows.find((row) => String(row.student_id) === String(student.id));
    const days = matchingRow?.days || {};
    map[student.id] = {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      importId: matchingRow?.import_id ?? null,
      rowNumber: matchingRow?.row_number ?? null,
      overrides: matchingRow?.overrides || {},
      summary: matchingRow?.summary || {},
      dayValues: { ...days },
    };
  });

  return map;
};

const extractSelectedDays = (attendanceRows) => {
  const firstRow = attendanceRows[0];
  if (!firstRow?.days) {
    return Array.from({ length: 47 }, (_, index) => index + 1);
  }

  const dayNumbers = Object.keys(firstRow.days)
    .filter((key) => /^day_\d+$/.test(key))
    .map((key) => Number(key.replace("day_", "")))
    .sort((a, b) => a - b);

  return dayNumbers.length > 0 ? dayNumbers : Array.from({ length: 47 }, (_, index) => index + 1);
};

export default function AttendancePage() {
  const user = useAppStore((s) => s.user);
  const [searchParams] = useSearchParams();

  const [trainings, setTrainings] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState(searchParams.get("trainingId") || "all");
  const [availableDays, setAvailableDays] = useState([1, 2, 3, 4, 5]);
  const [selectedDateRange, setSelectedDateRange] = useState({ from: new Date(), to: new Date() });
  const [trainingDateRange, setTrainingDateRange] = useState(null);
  const [sessionCalendar, setSessionCalendar] = useState([]);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [activeOverride, setActiveOverride] = useState(null);
  const [localAttendance, setLocalAttendance] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [recentAudit, setRecentAudit] = useState([]);
  const [isLoadingTrainings, setIsLoadingTrainings] = useState(true);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const selectedTraining = useMemo(
    () => trainings.find((training) => String(training.id) === String(selectedTrainingId)),
    [trainings, selectedTrainingId]
  );

  const getEnrolledCount = useCallback(
    (trainingId) => trainings.find((training) => String(training.id) === String(trainingId))?.studentCount || 0,
    [trainings]
  );

  const dayLabels = useMemo(
    () => Object.fromEntries(sessionCalendar.map((session) => [session.dayNumber, session.date])),
    [sessionCalendar]
  );

  const selectedDays = useMemo(() => {
    if (sessionCalendar.length === 0) {
      return availableDays;
    }

    if (!selectedDateRange?.from || !selectedDateRange?.to) {
      return sessionCalendar.map((session) => session.dayNumber);
    }

    const from = startOfDay(selectedDateRange.from);
    const to = startOfDay(selectedDateRange.to);
    const daysInRange = sessionCalendar
      .filter((session) => {
        const sessionDate = startOfDay(parseISO(session.date));
        return sessionDate >= from && sessionDate <= to;
      })
      .map((session) => session.dayNumber);

    return daysInRange.length > 0 ? daysInRange : sessionCalendar.map((session) => session.dayNumber);
  }, [availableDays, selectedDateRange, sessionCalendar]);

  const loadAuditLogs = useCallback(async () => {
    try {
      const response = await api.auditLogs.list({ action: "Attendance Updated" });
      const logs = Array.isArray(response?.logs) ? response.logs.slice(0, 5) : [];
      setRecentAudit(logs);
    } catch {
      setRecentAudit([]);
    }
  }, []);

  const loadAttendanceMatrix = useCallback(
    async (trainingId) => {
      if (!trainingId || trainingId === "all") {
        setStudents([]);
        setLocalAttendance({});
        setAvailableDays([1, 2, 3, 4, 5]);
        setSessionCalendar([]);
        setTrainingDateRange(null);
        return;
      }

      setIsLoadingMatrix(true);
      setFetchError(false);

      try {
        const [response, trainingDetailResponse] = await Promise.all([
          api.attendance.list({ scheduled_training_id: trainingId }),
          api.scheduledTrainings.detail(trainingId),
        ]);
        const rosterFromResponse = Array.isArray(response?.students) ? response.students.map(mapAttendanceStudent) : [];
        const attendanceRows = Array.isArray(response?.attendance) ? response.attendance : [];
        const allDays = extractSelectedDays(attendanceRows);
        const scheduleSessions = Array.isArray(trainingDetailResponse?.sessions)
          ? trainingDetailResponse.sessions
              .map((session, index) => ({
                dayNumber: Number(session.session_no || session.day_number || session.dayNumber || index + 1),
                date: session.session_date || session.date || "",
              }))
              .filter((session) => session.date && allDays.includes(session.dayNumber))
              .sort((left, right) => left.dayNumber - right.dayNumber)
          : [];

        const fallbackFrom = trainingDetailResponse?.start_date || selectedTraining?.startDate || null;
        const fallbackTo = trainingDetailResponse?.end_date || selectedTraining?.endDate || null;
        const nextTrainingRange =
          scheduleSessions.length > 0
            ? {
                from: parseISO(scheduleSessions[0].date),
                to: parseISO(scheduleSessions[scheduleSessions.length - 1].date),
              }
            : fallbackFrom && fallbackTo
              ? {
                  from: parseISO(fallbackFrom),
                  to: parseISO(fallbackTo),
                }
              : null;

        const detailRoster = Array.isArray(trainingDetailResponse?.students) ? trainingDetailResponse.students.map(mapAttendanceStudent) : [];
        const roster = rosterFromResponse.length > 0 ? rosterFromResponse : detailRoster;

        setStudents(roster);
        setLocalAttendance(buildAttendanceMap(roster, attendanceRows));
        setAvailableDays(allDays);
        setSessionCalendar(scheduleSessions);
        setTrainingDateRange(nextTrainingRange);
        if (nextTrainingRange) {
          setSelectedDateRange(nextTrainingRange);
        }
        setPendingChanges([]);
      } catch (error) {
        setStudents([]);
        setLocalAttendance({});
        setFetchError(true);
        toast.error(error?.message || "Failed to load attendance data.");
      } finally {
        setIsLoadingMatrix(false);
      }
    },
    [selectedTraining?.endDate, selectedTraining?.startDate]
  );

  useEffect(() => {
    let isMounted = true;

    const loadTrainings = async () => {
      try {
        setIsLoadingTrainings(true);
        setFetchError(false);
        const response = await api.scheduledTrainings.list();
        let trainingList = Array.isArray(response?.scheduled_trainings)
          ? response.scheduled_trainings.map(mapTrainingRecord)
          : [];

        if (!isMounted) {
          return;
        }

        const storeTrainings = useAppStore.getState().trainings || [];
        const mappedMockTrainings = storeTrainings
          .filter((t) => t.status === "Ongoing" || t.status === "Upcoming")
          .map((t) => ({
            id: String(t.id),
            trainingProgramId: String(t.id),
            title: t.title || "",
            courseCode: t.courseCode || "",
            capacity: Number(t.capacity || 0),
            studentCount: Number(t.studentCount || 0),
            status: t.status || "Upcoming",
            startDate: t.startDate || "",
            endDate: t.endDate || "",
          }));

        trainingList = [...trainingList, ...mappedMockTrainings.filter((mt) => !trainingList.some((at) => at.title === mt.title))];
        setTrainings(trainingList);

        const queryTrainingId = searchParams.get("trainingId");
        const nextTrainingId =
          queryTrainingId && trainingList.some((training) => String(training.id) === String(queryTrainingId))
            ? String(queryTrainingId)
            : selectedTrainingId !== "all" && trainingList.some((training) => String(training.id) === String(selectedTrainingId))
              ? String(selectedTrainingId)
              : "all";

        setSelectedTrainingId(nextTrainingId);
      } catch (error) {
        if (isMounted) {
          setTrainings([]);
          setFetchError(true);
          toast.error(error?.message || "Failed to load trainings.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingTrainings(false);
        }
      }
    };

    loadTrainings();
    loadAuditLogs();

    return () => {
      isMounted = false;
    };
  }, [loadAuditLogs, searchParams, selectedTrainingId]);

  useEffect(() => {
    loadAttendanceMatrix(selectedTrainingId);
  }, [loadAttendanceMatrix, selectedTrainingId]);

  const handleFilterChange = ({ training, trainingName, dateRange }) => {
    setSearchQuery(training || "");

    if (trainingName && trainingName !== "all") {
      setSelectedTrainingId(trainingName);
    } else {
      setSelectedTrainingId("all");
    }

    if (dateRange?.from && dateRange?.to) {
      setSelectedDateRange(dateRange);
    }

    const nextTraining = trainings.find((item) => String(item.id) === String(trainingName));
    const formattedDateRange =
      dateRange?.from && dateRange?.to
        ? `Days: ${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`
        : "";
    const filterDesc = [training && `Search: ${training}`, nextTraining && `Training: ${nextTraining.title}`, formattedDateRange]
      .filter(Boolean)
      .join(" | ") || "All Data";

    toast.info(`Filtering for: ${filterDesc}`);
  };

  const performLocalUpdate = useCallback((studentId, dayField, newValue, reason, remarks = "", isOverride = true) => {
    setLocalAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        dayValues: {
          ...prev[studentId]?.dayValues,
          [dayField]: newValue,
          ...(remarks ? { [`${dayField}_remarks`]: remarks } : {}),
        },
        overrides: { ...prev[studentId]?.overrides, [dayField]: isOverride },
      },
    }));

    setPendingChanges((prev) => [
      ...prev.filter((change) => !(String(change.studentId) === String(studentId) && change.dayField === dayField)),
      { studentId, dayField, newValue, reason, remarks, userId: user?.portalId || user?.id, userName: user?.name || "User" },
    ]);
  }, [user?.id, user?.name, user?.portalId]);

  const handleValueChange = (studentId, dayNum, newValue) => {
    const dayField = `day_${dayNum}`;
    const studentRecord = localAttendance[studentId];
    const isImportedValue = !studentRecord?.overrides?.[dayField];

    if (isImportedValue) {
      setActiveOverride({
        studentId,
        dayNum,
        dayField,
        newValue,
        studentName: buildFullName(studentRecord?.firstName, studentRecord?.lastName) || "Student",
      });
      return;
    }

    performLocalUpdate(studentId, dayField, newValue, "", "", false);
  };

  const handleOverrideConfirm = (newValue, reason) => {
    if (!activeOverride) {
      return;
    }

    performLocalUpdate(activeOverride.studentId, activeOverride.dayField, newValue, reason);
    setActiveOverride(null);
    toast.success("Override staged");
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery) {
      return students;
    }

    const normalizedQuery = searchQuery.toLowerCase();
    return students.filter((student) =>
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(normalizedQuery) ||
      String(student.empId || "").toLowerCase().includes(normalizedQuery)
    );
  }, [searchQuery, students]);

  const enrolledCount = selectedTrainingId === "all" ? 0 : students.length;

  const handleBulkAction = (type, value) => {
    if (type !== "set-value" || filteredStudents.length === 0 || selectedDays.length === 0) {
      return;
    }

    filteredStudents.forEach((student) => {
      performLocalUpdate(student.id, `day_${selectedDays[0]}`, value, "Bulk update");
    });
    toast.success(`Bulk updated ${filteredStudents.length} students to ${value}`);
  };

  const handleSave = async () => {
    if (pendingChanges.length === 0 || !selectedTraining || selectedTrainingId === "all") {
      return;
    }

    try {
      await api.attendance.batch({
        updates: pendingChanges.map((change) => ({
          student_id: Number(change.studentId),
          scheduled_training_id: Number(selectedTraining.id),
          day_field: change.dayField,
          new_value: change.newValue,
          reason: change.reason,
          remarks: change.remarks,
          user_id: change.userId,
          user_name: change.userName,
        })),
      });
      toast.success("Successfully saved all changes.");
      await Promise.all([loadAttendanceMatrix(selectedTraining.id), loadAuditLogs()]);
    } catch (error) {
      toast.error(error?.message || "Failed to save attendance changes.");
    }
  };

  const handleDiscard = () => {
    setPendingChanges([]);
    loadAttendanceMatrix(selectedTrainingId);
    toast.error("Discarded all pending changes");
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-20">
      <PageHeader
        icon={ClipboardCheck}
        eyebrow="Daily Tracking"
        title="Attendance Matrix"
        description="Manage cohort hours, remarks and overrides at scale."
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-field)] border border-primary/15 bg-primary/[0.08] px-3 py-1.5 text-xs font-semibold text-primary">
              <Users className="h-3.5 w-3.5" />
              Enrolled: {enrolledCount}
              {searchQuery && ` (Showing ${filteredStudents.length} of ${enrolledCount})`}
            </div>
          </div>
        }
        actions={
          <div className="inline-flex items-center gap-2 rounded-[var(--radius-field)] border border-border/60 bg-background/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Keyboard: Tab / Arrows
          </div>
        }
      />

      {isLoadingTrainings && <p className="text-sm text-muted-foreground">Loading data...</p>}
      {!isLoadingTrainings && fetchError && !isLoadingMatrix && <p className="text-sm text-destructive">Error in fetching data</p>}

      {!isLoadingTrainings && (
        <>
          <AttendanceFilters
            onFilterChange={handleFilterChange}
            trainings={trainings}
            getEnrolledCount={getEnrolledCount}
            selectedTrainingId={selectedTrainingId}
            selectedDateRange={selectedDateRange}
            availableDateRange={trainingDateRange}
          />

          <BulkActionsToolbar
            hasChanges={pendingChanges.length > 0}
            onBulkAction={handleBulkAction}
            onSave={handleSave}
            onDiscard={handleDiscard}
          />

          {isLoadingMatrix ? (
            <p className="text-sm text-muted-foreground">Loading data...</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              <div className="lg:col-span-3">
                <AttendanceMatrix
                  students={filteredStudents}
                  attendanceData={localAttendance}
                  selectedDays={selectedDays}
                  trainingName={selectedTraining?.title || ""}
                  dayLabels={dayLabels}
                  onValueChange={handleValueChange}
                  onRemarksEdit={(_studentId, day) => toast.info(`Remarks editor for Day ${day} is not available yet.`)}
                />
              </div>

              <div className="space-y-6">
                <PremiumCard className="h-fit">
                  <PremiumCardHeader className="border-b border-border/50 pb-2">
                    <PremiumCardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted-foreground">
                      <History className="h-4 w-4 text-primary" /> Recent Audit
                    </PremiumCardTitle>
                  </PremiumCardHeader>
                  <PremiumCardContent className="pt-4">
                    <div className="space-y-4">
                      {recentAudit.length > 0 ? recentAudit.map((entry) => (
                        <div key={entry.id} className="relative border-l border-primary/15 pb-4 pl-6 last:pb-0">
                          <div className="absolute -left-[7px] top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-primary/20 bg-background">
                            <Shield className="h-2 w-2 text-primary" />
                          </div>
                          <p className="truncate text-xs font-bold text-foreground">{entry.details || entry.action}</p>
                          <p className="mt-1 text-[9px] uppercase tracking-tighter text-muted-foreground/70">
                            {entry.changed_by_name || "System"} - {new Date(entry.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      )) : (
                        <p className="text-xs text-muted-foreground">No recent attendance audits found.</p>
                      )}
                    </div>
                  </PremiumCardContent>
                </PremiumCard>

                <div className="surface-shell-soft p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                    <Shield className="h-3 w-3" /> Compliance Check
                  </h4>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    All overrides require valid business reasons. Audit logs are immutable and tracked for compliance reviews.
                  </p>
                </div>

                <PremiumCard>
                  <PremiumCardHeader className="border-b border-border/50 pb-2">
                    <PremiumCardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      <Users className="h-3.5 w-3.5 text-primary" /> Training Overview
                    </PremiumCardTitle>
                  </PremiumCardHeader>
                  <PremiumCardContent className="px-3 pt-4">
                    <ScrollArea className="max-h-[280px]">
                      <div className="space-y-2">
                        {trainings.map((training) => {
                          const count = getEnrolledCount(training.id);
                          return (
                            <div
                              key={training.id}
                              className={cn(
                                "flex cursor-pointer items-center justify-between rounded-[var(--radius-field)] border p-2.5 transition-colors",
                                String(selectedTrainingId) === String(training.id)
                                  ? "border-primary/15 bg-primary/[0.08]"
                                  : "border-border/60 bg-background/80 hover:bg-secondary/70"
                              )}
                              onClick={() => handleFilterChange({ trainingName: training.id })}
                            >
                              <div className="min-w-0 pr-2">
                                <p className="truncate text-xs font-bold text-foreground">{training.title}</p>
                                <p className="text-[10px] font-medium uppercase tracking-tighter text-muted-foreground">{training.courseCode}</p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <p className="text-xs font-black text-primary">{count}</p>
                                <p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground">Enrolled</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <ScrollBar orientation="vertical" />
                    </ScrollArea>
                  </PremiumCardContent>
                </PremiumCard>
              </div>
            </div>
          )}
        </>
      )}

      {activeOverride && (
        <OverrideModal
          open={!!activeOverride}
          onOpenChange={(open) => !open && setActiveOverride(null)}
          studentName={activeOverride.studentName}
          dayLabel={`Day ${activeOverride.dayNum}`}
          currentValue={activeOverride.newValue}
          onConfirm={handleOverrideConfirm}
        />
      )}
    </div>
  );
}
