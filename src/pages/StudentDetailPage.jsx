import * as React from "react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/app-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Save, X, ArrowLeft, User, GraduationCap, Briefcase, Network, Settings, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/data/api";
function Section({ title, icon: Icon, children }) {
  return (
    <PremiumCard className="h-full">
      <PremiumCardHeader className="pb-4 border-b border-border/50 bg-muted/20">
        <PremiumCardTitle className="text-base flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </PremiumCardTitle>
      </PremiumCardHeader>
      <PremiumCardContent className="pt-6">
        <div className="grid gap-6 sm:grid-cols-2">{children}</div>
      </PremiumCardContent>
    </PremiumCard>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const updateStudent = useAppStore((s) => s.updateStudent);
  const addStudent = useAppStore((s) => s.addStudent);
  const user = useAppStore((s) => s.user);

  const isNew = id === "new";

  const mapStudentRecord = (student) => {
    const locationDisplay = student.location_display || student.location || "";
    const locationMatch = /^(.+?)\s*\((.+)\)$/.exec(locationDisplay);

    return {
      id: String(student.id ?? student.emp_id ?? student.empId ?? student.portalid ?? student.portal_id ?? Date.now()),
      portalId: student.see_details_portalid || student.portalid || student.portal_id || student.portalId || student.emp_id || student.empId || "",
      source: student.source || "",
      lastName: student.last_name || student.lastName || student.learner_name?.split(" ").slice(1).join(" ") || "",
      firstName: student.first_name || student.firstName || student.learner_name?.split(" ")[0] || "",
      location: locationMatch ? locationMatch[1].trim() : locationDisplay,
      wfh: student.wfh || (locationMatch ? locationMatch[2].trim() : "No"),
      status: student.status || "Active",
      level1: student.level_1 || student.level1 || "Not Started",
      level2: student.level_2 || student.level2 || "Not Started",
      level3: student.level_3 || student.level3 || "Not Started",
      roleAssignment: student.role_assignment || student.roleAssignment || "",
      billing: student.billing || "",
      tl: student.tl_name || student.tl || "",
      language: student.language || "",
      empId: student.emp_id || student.empId || student.portalid || student.portal_id || "",
      windows: student.windows || "",
      nttBpoEmail: student.ntt_bpo_email || student.nttBpoEmail || "",
      pcbReq: student.pcb_req_no || student.pcb_req || student.pcbReq || "",
      homePhone: student.home_phone || student.homePhone || "",
      homeEmail: student.home_email_address || student.home_email || student.homeEmail || "",
      tsys: student.tsys || "",
      macGui: student.mac_gui || student.macGui || "",
      ice: student.ice || "",
      genesys: student.genesys || "",
      notes: student.notes || "",
      trainerId: String(student.trainer_id || student.trainerId || ""),
      createdAt: student.created_at || student.createdAt || student.doj || "",
      updatedAt: student.updated_at || student.updatedAt || student.doj || "",
      lastModifiedBy: student.last_modified_by || student.lastModifiedBy || "",
    };
  };

  const emptyStudent = {
    id: `s${Date.now()}`, source: "", lastName: "", firstName: "", location: "",
    wfh: "No", status: "Active", level1: "Not Started", level2: "Not Started", level3: "Not Started",
    roleAssignment: "", billing: "", tl: "", language: "", empId: "", windows: "",
    nttBpoEmail: "", pcbReq: "", homePhone: "", homeEmail: "", tsys: "", macGui: "",
    ice: "", genesys: "", notes: "", trainerId: "", createdAt: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString().split("T")[0], lastModifiedBy: "current",
  };

  const [form, setForm] = useState(emptyStudent);
  const [options, setOptions] = useState({
    sources: [],
    statuses: [],
    wfhOptions: [],
    levels: [],
    roles: [],
    billing: [],
    languages: [],
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const loadPageData = async () => {
      try {
        if (isMounted) {
          setIsLoadingData(true);
          setFetchError(false);
        }

        const optionsResponse = await api.options.get();

        if (!isMounted) {
          return;
        }

        setOptions({
          sources: Array.isArray(optionsResponse?.sources) ? optionsResponse.sources : [],
          statuses: Array.isArray(optionsResponse?.statuses) ? optionsResponse.statuses : [],
          wfhOptions: Array.isArray(optionsResponse?.wfhOptions) ? optionsResponse.wfhOptions : [],
          levels: Array.isArray(optionsResponse?.levels) ? optionsResponse.levels : [],
          roles: Array.isArray(optionsResponse?.roles) ? optionsResponse.roles : [],
          billing: Array.isArray(optionsResponse?.billing) ? optionsResponse.billing : [],
          languages: Array.isArray(optionsResponse?.languages) ? optionsResponse.languages : [],
        });

        if (isNew) {
          setForm(emptyStudent);
          setIsLoadingData(false);
          return;
        }

        const response = await api.studentsPage.detail(id);
        const studentRecord = response?.student || response?.learner || response?.data || response;

        if (isMounted && studentRecord) {
          setForm(mapStudentRecord(studentRecord));
          setIsLoadingData(false);
        }
      } catch (error) {
        if (isMounted) {
          setFetchError(true);
          setIsLoadingData(false);
          return;
        }
          setFetchError(true);
          setIsLoadingData(false);
        toast.error(error?.message || "Failed to load learner details.");
      }
    };

    loadPageData();

    return () => {
      isMounted = false;
    };
  }, [id, isNew]);

  const set = (field, value) => setForm({ ...form, [field]: value });

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (form.nttBpoEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.nttBpoEmail)) errs.nttBpoEmail = "Invalid email";
    if (form.homeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.homeEmail)) errs.homeEmail = "Invalid email";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const now = new Date().toISOString().split("T")[0];
    // Append new comment to existing notes
    let updatedNotes = form.notes || "";
    if (form.newComment?.trim()) {
      const commentEntry = `[${now} - ${user?.name || "User"}]: ${form.newComment.trim()}`;
      updatedNotes = updatedNotes ? `${updatedNotes}\n${commentEntry}` : commentEntry;
    }
    const saveData = { ...form, notes: updatedNotes, updatedAt: now };
    delete saveData.newComment;

    try {
      setIsSaving(true);

      if (isNew) {
        const response = await api.studentsPage.create(saveData);
        const createdStudent = response?.student || response?.learner || response?.data || response;
        addStudent(mapStudentRecord(createdStudent || saveData));
        toast.success("Student created successfully");
      } else {
        const response = await api.studentsPage.update(form.portalId || form.empId || id, saveData);
        const updatedStudent = response?.student || response?.learner || response?.data || saveData;
        updateStudent(form.id, mapStudentRecord({ ...form, ...updatedStudent, notes: updatedNotes }));
        toast.success("Student updated successfully");
      }

      navigate("/students");
    } catch (error) {
      toast.error(error?.message || "Failed to save learner.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderSelect = (field, opts) => (
    <Select value={form[field]} onValueChange={(v) => set(field, v)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const renderInput = (field, placeholder = "") => (
    <div>
      <Input
        value={form[field]}
        onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder}
        maxLength={255}
        aria-invalid={!!errors[field]}
        aria-describedby={errors[field] ? `${field}-error` : undefined}
      />
      {errors[field] && <p id={`${field}-error`} className="text-xs text-destructive mt-1">{errors[field]}</p>}
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/students")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isNew ? "New Student" : `${form.firstName} ${form.lastName}`}</h1>
            {!isNew && (
              <p className="text-xs text-muted-foreground">Last updated: {form.updatedAt} by {form.lastModifiedBy}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/students")}>
            <X className="h-4 w-4 mr-2" />Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />Save
          </Button>
        </div>
      </div>

      {!isNew && isLoadingData && (
        <p className="text-sm text-muted-foreground">Loading data...</p>
      )}
      {!isNew && !isLoadingData && fetchError && (
        <p className="text-sm text-destructive">Error in fetching data</p>
      )}

      {!isNew && isLoadingData ? null : (
      <div className="grid gap-6 md:grid-cols-2 items-start">
        <div className="space-y-6">
          <Section title="Personal Information" icon={User}>
            <Field label="First Name" required>{renderInput("firstName", "Enter first name")}</Field>
            <Field label="Last Name" required>{renderInput("lastName", "Enter last name")}</Field>
            <Field label="Source">{renderSelect("source", options.sources)}</Field>
            <Field label="Status">{renderSelect("status", options.statuses)}</Field>
          </Section>

          <Section title="Contact & Location" icon={Network}>
            <Field label="Home Email">{renderInput("homeEmail", "personal@email.com")}</Field>
            <Field label="Home Phone">{renderInput("homePhone", "(555) 555-0100")}</Field>
            <Field label="Location">{renderInput("location", "City")}</Field>
            <Field label="WFH">{renderSelect("wfh", options.wfhOptions)}</Field>
          </Section>

          <Section title="Training Levels" icon={GraduationCap}>
            <Field label="Level 1">{renderSelect("level1", options.levels)}</Field>
            <Field label="Level 2">{renderSelect("level2", options.levels)}</Field>
            <Field label="Level 3">{renderSelect("level3", options.levels)}</Field>
            <Field label="Language">{renderSelect("language", options.languages)}</Field>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Assignment Details" icon={Briefcase}>
            <Field label="Role Assignment">{renderSelect("roleAssignment", options.roles)}</Field>
            <Field label="Billing">{renderSelect("billing", options.billing)}</Field>
            <Field label="Team Lead">{renderInput("tl", "Team Lead name")}</Field>
            <Field label="Emp ID">{renderInput("empId", "Employee ID")}</Field>
          </Section>

          <Section title="System Access & Tools" icon={Settings}>
            <Field label="NTT BPO Email">{renderInput("nttBpoEmail", "email@ntt.com")}</Field>
            <Field label="Windows">{renderInput("windows")}</Field>
            <Field label="PCB REQ #">{renderInput("pcbReq")}</Field>
            <Field label="TSYS">{renderInput("tsys")}</Field>
            <Field label="MAC GUI">{renderInput("macGui")}</Field>
            <Field label="ICE">{renderInput("ice")}</Field>
            <Field label="Genesys">{renderInput("genesys")}</Field>
          </Section>

          <Section title="Notes & Comments" icon={BookOpen}>
            <div className="sm:col-span-2 space-y-4">
              {/* Previous notes - read-only individual entries */}
              {form.notes && (() => {
                const noteEntries = form.notes.split('\n').filter(n => n.trim());
                return noteEntries.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Previous Notes ({noteEntries.length})</Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {noteEntries.map((note, idx) => {
                        const bracketMatch = /^\[(.+?)\]:\s*(.*)$/.exec(note);
                        const meta = bracketMatch ? bracketMatch[1] : null;
                        const content = bracketMatch ? bracketMatch[2] : note;
                        return (
                          <div key={idx} className="bg-muted/30 border border-border/50 rounded-lg p-3 select-text">
                            {meta && (
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{meta}</p>
                            )}
                            <p className="text-sm text-foreground">{content}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}
              {/* New comment input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {form.notes ? "Add New Comment" : "Notes"}
                </Label>
                <Textarea
                  value={form.newComment || ""}
                  onChange={(e) => set("newComment", e.target.value)}
                  placeholder="Add a new comment or note..."
                  rows={3}
                  maxLength={2000}
                  className="resize-y"
                />
              </div>
            </div>
          </Section>
        </div>
      </div>
      )}
    </div>
  );
}
