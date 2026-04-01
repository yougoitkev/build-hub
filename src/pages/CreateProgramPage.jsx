import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/app-store";
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent, PremiumCardFooter } from "@/components/learning/PremiumCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarIcon, Users, CheckCircle2, ArrowRight, ArrowLeft, User, MapPin, Briefcase, Crown, GripVertical, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInBusinessDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/data/api";

const LEADERS_BY_REGION = {
  "Miami": "Rachel Adams",
  "Austin": "Marcus Johnson",
  "Dallas": "Patricia Chen",
  "Remote": "Daniel Foster",
};

const normalizeId = (value) => (value === undefined || value === null ? "" : String(value));

const mapTrainerRecord = (trainer) => ({
  id: normalizeId(trainer.id),
  portalId: trainer.portalid || trainer.portalId || "",
  email: trainer.emailid || trainer.email || "",
  firstName: trainer.first_name || trainer.firstName || "",
  lastName: trainer.last_name || trainer.lastName || "",
  name:
    trainer.full_name ||
    trainer.name ||
    `${trainer.first_name || trainer.firstName || ""} ${trainer.last_name || trainer.lastName || ""}`.trim(),
  role: trainer.role || "",
  status: trainer.status || "Active",
  leader: trainer.leader || "No",
  supervisor: trainer.supervisor || "",
  location: trainer.location || "Miami",
  language: trainer.language || "English",
});

const mapProgramRecord = (program) => ({
  id: normalizeId(program.id),
  title: program.title || "",
  courseCode: program.course_code || program.courseCode || "",
  trainerId: normalizeId(program.trainer_id || program.trainerId),
  trainerPortalId: program.trainer_portalid || program.trainerPortalId || "",
  trainerName: program.trainer_name || program.trainerName || "",
  templateId: normalizeId(program.template_id || program.program_template_id || program.templateId),
  templateName: program.template_name || program.templateName || "",
  description: program.description || "",
  startDate: program.start_date || program.startDate || "",
  endDate: program.end_date || program.endDate || "",
  status: program.status || "Upcoming",
  capacity: Number(program.capacity || 0),
});

const mapTemplateRecord = (template) => ({
  id: normalizeId(template.id),
  name: template.template_name || template.name || "",
  code: template.template_code || template.code || "",
  description: template.description || "",
  days: Number(template.duration_days || template.days || 0),
  defaultCapacity: Number(template.default_capacity || template.defaultCapacity || 0),
  isActive: template.is_active ?? template.isActive ?? true,
});

const mapStudentRecord = (student) => ({
  id: normalizeId(student.id ?? student.emp_id ?? student.empId ?? student.portalid ?? student.portalId),
  portalId:
    student.see_details_portalid ||
    student.portalid ||
    student.portal_id ||
    student.emp_id ||
    student.empId ||
    "",
  firstName:
    student.first_name ||
    student.firstName ||
    student.learner_name?.split(" ")?.[0] ||
    "",
  lastName:
    student.last_name ||
    student.lastName ||
    student.learner_name?.split(" ").slice(1).join(" ") ||
    "",
  empId:
    student.see_details_portalid ||
    student.portalid ||
    student.portal_id ||
    student.emp_id ||
    student.empId ||
    "",
  location:
    /^(.+?)\s*\((.+)\)$/.exec(student.location_display || student.location || "")?.[1]?.trim() ||
    student.location_display ||
    student.location ||
    "",
  wfh:
    /^(.+?)\s*\((.+)\)$/.exec(student.location_display || student.location || "")?.[2]?.trim() ||
    student.wfh ||
    "No",
  status: String(student.status || "Active"),
  roleAssignment: student.role_assignment || student.roleAssignment || "Agent",
  language: student.language || "",
});

const to24HourTime = (hour, minute, period) => {
  let normalizedHour = Number(hour || 0) % 12;
  if (String(period).toUpperCase() === "PM") {
    normalizedHour += 12;
  }
  return `${String(normalizedHour).padStart(2, "0")}:${String(minute || "00").padStart(2, "0")}`;
};

