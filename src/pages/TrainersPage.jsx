import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PremiumCard, PremiumCardContent } from "@/components/learning/PremiumCard";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, Activity, Target, Plus, Pencil, Trash2, LayoutGrid, List, CalendarOff, Shield } from "lucide-react";
import { api } from "@/data/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { leaveTypes } from "@/lib/phase3-mock-data";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  role: "",
  status: "Active",
  supervisor: "",
  portalId: "",
  email: "",
  location: "",
  language: "English",
  leader: "No",
};

const FALLBACK_TRAINER_STATUSES = ["Active", "On Leave", "Inactive"];
const FALLBACK_TRAINER_TYPES = ["Junior", "Senior", "Lead", "Onsite", "Remote"];
const FALLBACK_TRAINER_ROLES = ["Lead Trainer", "Senior Trainer", "Junior Trainer", "Specialist"];
const FALLBACK_LANGUAGES = ["English", "Spanish", "French", "Portuguese", "Mandarin"];
const LEADER_OPTIONS = ["Yes", "No"];

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

const mapTrainerRecord = (trainer) => {
  const firstName = trainer.first_name || trainer.firstName || "";
  const lastName = trainer.last_name || trainer.lastName || "";
  const role = trainer.role || "";
  const type = trainer.type || (role.includes("Lead") ? "Lead" : role.includes("Senior") ? "Senior" : role.includes("Junior") ? "Junior" : role || "Trainer");

  return {
    id: String(trainer.id),
    firstName,
    lastName,
    name: trainer.full_name || trainer.name || `${firstName} ${lastName}`.trim(),
    role,
    type,
    status: trainer.status || "Active",
    supervisor: trainer.supervisor || "",
    portalId: trainer.portalid || trainer.portalId || "",
    email: trainer.emailid || trainer.email || "",
    location: trainer.location || trainer.region || "",
    language: trainer.language || "English",
    leader: trainer.leader || "No",
    studentCount: Number(trainer.studentCount || trainer.student_count || 0),
    avgAttendance: Number(trainer.avgAttendance || trainer.avg_attendance || 0),
    avgProgress: Number(trainer.avgProgress || trainer.avg_progress || 0),
  };
};

const buildTrainerPayload = (formValues, { includeStatus = true } = {}) => ({
  portalid: formValues.portalId.trim(),
  emailid: formValues.email.trim(),
  first_name: formValues.firstName,
  last_name: formValues.lastName,
  role: formValues.role,
  status: includeStatus ? formValues.status : undefined,
  leader: formValues.leader,
  supervisor: formValues.supervisor,
  region: formValues.location.trim(),
  location: formValues.location.trim(),
});

