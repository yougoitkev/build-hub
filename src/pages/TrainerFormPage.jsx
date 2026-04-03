import React, { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCog, Plus, Pencil, Search, Users, Activity, CalendarDays, ArrowUpDown } from "lucide-react";
import { TRAINER_COLORS } from "@/lib/mock-data";
import { toast } from "sonner";
import { api } from "@/data/api";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  portalId: "",
  email: "",
  role: "",
  region: "",
  leader: "No",
  supervisor: "",
};

const normalizeOptionValue = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    const candidate = value.value ?? value.label ?? value.name ?? "";
    return typeof candidate === "string" ? candidate.trim() : String(candidate || "").trim();
  }

  return String(value).trim();
};

const normalizeOptionsList = (values = []) =>
  [...new Set((Array.isArray(values) ? values : [values]).map(normalizeOptionValue).filter(Boolean))];

const buildTrainerRequestPayload = (formValues, { includeStatus = false } = {}) => ({
  portalid: formValues.portalId,
  emailid: formValues.email,
  first_name: formValues.firstName,
  last_name: formValues.lastName,
  role: formValues.role,
  leader: formValues.leader,
  region: formValues.region,
  location: formValues.region,
  supervisor: formValues.supervisor,
  ...(includeStatus ? { status: "Active" } : {}),
});