export default function CreateProgramPage() {
  const navigate = useNavigate();
  const user = useAppStore(s => s.user);

  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";
  const [trainers, setTrainers] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [systemHolidays, setSystemHolidays] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-populate trainer from logged-in user (supervisor defaults to self)
  const [assignedTrainerId, setAssignedTrainerId] = useState(
    normalizeId(user?.trainerId || user?.id || "")
  );

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        setIsLoadingData(true);
        setFetchError(false);
      }

      const results = await Promise.allSettled([
        api.trainers.list(),
        api.trainingPrograms.list(),
        api.templates.list(),
        api.holidays.list({ is_active: true }),
        api.studentsPage.list(),
      ]);

      if (!isMounted) {
        return;
      }

      const [trainersResult, programsResult, templatesResult, holidaysResult, studentsResult] = results;

      if (results.some((result) => result.status === "rejected")) {
        setTrainers([]);
        setTrainings([]);
        setTemplates([]);
        setSystemHolidays([]);
        setAllStudents([]);
        setFetchError(true);
        setIsLoadingData(false);
        toast.error("Failed to load schedule data.");
        return;
      }

      setTrainers(Array.isArray(trainersResult.value?.trainers) ? trainersResult.value.trainers.map(mapTrainerRecord) : []);
      
      // Strict Strategy: Use ONLY the 35 mock names as templates
      const apiPrograms = Array.isArray(programsResult.value?.programs) ? programsResult.value.programs.map(mapProgramRecord) : [];
      const storeTrainings = useAppStore.getState().trainings || [];
      const mockPrograms = storeTrainings.map(mapProgramRecord);

      // We only show mock programs (the 35 target names)
      // If the backend already has one with the same title, we use its backend ID
      const strictPrograms = mockPrograms.map(mp => {
        const matchingApi = apiPrograms.find(ap => ap.title.toLowerCase().trim() === mp.title.toLowerCase().trim());
        return matchingApi ? matchingApi : mp;
      });

      setTrainings(strictPrograms);
      setTemplates(Array.isArray(templatesResult.value?.templates) ? templatesResult.value.templates.map(mapTemplateRecord) : []);
      setSystemHolidays(Array.isArray(holidaysResult.value?.holidays) ? holidaysResult.value.holidays : []);
      setAllStudents(Array.isArray(studentsResult.value?.students) ? studentsResult.value.students.map(mapStudentRecord) : []);
      setIsLoadingData(false);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!trainers.length || assignedTrainerId) {
      return;
    }

    const matchedTrainer = trainers.find((trainer) =>
      String(trainer.portalId || "").toLowerCase() === String(user?.portalId || "").toLowerCase() ||
      String(trainer.email || "").toLowerCase() === String(user?.email || "").toLowerCase() ||
      String(trainer.name || "").toLowerCase() === String(user?.name || "").toLowerCase()
    );

    if (matchedTrainer) {
      setAssignedTrainerId(matchedTrainer.id);
    }
  }, [assignedTrainerId, trainers, user?.email, user?.name, user?.portalId]);

  const currentTrainer = useMemo(() => {
    const directMatch = trainers.find((trainer) => trainer.id === assignedTrainerId);
    if (directMatch) {
      return directMatch;
    }

    return trainers.find((trainer) =>
      String(trainer.portalId || "").toLowerCase() === String(user?.portalId || "").toLowerCase() ||
      String(trainer.email || "").toLowerCase() === String(user?.email || "").toLowerCase() ||
      String(trainer.name || "").toLowerCase() === String(user?.name || "").toLowerCase()
    );
  }, [assignedTrainerId, trainers, user]);

  const autoRegion = currentTrainer?.region || currentTrainer?.location || "Miami";
  const leader = LEADERS_BY_REGION[autoRegion] || "TBD";

  const [step, setStep] = useState(1);
  const STEPS = ["Program", "Students", "Schedule", "Review"];

  // Step 1: Program selection only
  const [programId, setProgramId] = useState("");
  const [newProgramTitle, setNewProgramTitle] = useState("");

  // Step 2: Students
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [draggedStudent, setDraggedStudent] = useState(null);

  // Step 3: Schedule
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(null);
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState("AM");
  const [endHour, setEndHour] = useState("05");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState("PM");
  const [rules, setRules] = useState({ mode: "business", skipHolidays: true });

  const hours = ["01","02","03","04","05","06","07","08","09","10","11","12"];
  const minutes = ["00","15","30","45"];

  // Programs for current trainer
  const trainerPrograms = useMemo(() => {
    if (!currentTrainer) return trainings;
    return trainings.filter((training) =>
      String(training.trainerId) === String(currentTrainer.id) ||
      String(training.trainerPortalId || "").toLowerCase() === String(currentTrainer.portalId || "").toLowerCase()
    );
  }, [currentTrainer, trainings]);

  const selectablePrograms = useMemo(() => {
    const trainerProgramIds = new Set(trainerPrograms.map((program) => String(program.id)));

    return [...trainings]
      .sort((left, right) => {
        const leftOwned = trainerProgramIds.has(String(left.id)) ? 1 : 0;
        const rightOwned = trainerProgramIds.has(String(right.id)) ? 1 : 0;

        if (leftOwned !== rightOwned) {
          return rightOwned - leftOwned;
        }

        return String(left.title || "").localeCompare(String(right.title || ""));
      });
  }, [trainerPrograms, trainings]);

  // Students filtered by active status only
  const filteredStudents = useMemo(() => {
    return allStudents.filter(s => {
      if (String(s.status).toLowerCase() !== "active") return false;
      return true;
    });
  }, [allStudents]);

  const availableStudents = useMemo(() =>
    filteredStudents.filter(s => !selectedStudents.includes(s.id)),
    [filteredStudents, selectedStudents]
  );

  const durationDays = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return null;
    if (rules.mode === "business") {
      return differenceInBusinessDays(endDate, startDate) + 1;
    }
    // Calendar days (include weekends)
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate, rules.mode]);

  const programTitle = programId === "new" ? newProgramTitle : selectablePrograms.find((p) => p.id === programId)?.title || "";

  // Drag and drop handlers
  const handleDragStart = (e, studentId, source) => {
    setDraggedStudent({ id: studentId, source });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropToSelected = (e) => {
    e.preventDefault();
    if (draggedStudent && draggedStudent.source === "available") {
      setSelectedStudents(prev => [...prev, draggedStudent.id]);
    }
    setDraggedStudent(null);
  };

  const handleDropToAvailable = (e) => {
    e.preventDefault();
    if (draggedStudent && draggedStudent.source === "selected") {
      setSelectedStudents(prev => prev.filter(id => id !== draggedStudent.id));
    }
    setDraggedStudent(null);
  };

  const toggleStudent = (id) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step === 1) {
      if (!programId) return toast.error("Select a training program");
      if (programId === "new" && !newProgramTitle) return toast.error("Enter a program title");
    }
    if (step === 2 && selectedStudents.length === 0) return toast.error("Select at least one student");
    if (step === 3) {
      if (!startDate) return toast.error("Start date is required");
      if (!endDate) return toast.error("End date is required");
      if (endDate < startDate) return toast.error("End date must be after start date");
    }
    setStep(s => Math.min(s + 1, 4));
  };

  const handleSubmit = async () => {
    try {
      if (!currentTrainer?.portalId) {
        toast.error("A trainer with a valid portal ID is required to schedule training.");
        return;
      }

      const title = programTitle;
      const selectedProgram = selectablePrograms.find((program) => program.id === programId);
      const selectedStudentPortalIds = selectedStudents
        .map((studentId) => allStudents.find((student) => student.id === studentId)?.portalId)
        .filter(Boolean);

      if (selectedStudentPortalIds.length !== selectedStudents.length) {
        toast.error("One or more selected students are missing portal IDs.");
        return;
      }

      setIsSubmitting(true);

      let trainingProgramId = programId;
      const scheduleStartTime = to24HourTime(startHour, startMinute, startPeriod);
      const scheduleEndTime = to24HourTime(endHour, endMinute, endPeriod);

      // Auto-Sync: If programId is from mock list (starts with 'tr') and not in backend, create it
      const isMockId = String(programId).startsWith('tr');

      if (programId === "new" || (isMockId && selectedProgram)) {
        const payload = {
          title,
          trainer_portalid: currentTrainer.portalId,
          description: title || "Training Program",
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          capacity: selectedStudents.length || 20,
          course_code: `TR-${Math.floor(1000 + Math.random() * 9000)}`, // Fix for "missing fields"
        };

        const programResponse = await api.trainingPrograms.create(payload);
        const createdProgram = mapProgramRecord(programResponse?.program || {});
        trainingProgramId = createdProgram.id;
        
        // Update local state to reflect the new backend record
        setTrainings((current) => {
          const filtered = current.filter(t => t.id !== programId); // remove mock if it existed
          return [...filtered, createdProgram];
        });
      }

      const scheduleResponse = await api.scheduledTrainings.create({
        training_program_id: Number.isNaN(Number(trainingProgramId)) ? trainingProgramId : Number(trainingProgramId),
        trainer_portalid: currentTrainer.portalId,
        student_portal_ids: selectedStudentPortalIds,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        start_time: scheduleStartTime,
        end_time: scheduleEndTime,
        business_days_only: rules.mode === "business",
        skip_system_holidays: rules.skipHolidays,
        location: autoRegion,
        notes: [
          `${title}`,
          `Start time ${startHour}:${startMinute} ${startPeriod}`,
          `End time ${endHour}:${endMinute} ${endPeriod}`,
        ].join(" | "),
      });

      const scheduledTraining =
        (scheduleResponse?.scheduled_training_id ? { id: scheduleResponse.scheduled_training_id } : null) ||
        scheduleResponse?.scheduled_training ||
        scheduleResponse?.training ||
        scheduleResponse?.data;

      toast.success(
        scheduledTraining?.id
          ? `Successfully scheduled "${title}" as batch #${scheduledTraining.id}.`
          : `Successfully scheduled "${title}".`
      );
      navigate('/calendar');
    } catch (e) {
      toast.error(e.message || "Failed to create program");
    } finally {
      setIsSubmitting(false);
    }
  };

  const StudentCard = ({ student, source, isDragging }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, student.id, source)}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border cursor-grab active:cursor-grabbing transition-all hover:shadow-md group",
        source === "selected"
          ? "bg-primary/[0.04] border-primary/20 hover:border-primary/40"
          : "bg-card border-border/50 hover:border-border",
        isDragging && "opacity-50"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{student.firstName} {student.lastName}</p>
        <p className="text-xs text-muted-foreground">ID: {student.empId} • {student.location} • {student.roleAssignment}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); toggleStudent(student.id); }}
        className={cn(
          "text-xs font-bold px-2 py-1 rounded-md transition-colors shrink-0",
          source === "selected"
            ? "text-destructive hover:bg-destructive/10"
            : "text-primary hover:bg-primary/10"
        )}
      >
        {source === "selected" ? "Remove" : "Add"}
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fade-in space-y-8 animate-slide-in">
      <div className="glass-panel p-8 rounded-2xl shadow-sm">
        <h1 className="text-3xl font-black mb-2">Schedule Training</h1>
        <p className="text-muted-foreground">Select a program, pick students, and set dates to auto-generate sessions.</p>
      </div>

      {/* Auto-populated info bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
          <User className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trainer</p>
            {isSupervisor ? (
                  <Select value={assignedTrainerId} onValueChange={setAssignedTrainerId}>
                    <SelectTrigger className="h-8 text-sm font-bold border-none p-0 shadow-none bg-transparent">
                      <SelectValue placeholder="Select trainer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {trainers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm font-bold truncate">{currentTrainer?.name || user?.name || "—"}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Region</p>
            <p className="text-sm font-bold">{autoRegion}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
          <Briefcase className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Role</p>
            <p className="text-sm font-bold">{currentTrainer?.role || "Trainer"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
          <Crown className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Leader</p>
            <p className="text-sm font-bold">{leader}</p>
          </div>
        </div>
      </div>

      {isLoadingData && (
        <p className="text-sm text-muted-foreground">Loading data...</p>
      )}
      {!isLoadingData && fetchError && (
        <p className="text-sm text-destructive">Error in fetching data</p>
      )}

      {!isLoadingData && !fetchError && (
      <>
      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-border/50 -z-10 -translate-y-1/2 rounded-full"></div>
        <div className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-col items-center">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-4 border-background",
              step > i + 1 ? "bg-primary text-primary-foreground" : step === i + 1 ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-muted text-muted-foreground"
            )}>
              {step > i + 1 ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest mt-2">{s}</span>
          </div>
        ))}
      </div>

      <PremiumCard className="min-h-[400px] glass-card">
        <PremiumCardContent>
          {/* STEP 1: Program Selection Only */}
          {step === 1 && (
            <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Training Program <span className="text-destructive">*</span></Label>
                <Select value={programId} onValueChange={setProgramId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Select a training program or create new" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ Create New Program</SelectItem>
                    {selectablePrograms.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {programId === "new" && (
                <div className="p-4 bg-muted/20 rounded-xl border border-border/30">
                  <div className="space-y-2">
                    <Label>Program Title <span className="text-destructive">*</span></Label>
                    <Input placeholder="e.g. New Hire Onboarding Q3" value={newProgramTitle} onChange={e => setNewProgramTitle(e.target.value)} />
                  </div>
                </div>
              )}

              {programId && programId !== "new" && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <p className="text-sm font-bold text-foreground">{programTitle}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: {selectablePrograms.find((p) => p.id === programId)?.status}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Student Selection with Drag & Drop */}
          {step === 2 && (
            <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
                <div>
                  <h3 className="font-bold text-lg text-foreground">Student Selection</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag students between lists or click Add/Remove. Region: <span className="font-semibold text-primary">{autoRegion}</span>
                  </p>
                </div>
                <div className="px-4 py-2 rounded-full border text-sm font-black bg-primary/10 text-primary border-primary/20">
                  {selectedStudents.length} Selected
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Available */}
                <div
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-3 min-h-[350px] max-h-[450px] overflow-y-auto transition-colors",
                    draggedStudent?.source === "selected" ? "border-primary/40 bg-primary/[0.02]" : "border-border/30"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={handleDropToAvailable}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">Available ({availableStudents.length})</p>
                  <div className="space-y-2">
                    {availableStudents.map(s => (
                      <StudentCard key={s.id} student={s} source="available" />
                    ))}
                    {availableStudents.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">All students selected</p>
                    )}
                  </div>
                </div>

                {/* Selected */}
                <div
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-3 min-h-[350px] max-h-[450px] overflow-y-auto transition-colors",
                    draggedStudent?.source === "available" ? "border-primary/40 bg-primary/[0.02]" : "border-primary/20 bg-primary/[0.01]"
                  )}
                  onDragOver={handleDragOver}
                  onDrop={handleDropToSelected}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3 px-1">Selected ({selectedStudents.length})</p>
                  <div className="space-y-2">
                    {selectedStudents.map(id => {
                      const s = allStudents.find(st => st.id === id);
                      return s ? <StudentCard key={s.id} student={s} source="selected" /> : null;
                    })}
                    {selectedStudents.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Drag students here or click Add</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Schedule */}
          {step === 3 && (
            <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-6">
                {/* Start Date + Time */}
                <div className="space-y-3">
                  <Label>Start Date <span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full h-12 justify-start text-left font-normal bg-card", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {startDate ? format(startDate, "MMM d, yyyy") : <span>Select start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Start Time</Label>
                    <div className="flex items-center gap-2">
                      <Select value={startHour} onValueChange={setStartHour}>
                        <SelectTrigger className="w-[70px] h-10 bg-card"><SelectValue /></SelectTrigger>
                        <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                      </Select>
                      <span className="text-muted-foreground font-bold">:</span>
                      <Select value={startMinute} onValueChange={setStartMinute}>
                        <SelectTrigger className="w-[70px] h-10 bg-card"><SelectValue /></SelectTrigger>
                        <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={startPeriod} onValueChange={setStartPeriod}>
                        <SelectTrigger className="w-[72px] h-10 bg-card"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* End Date + Time */}
                <div className="space-y-3">
                  <Label>End Date <span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full h-12 justify-start text-left font-normal bg-card", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {endDate ? format(endDate, "MMM d, yyyy") : <span>Select end date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className="p-3 pointer-events-auto" disabled={(date) => startDate && date < startDate} />
                    </PopoverContent>
                  </Popover>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> End Time</Label>
                    <div className="flex items-center gap-2">
                      <Select value={endHour} onValueChange={setEndHour}>
                        <SelectTrigger className="w-[70px] h-10 bg-card"><SelectValue /></SelectTrigger>
                        <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                      </Select>
                      <span className="text-muted-foreground font-bold">:</span>
                      <Select value={endMinute} onValueChange={setEndMinute}>
                        <SelectTrigger className="w-[70px] h-10 bg-card"><SelectValue /></SelectTrigger>
                        <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={endPeriod} onValueChange={setEndPeriod}>
                        <SelectTrigger className="w-[72px] h-10 bg-card"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AM">AM</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {durationDays && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Duration: {durationDays} {rules.mode === "business" ? "business" : "calendar"} days</p>
                    <p className="text-xs text-muted-foreground">{format(startDate, "MMM d")} ({startHour}:{startMinute} {startPeriod}) — {format(endDate, "MMM d, yyyy")} ({endHour}:{endMinute} {endPeriod})</p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border/50 space-y-6">
                <h3 className="font-bold text-foreground uppercase tracking-widest text-xs">Allocation Rules</h3>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                  <div>
                    <p className="font-bold text-sm text-foreground mb-1">Business Days Only</p>
                    <p className="text-xs text-muted-foreground">Skip Saturdays and Sundays.</p>
                  </div>
                  <Switch checked={rules.mode === "business"} onCheckedChange={c => setRules({ ...rules, mode: c ? "business" : "calendar" })} />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                  <div>
                    <p className="font-bold text-sm text-foreground mb-1">Skip System Holidays</p>
                    <p className="text-xs text-muted-foreground">Push sessions past holidays ({systemHolidays.length} configured).</p>
                  </div>
                  <Switch checked={rules.skipHolidays} onCheckedChange={c => setRules({ ...rules, skipHolidays: c })} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-right-4">
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                <h2 className="text-xl font-black mb-3 text-foreground">{programTitle}</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4 text-primary" />
                    <span>Trainer: <span className="font-semibold text-foreground">{currentTrainer?.name || user?.name}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>Region: <span className="font-semibold text-foreground">{autoRegion}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span>Role: <span className="font-semibold text-foreground">{currentTrainer?.role || "Trainer"}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <span>Leader: <span className="font-semibold text-foreground">{leader}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Students: <span className="font-semibold text-foreground">{selectedStudents.length}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <span>Duration: <span className="font-semibold text-foreground">{durationDays || "—"} {rules.mode === "business" ? "business" : "calendar"} days</span></span>
                  </div>
                </div>
              </div>

              {startDate && endDate && (
                <div className="bg-muted/20 rounded-xl p-4 border border-border/30">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Date Range</p>
                  <p className="text-sm font-semibold text-foreground">{format(startDate, "EEEE, MMMM do yyyy")} — {format(endDate, "EEEE, MMMM do yyyy")}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Enrolled Students</p>
                <div className="flex flex-wrap gap-2">
                  {selectedStudents.map(id => {
                    const s = allStudents.find(st => st.id === id);
                    return s ? (
                      <span key={id} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-semibold">
                        {s.firstName} {s.lastName}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          )}
        </PremiumCardContent>
        <PremiumCardFooter className="flex items-center justify-between bg-muted/10 border-t border-border/50 pt-4">
          <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 1} className="font-bold">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {step < 4 ? (
            <Button onClick={handleNext} className="bg-primary px-8 font-bold">
              Next Step <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary px-8 font-bold shadow-lg shadow-primary/20">
              Confirm & Schedule <CheckCircle2 className="ml-2 h-4 w-4" />
            </Button>
          )}
        </PremiumCardFooter>
      </PremiumCard>
      </>
      )}
    </div>
  );
}
