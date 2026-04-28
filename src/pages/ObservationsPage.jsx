import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/app-store";
import { ObservationFilters } from "@/components/observations/ObservationFilters";
import { ObservationMatrix } from "@/components/observations/ObservationMatrix";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Save, RotateCcw, Eye, Users, CheckCircle2, Clock3, CircleDashed, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { api } from "@/data/api";

const mapTrainingRecord = (training) => ({
  id: String(training.id),
  title: training.title || "",
  courseCode: training.course_code || training.courseCode || "",
  studentCount: Number(training.student_count || training.studentCount || 0),
  status: training.status || "Upcoming",
  startDate: training.start_date || training.startDate || "",
  endDate: training.end_date || training.endDate || "",
});

const mapRosterStudent = (student) => ({
  id: String(student.student_id || student.id),
  studentId: String(student.student_id || student.id),
  portalId: student.portalid || "",
  firstName: student.first_name || student.firstName || "",
  lastName: student.last_name || student.lastName || "",
  empId: student.portalid || "",
  language: student.language || "",
  status: student.status || "Scheduled",
});

const infoCardClass = "surface-panel flex items-center gap-2 px-3 py-2 text-sm";

export default function ObservationsPage() {
  const user = useAppStore((s) => s.user);
  const [searchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTraining, setSelectedTraining] = useState(searchParams.get("trainingId") || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [trainings, setTrainings] = useState([]);
  const [students, setStudents] = useState([]);
  const [localObservations, setLocalObservations] = useState({});
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const getEnrolledCount = useCallback(
    (trainingId) => trainings.find((training) => String(training.id) === String(trainingId))?.studentCount || 0,
    [trainings]
  );

  useEffect(() => {
    let isMounted = true;

    const loadTrainings = async () => {
      try {
        if (isMounted) {
          setIsLoadingData(true);
          setFetchError(false);
        }

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
            title: t.title || "",
            courseCode: t.courseCode || "",
            studentCount: Number(t.studentCount || 0),
            status: t.status || "Upcoming",
            startDate: t.startDate || "",
            endDate: t.endDate || "",
          }));

        trainingList = [...trainingList, ...mappedMockTrainings.filter((mt) => !trainingList.some((at) => at.title === mt.title))];

        setTrainings(trainingList);
        if (trainingList.length > 0) {
          const requestedTrainingId = searchParams.get("trainingId");
          const requestedTraining =
            requestedTrainingId && trainingList.find((training) => String(training.id) === String(requestedTrainingId));
          const preferredTraining =
            requestedTraining ||
            trainingList.find((training) => String(training.status).toLowerCase() === "ongoing") ||
            trainingList[0];

          setSelectedTraining((current) => {
            if (current !== "all" && trainingList.some((training) => String(training.id) === String(current))) {
              return current;
            }
            return preferredTraining ? String(preferredTraining.id) : "all";
          });
        }
        setIsLoadingData(false);
      } catch (error) {
        if (isMounted) {
          setTrainings([]);
          setFetchError(true);
          setIsLoadingData(false);
        }
        toast.error(error?.message || "Failed to load trainings.");
      }
    };

    loadTrainings();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const loadRosterAndObservations = useCallback(async () => {
    if (!selectedTraining || selectedTraining === "all" || !selectedDate) {
      setStudents([]);
      setLocalObservations({});
      setHasUnsaved(false);
      return;
    }

    try {
      setIsLoadingRows(true);
      setFetchError(false);

      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const [trainingDetail, observationsResponse] = await Promise.all([
        api.scheduledTrainings.detail(selectedTraining),
        api.observations.list({
          date: dateStr,
          training_id: selectedTraining,
          scheduled_training_id: selectedTraining,
        }),
      ]);

      const roster = Array.isArray(trainingDetail?.students) ? trainingDetail.students.map(mapRosterStudent) : [];
      const observationRows = Array.isArray(observationsResponse?.observations) ? observationsResponse.observations : [];
      const observationMap = {};

      observationRows.forEach((observation) => {
        observationMap[String(observation.student_id)] = {
          softSkills: observation.softSkills || "",
          technicalSkills: observation.technicalSkills || "",
          attendanceRating: observation.attendanceRating || "",
          behavior: observation.behavior || "",
          learnerHealth: observation.learnerHealth || "",
          observationText: observation.observationText || "",
          _saved: observation.saved ?? true,
          _existingId: observation.id,
        };
      });

      setStudents(roster);
      setLocalObservations(observationMap);
      setHasUnsaved(false);
    } catch (error) {
      setStudents([]);
      setLocalObservations({});
      setFetchError(true);
      toast.error(error?.message || "Failed to load observations.");
    } finally {
      setIsLoadingRows(false);
    }
  }, [selectedDate, selectedTraining]);

  useEffect(() => {
    loadRosterAndObservations();
  }, [loadRosterAndObservations]);

  const filteredStudents = useMemo(() => {
    let list = [...students];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (student) =>
          `${student.firstName} ${student.lastName}`.toLowerCase().includes(query) ||
          String(student.empId || "").toLowerCase().includes(query)
      );
    }
    return list;
  }, [searchQuery, students]);

  const stats = useMemo(() => {
    const total = filteredStudents.length;
    let completed = 0;
    let draft = 0;
    filteredStudents.forEach((student) => {
      const row = localObservations[student.id];
      if (!row) return;
      const filled = [row.softSkills, row.technicalSkills, row.attendanceRating, row.behavior, row.learnerHealth].filter(Boolean).length;
      if (row._saved) completed++;
      else if (filled > 0 || row.observationText) draft++;
    });
    return { total, completed, draft, pending: total - completed - draft };
  }, [filteredStudents, localObservations]);

  const handleFieldChange = useCallback((studentId, field, value) => {
    setLocalObservations((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
        _saved: false,
      },
    }));
    setHasUnsaved(true);
  }, []);

  const handleSaveAll = async () => {
    if (!selectedDate) {
      toast.error("Please select a date first");
      return;
    }

    if (!selectedTraining || selectedTraining === "all") {
      toast.error("Please select a training first");
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const rows = filteredStudents
      .map((student) => ({
        student_id: Number(student.id),
        softSkills: localObservations[student.id]?.softSkills || "",
        technicalSkills: localObservations[student.id]?.technicalSkills || "",
        attendanceRating: localObservations[student.id]?.attendanceRating || "",
        behavior: localObservations[student.id]?.behavior || "",
        learnerHealth: localObservations[student.id]?.learnerHealth || "",
        observationText: localObservations[student.id]?.observationText || "",
      }))
      .filter((row) =>
        [row.softSkills, row.technicalSkills, row.attendanceRating, row.behavior, row.learnerHealth].some(Boolean) ||
        row.observationText
      );

    try {
      const response = await api.observations.bulk({
        date: dateStr,
        training_id: Number(selectedTraining),
        scheduled_training_id: Number(selectedTraining),
        trainer_id: Number(user?.trainerId || user?.id),
        rows,
      });

      const savedRows = Array.isArray(response?.saved_rows) ? response.saved_rows : [];
      setLocalObservations((prev) => {
        const updated = { ...prev };
        savedRows.forEach((savedRow) => {
          const key = String(savedRow.student_id);
          updated[key] = {
            ...updated[key],
            _saved: true,
            _existingId: savedRow.id || updated[key]?._existingId,
          };
        });
        return updated;
      });
      setHasUnsaved(false);
      toast.success(`Saved ${savedRows.length} observation${savedRows.length !== 1 ? "s" : ""} successfully`);
    } catch (error) {
      toast.error(error?.message || "Failed to save observations.");
    }
  };

  const handleDiscard = () => {
    loadRosterAndObservations();
    toast.error("Discarded all pending changes");
  };

  const selectedTrainingObj = trainings.find((training) => String(training.id) === String(selectedTraining));

  useEffect(() => {
    const handler = (event) => {
      if (hasUnsaved) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-20">
      <PageHeader
        icon={Eye}
        eyebrow="Learner Insights"
        title="Daily Observations"
        description="Record qualitative performance observations for each student on a selected date."
        meta={
          hasUnsaved ? (
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-field)] border border-primary/15 bg-primary/[0.08] px-3 py-1.5 text-xs font-semibold text-primary">
              <AlertTriangle className="h-3.5 w-3.5" />
              Changes staged
            </div>
          ) : null
        }
      />

      {isLoadingData && <p className="text-sm text-muted-foreground">Loading data...</p>}
      {!isLoadingData && fetchError && !isLoadingRows && <p className="text-sm text-destructive">Error in fetching data</p>}

      {!isLoadingData && (
        <>
          <ObservationFilters
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            selectedTraining={selectedTraining}
            onTrainingChange={setSelectedTraining}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            trainings={trainings}
            getEnrolledCount={getEnrolledCount}
          />

          {selectedDate && (
            <div className="surface-shell flex flex-wrap items-center gap-3 p-4 animate-fade-in">
              <div className={infoCardClass}>
                <span className="font-medium text-muted-foreground">Date:</span>
                <span className="font-bold text-foreground">{format(selectedDate, "MMM dd, yyyy")}</span>
              </div>
              {selectedTrainingObj && (
                <div className={infoCardClass}>
                  <span className="font-medium text-muted-foreground">Training:</span>
                  <span className="font-bold text-foreground">{selectedTrainingObj.title}</span>
                </div>
              )}
              <div className={infoCardClass}>
                <Users className="h-4 w-4 text-primary" />
                <span className="font-bold text-foreground">{stats.total}</span>
                <span className="text-xs text-muted-foreground">Students</span>
              </div>
              <div className={infoCardClass}>
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-bold text-foreground">{stats.completed}</span>
                <span className="text-xs text-muted-foreground">Completed</span>
              </div>
              <div className={infoCardClass}>
                <Clock3 className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-foreground">{stats.draft}</span>
                <span className="text-xs text-muted-foreground">In Progress</span>
              </div>
              <div className={infoCardClass}>
                <CircleDashed className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-foreground">{stats.pending}</span>
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleDiscard} disabled={!hasUnsaved} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Discard
                </Button>
                <Button size="sm" onClick={handleSaveAll} disabled={!hasUnsaved} className="gap-1.5">
                  <Save className="h-3.5 w-3.5" /> Save All
                </Button>
              </div>
            </div>
          )}

          {selectedDate ? (
            isLoadingRows ? (
              <p className="text-sm text-muted-foreground">Loading data...</p>
            ) : selectedTraining === "all" ? (
              <div className="surface-shell flex flex-col items-center justify-center py-24 text-center">
                <Eye className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <h3 className="text-lg font-bold text-foreground">Select a Training to Begin</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Observations are loaded per scheduled training. Choose a training from the filter above to load the student roster from the API.
                </p>
              </div>
            ) : (
              <ObservationMatrix students={filteredStudents} observations={localObservations} onFieldChange={handleFieldChange} />
            )
          ) : (
            <div className="surface-shell flex flex-col items-center justify-center py-24 text-center">
              <Eye className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="text-lg font-bold text-foreground">Select a Date to Begin</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Choose an observation date from the filter above to load the student roster and start recording daily observations.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