export default function TrainerFormPage() {
  const addTrainer = useAppStore((s) => s.addTrainer);
  const updateTrainer = useAppStore((s) => s.updateTrainer);
  const logAdminEvent = useAppStore((s) => s.logAdminEvent);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [remoteTrainers, setRemoteTrainers] = useState([]);
  const [programCount, setProgramCount] = useState(0);
  const [options, setOptions] = useState({ regions: [], supervisors: [] });
  const [sortBy, setSortBy] = useState("recent"); // "recent" | "name-asc" | "name-desc"
  const [formErrors, setFormErrors] = useState({});

  const mapTrainerRecord = (trainer, index) => ({
    id: String(trainer.id),
    firstName: trainer.first_name || trainer.firstName || "",
    lastName: trainer.last_name || trainer.lastName || "",
    portalId: trainer.portalid || trainer.portalId || "",
    email: trainer.emailid || trainer.email || "",
    role: trainer.role || "",
    region: trainer.region || trainer.location || "",
    leader: trainer.leader || "No",
    supervisor: trainer.supervisor || "",
    name:
      trainer.full_name ||
      trainer.name ||
      `${trainer.first_name || trainer.firstName || ""} ${trainer.last_name || trainer.lastName || ""}`.trim(),
    type: trainer.type || (trainer.role?.includes("Lead") ? "Lead" : trainer.role?.includes("Senior") ? "Senior" : "Junior"),
    location: trainer.location || trainer.region || "TBD",
    language: trainer.language || "English",
    studentCount: trainer.studentCount || 0,
    avgAttendance: trainer.avgAttendance || 0,
    avgProgress: trainer.avgProgress || 0,
    _order: index, // track insertion order
  });

  useEffect(() => {
    let isMounted = true;
    const loadTrainers = async () => {
      try {
        if (isMounted) { setIsLoadingData(true); setFetchError(false); }
        const [trainersResponse, programsResponse, optionsResponse] = await Promise.all([
          api.trainers.list(), api.trainingPrograms.list(), api.options.get(),
        ]);
        const trainerList = Array.isArray(trainersResponse?.trainers) ? trainersResponse.trainers.map((t, i) => mapTrainerRecord(t, i)) : [];
        if (isMounted) {
          const derivedRegions = trainerList.map((trainer) => trainer.region || trainer.location || "");
          const derivedSupervisors = trainerList.map((trainer) => trainer.supervisor || "");
          setRemoteTrainers(trainerList);
          setProgramCount(Array.isArray(programsResponse?.programs) ? programsResponse.programs.length : 0);
          setOptions({
            regions: normalizeOptionsList([...(optionsResponse?.regions || []), ...derivedRegions]),
            supervisors: normalizeOptionsList([...(optionsResponse?.supervisors || []), ...derivedSupervisors]),
          });
          setIsLoadingData(false);
        }
      } catch (error) {
        if (isMounted) { setRemoteTrainers([]); setProgramCount(0); setFetchError(true); setIsLoadingData(false); }
        toast.error(error?.message || "Failed to load trainers.");
      }
    };
    loadTrainers();
    return () => { isMounted = false; };
  }, []);

  const displayedTrainers = remoteTrainers;

  const filtered = displayedTrainers
    .filter((t) => `${t.firstName} ${t.lastName}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      // recent first: higher _order = more recently added
      return (b._order ?? 0) - (a._order ?? 0);
    });

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (trainer) => {
    setForm({
      firstName: trainer.firstName || "",
      lastName: trainer.lastName || "",
      portalId: trainer.portalId || "",
      email: trainer.email || "",
      role: trainer.role || "",
      region: trainer.region || trainer.location || "",
      leader: trainer.leader || "No",
      supervisor: trainer.supervisor || "",
    });
    setEditingId(trainer.id);
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    const trimmedFirst = form.firstName.trim();
    const trimmedLast = form.lastName.trim();

    if (!trimmedFirst) errors.firstName = "First name is required";
    else if (trimmedFirst !== form.firstName) errors.firstName = "No leading/trailing spaces allowed";

    if (!trimmedLast) errors.lastName = "Last name is required";
    else if (trimmedLast !== form.lastName) errors.lastName = "No leading/trailing spaces allowed";

    if (!form.portalId.trim()) errors.portalId = "Portal ID is required";
    if (!form.email.trim()) errors.email = "Email is required";
    if (!form.role) errors.role = "Role is required";
    if (!form.leader) errors.leader = "Leader is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    // Auto-trim names
    setForm(f => ({ ...f, firstName: f.firstName.trim(), lastName: f.lastName.trim() }));

    if (!validateForm()) {
      toast.error("Please fix the highlighted errors.");
      return;
    }

    const trimmedForm = { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim() };
    const name = `${trimmedForm.firstName} ${trimmedForm.lastName}`;

    if (editingId) {
      try {
        setIsSaving(true);
        const response = await api.trainers.update(editingId, buildTrainerRequestPayload(trimmedForm));
        const updatedTrainerRecord = response?.trainer || response?.data || response;
        const updatedTrainer = mapTrainerRecord({ ...updatedTrainerRecord, ...trimmedForm }, 0);
        updateTrainer(editingId, updatedTrainer);
        setRemoteTrainers((current) =>
          current ? current.map((trainer) => (trainer.id === editingId ? { ...trainer, ...updatedTrainer } : trainer)) : current
        );
        logAdminEvent({ action: "Trainer Updated", entityId: editingId, payloadSummary: `Updated trainer: ${name}` });
        toast.success(`Trainer "${name}" updated.`);
        setDialogOpen(false); setForm(EMPTY_FORM); setEditingId(null);
      } catch (error) {
        toast.error(error?.message || "Failed to update trainer.");
      } finally { setIsSaving(false); }
      return;
    }

    const payload = buildTrainerRequestPayload(trimmedForm, { includeStatus: true });

    try {
      setIsSaving(true);
      const response = await api.trainers.create(payload);
      const createdTrainer = response?.trainer || response?.data || response;
      const newTrainer = {
        id: createdTrainer?.id || createdTrainer?.trainer_id || `t-${Date.now()}`,
        ...trimmedForm,
        name,
        email: createdTrainer?.emailid || createdTrainer?.email || trimmedForm.email,
        portalId: createdTrainer?.portalid || createdTrainer?.portalId || trimmedForm.portalId,
        type: trimmedForm.role.includes("Lead") ? "Lead" : trimmedForm.role.includes("Senior") ? "Senior" : "Junior",
        location: createdTrainer?.location || createdTrainer?.region || trimmedForm.region || "TBD",
        region: createdTrainer?.region || createdTrainer?.location || trimmedForm.region || "",
        language: createdTrainer?.language || "English",
        studentCount: createdTrainer?.studentCount || 0,
        avgAttendance: createdTrainer?.avgAttendance || 0,
        avgProgress: createdTrainer?.avgProgress || 0,
        _order: displayedTrainers.length, // newest gets highest order
      };

      addTrainer(newTrainer);
      setRemoteTrainers((current) => (current ? [...current, newTrainer] : current));
      logAdminEvent({ action: "Trainer Created", entityId: newTrainer.id, payloadSummary: `Created trainer: ${name}` });
      toast.success(`Trainer "${name}" created.`);
      setDialogOpen(false); setForm(EMPTY_FORM); setEditingId(null);
    } catch (error) {
      toast.error(error?.message || "Failed to create trainer.");
    } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-primary/5 p-5 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" /> Trainer Form
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Create and manage trainer records</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trainers..." className="pl-9 w-full sm:w-[200px] h-9" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] h-9 bg-background">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Added</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openNew} className="rounded-full px-5 shrink-0 h-9">
            <Plus className="h-4 w-4 mr-1.5" /> Add Trainer
          </Button>
        </div>
      </div>

      {isLoadingData && <p className="text-sm text-muted-foreground">Loading data...</p>}
      {!isLoadingData && fetchError && <p className="text-sm text-destructive">Error in fetching data</p>}

      {!isLoadingData && !fetchError && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Total Trainers", value: displayedTrainers.length, icon: Users, color: "text-primary bg-primary/10" },
              { label: "Active", value: displayedTrainers.filter((t) => !t.status || t.status === "Active").length, icon: Activity, color: "text-emerald-600 bg-emerald-100" },
              { label: "Leaders", value: displayedTrainers.filter((t) => t.leader === "Yes").length, icon: UserCog, color: "text-purple-600 bg-purple-100" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-black">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <PremiumCard>
            <PremiumCardHeader className="border-b border-border/50">
              <PremiumCardTitle className="text-lg">All Trainers</PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Portal ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Leader</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((trainer) => {
                    const trainerColor = TRAINER_COLORS[trainer.id];
                    return (
                      <TableRow key={trainer.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className={`h-3 w-3 rounded-full ${trainerColor?.bg || "bg-muted"}`} />
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          <div>
                            <p className="font-bold">{trainer.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{trainer.portalId || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{trainer.email || "-"}</TableCell>
                        <TableCell className="text-sm">{trainer.region || trainer.location || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{trainer.role || trainer.type}</Badge>
                        </TableCell>
                        <TableCell>{trainer.leader || "No"}</TableCell>
                        <TableCell className="text-sm">{trainer.supervisor || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(trainer)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No trainers found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </PremiumCardContent>
          </PremiumCard>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Trainer" : "Add New Trainer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => {
                    setForm({ ...form, firstName: e.target.value });
                    if (formErrors.firstName) setFormErrors(prev => ({ ...prev, firstName: undefined }));
                  }}
                  onBlur={() => setForm(f => ({ ...f, firstName: f.firstName.trim() }))}
                  placeholder="John"
                  className={formErrors.firstName ? "border-destructive" : ""}
                />
                {formErrors.firstName && <p className="text-xs text-destructive">{formErrors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => {
                    setForm({ ...form, lastName: e.target.value });
                    if (formErrors.lastName) setFormErrors(prev => ({ ...prev, lastName: undefined }));
                  }}
                  onBlur={() => setForm(f => ({ ...f, lastName: f.lastName.trim() }))}
                  placeholder="Smith"
                  className={formErrors.lastName ? "border-destructive" : ""}
                />
                {formErrors.lastName && <p className="text-xs text-destructive">{formErrors.lastName}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Portal ID *</Label>
                <Input value={form.portalId} onChange={(e) => setForm({ ...form, portalId: e.target.value })} placeholder="P-1234" className={formErrors.portalId ? "border-destructive" : ""} />
                {formErrors.portalId && <p className="text-xs text-destructive">{formErrors.portalId}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="trainer@ntt.com" className={formErrors.email ? "border-destructive" : ""} />
                {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => { setForm({ ...form, role: v }); setFormErrors(prev => ({ ...prev, role: undefined })); }}>
                <SelectTrigger className={formErrors.role ? "border-destructive" : ""}><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {["Lead Trainer", "Senior Trainer", "Junior Trainer", "Specialist"].map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.role && <p className="text-xs text-destructive">{formErrors.role}</p>}
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                <SelectContent>
                  {options.regions.map((region) => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Leader *</Label>
                <Select value={form.leader} onValueChange={(v) => setForm({ ...form, leader: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Supervisor</Label>
                <Select value={form.supervisor} onValueChange={(v) => setForm({ ...form, supervisor: v })}>
                  <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
                  <SelectContent>
                    {options.supervisors.map((supervisor) => (
                      <SelectItem key={supervisor} value={supervisor}>{supervisor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : `${editingId ? "Update" : "Create"} Trainer`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