export default function TrainersPage() {
  const [trainers, setTrainers] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [viewMode, setViewMode] = useState("card");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [availableSupervisors, setAvailableSupervisors] = useState([]);
  const [availableRoles, setAvailableRoles] = useState(FALLBACK_TRAINER_ROLES);
  const [availableStatuses, setAvailableStatuses] = useState(FALLBACK_TRAINER_STATUSES);
  const [availableTypes, setAvailableTypes] = useState(FALLBACK_TRAINER_TYPES);
  const [availableLanguages, setAvailableLanguages] = useState(FALLBACK_LANGUAGES);

  const loadData = async () => {
    setIsLoadingData(true);

    try {
      const [trainersResponse, optionsResponse, supervisorsResponse] = await Promise.all([
        api.trainers.list(),
        api.options.get(),
        api.supervisors.list().catch(() => null),
      ]);

      const nextTrainers = Array.isArray(trainersResponse?.trainers)
        ? trainersResponse.trainers.map(mapTrainerRecord)
        : [];

      const supervisorOptions = Array.isArray(optionsResponse?.supervisor_options)
        ? optionsResponse.supervisor_options.map((supervisor) => supervisor?.name)
        : [];

      const supervisorList = Array.isArray(supervisorsResponse?.supervisors)
        ? supervisorsResponse.supervisors.map((supervisor) => supervisor?.name)
        : [];

      const derivedRoles = nextTrainers.map((trainer) => trainer.role);
      const derivedStatuses = nextTrainers.map((trainer) => trainer.status);
      const derivedTypes = nextTrainers.map((trainer) => trainer.type);
      const derivedLanguages = nextTrainers.map((trainer) => trainer.language);

      setTrainers(nextTrainers);
      setAvailableLocations(
        normalizeOptionsList([
          ...(optionsResponse?.regions || []),
          ...nextTrainers.map((trainer) => trainer.location),
        ]),
      );
      setAvailableSupervisors(
        normalizeOptionsList([
          ...(optionsResponse?.supervisors || []),
          ...supervisorOptions,
          ...supervisorList,
          ...nextTrainers.map((trainer) => trainer.supervisor),
        ]),
      );
      setAvailableRoles(
        normalizeOptionsList([
          ...FALLBACK_TRAINER_ROLES,
          ...derivedRoles,
        ]),
      );
      setAvailableStatuses(
        normalizeOptionsList([
          ...FALLBACK_TRAINER_STATUSES,
          ...derivedStatuses,
        ]),
      );
      setAvailableTypes(
        normalizeOptionsList([
          ...FALLBACK_TRAINER_TYPES,
          ...derivedTypes,
        ]),
      );
      setAvailableLanguages(
        normalizeOptionsList([
          ...(optionsResponse?.languages || []),
          ...FALLBACK_LANGUAGES,
          ...derivedLanguages,
        ]),
      );
    } catch (error) {
      toast.error(error?.message || "Failed to load trainers.");
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => (
    trainers.filter((trainer) => {
      const query = search.toLowerCase();
      const matchSearch =
        trainer.name?.toLowerCase().includes(query) ||
        trainer.email?.toLowerCase().includes(query) ||
        trainer.location?.toLowerCase().includes(query);
      const matchType = typeFilter === "all" || trainer.type === typeFilter;
      const matchStatus = statusFilter === "all" || trainer.status === statusFilter;
      const matchLocation = locationFilter === "all" || trainer.location === locationFilter;
      return matchSearch && matchType && matchStatus && matchLocation;
    })
  ), [trainers, search, typeFilter, statusFilter, locationFilter]);

  const openAdd = () => {
    setEditingTrainer(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (trainer) => {
    setEditingTrainer(trainer);
    setForm({
      firstName: trainer.firstName || "",
      lastName: trainer.lastName || "",
      role: trainer.role || "",
      status: trainer.status || "Active",
      supervisor: trainer.supervisor || "",
      portalId: trainer.portalId || "",
      email: trainer.email || "",
      location: trainer.location || "",
      language: trainer.language || "English",
      leader: trainer.leader || "No",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const portalId = form.portalId.trim();
    const email = form.email.trim();
    const location = form.location.trim();

    if (!firstName || !lastName) {
      toast.error("First and last name are required.");
      return;
    }

    if (!portalId || !email || !form.role) {
      toast.error("Portal ID, email, and role are required.");
      return;
    }

    const payload = buildTrainerPayload({ ...form, firstName, lastName, portalId, email, location });
    setIsSaving(true);

    try {
      if (editingTrainer) {
        await api.trainers.update(editingTrainer.id, payload);
        toast.success("Trainer updated.");
      } else {
        await api.trainers.create(payload);
        toast.success("Trainer added.");
      }

      setDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to save trainer.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    toast.error("Trainer delete API is not available on the backend yet.");
  };

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Training Facilitators</h1>
          <p className="text-muted-foreground mt-1 text-sm">{trainers.length} trainers in the system</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={openAdd} className="rounded-full gap-2"><Plus className="h-4 w-4" /> Add Trainer</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative flex-1 sm:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search trainers..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9 h-11 bg-background rounded-full border-border/50" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-11 bg-background rounded-full"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {availableStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-11 bg-background rounded-full"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {availableTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[140px] h-11 bg-background rounded-full"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {availableLocations.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-full p-1 bg-muted/30">
          <Button variant={viewMode === "card" ? "default" : "ghost"} size="sm" className="h-8 rounded-full" onClick={() => setViewMode("card")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="h-8 rounded-full" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {isLoadingData ? (
        <div className="py-16 text-center text-muted-foreground">Loading trainers...</div>
      ) : viewMode === "card" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((trainer) => (
            <PremiumCard key={trainer.id} className="hover:shadow-lg transition-all duration-300 flex flex-col hover:-translate-y-1">
              <PremiumCardContent className="p-6 flex-1 flex flex-col">
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-lg font-bold text-primary shadow-inner border border-primary/10 shrink-0">
                    {trainer.name?.split(" ").map((name) => name[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="font-bold text-lg text-foreground truncate">{trainer.name}</p>
                    <p className="text-xs font-medium text-muted-foreground truncate mb-2">{trainer.email}</p>
                    <StatusBadge status={trainer.type} />
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => openEdit(trainer)}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleDelete}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <div className="mt-auto grid grid-cols-3 gap-3 pt-5 border-t border-border/50 text-center">
                  <div className="flex flex-col items-center p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <Users className="h-4 w-4 text-primary/60 mb-1.5" />
                    <p className="text-xl font-bold text-foreground">{trainer.studentCount}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Learners</p>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <Activity className="h-4 w-4 text-primary/60 mb-1.5" />
                    <p className="text-xl font-bold text-foreground">{trainer.avgAttendance}%</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Attend</p>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <Target className="h-4 w-4 text-primary/60 mb-1.5" />
                    <p className="text-xl font-bold text-foreground">{trainer.avgProgress}%</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Success</p>
                  </div>
                </div>
              </PremiumCardContent>
            </PremiumCard>
          ))}
        </div>
      ) : (
        <PremiumCard>
          <PremiumCardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-bold">Name</TableHead>
                    <TableHead className="font-bold">Portal ID</TableHead>
                    <TableHead className="font-bold">Email</TableHead>
                    <TableHead className="font-bold">Role</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Supervisor</TableHead>
                    <TableHead className="font-bold">Location</TableHead>
                    <TableHead className="font-bold">Leader</TableHead>
                    <TableHead className="text-center font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((trainer) => (
                    <TableRow key={trainer.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{trainer.name}</TableCell>
                      <TableCell>{trainer.portalId}</TableCell>
                      <TableCell className="text-muted-foreground">{trainer.email}</TableCell>
                      <TableCell><StatusBadge status={trainer.role} /></TableCell>
                      <TableCell><Badge variant="outline" className={cn(trainer.status === "Active" ? "text-emerald-600" : "text-muted-foreground")}>{trainer.status}</Badge></TableCell>
                      <TableCell>{trainer.supervisor}</TableCell>
                      <TableCell>{trainer.location}</TableCell>
                      <TableCell>{trainer.leader}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="sm" className="h-7" onClick={() => openEdit(trainer)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </PremiumCardContent>
        </PremiumCard>
      )}

      {!isLoadingData && filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl bg-muted/5">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-bold text-foreground mb-1">No Trainers Found</p>
          <p className="text-sm">Try adjusting your search or filters.</p>
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTrainer ? "Edit Trainer" : "Add New Trainer"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(event) => setField("firstName", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={(event) => setField("lastName", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Portal ID</Label>
              <Input value={form.portalId} onChange={(event) => setField("portalId", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={(event) => setField("email", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(value) => setField("role", value)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setField("status", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Supervisor</Label>
              <div className="relative">
                <Input
                  value={form.supervisor}
                  onChange={(event) => setField("supervisor", event.target.value)}
                  placeholder="Type to search supervisors..."
                />
                {form.supervisor && availableSupervisors.filter((s) => s.toLowerCase().includes(form.supervisor.toLowerCase()) && s !== form.supervisor).length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[160px] overflow-y-auto">
                    {availableSupervisors
                      .filter((s) => s.toLowerCase().includes(form.supervisor.toLowerCase()))
                      .slice(0, 8)
                      .map((supervisor) => (
                        <button
                          key={supervisor}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                          onClick={() => setField("supervisor", supervisor)}
                        >
                          {supervisor}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={form.location} onValueChange={(value) => setField("location", value)}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {availableLocations.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={form.language} onValueChange={(value) => setField("language", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableLanguages.map((language) => <SelectItem key={language} value={language}>{language}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Leader</Label>
              <Select value={form.leader} onValueChange={(value) => setField("leader", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEADER_OPTIONS.map((leader) => <SelectItem key={leader} value={leader}>{leader}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : `${editingTrainer ? "Update" : "Add"} Trainer`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
