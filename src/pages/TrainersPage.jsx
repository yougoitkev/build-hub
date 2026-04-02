import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { PremiumCard, PremiumCardContent } from "@/components/learning/PremiumCard";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, Activity, Target, Plus, Pencil, Trash2, LayoutGrid, List, Upload } from "lucide-react";
import { api } from "@/data/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { mockOptions } from "@/lib/mock-data";

const EMPTY_FORM = {
  firstName: "", lastName: "", role: "", status: "Active", supervisor: "", portalId: "", email: "", location: "", language: "English", leader: "No",
};

export default function TrainersPage() {
  const trainers = useAppStore((s) => s.trainers);
  const addTrainer = useAppStore((s) => s.addTrainer);
  const updateTrainer = useAppStore((s) => s.updateTrainer);
  const deleteTrainer = useAppStore((s) => s.deleteTrainer);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [viewMode, setViewMode] = useState("card");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const locations = [...new Set(trainers.map((t) => t.location).filter(Boolean))];
  const supervisors = [...new Set(trainers.map((t) => t.supervisor).filter(Boolean))];

  const filtered = trainers.filter((t) => {
    const matchSearch = t.name?.toLowerCase().includes(search.toLowerCase()) || t.email?.toLowerCase().includes(search.toLowerCase()) || t.location?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || t.type === typeFilter;
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchLocation = locationFilter === "all" || t.location === locationFilter;
    return matchSearch && matchType && matchStatus && matchLocation;
  });

  const openAdd = () => {
    setEditingTrainer(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (trainer) => {
    setEditingTrainer(trainer);
    setForm({
      firstName: trainer.firstName || "", lastName: trainer.lastName || "", role: trainer.role || "",
      status: trainer.status || "Active", supervisor: trainer.supervisor || "", portalId: trainer.portalId || "",
      email: trainer.email || "", location: trainer.location || "", language: trainer.language || "English",
      leader: trainer.leader || "No",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.firstName || !form.lastName) { toast.error("First and last name are required."); return; }
    const name = `${form.firstName} ${form.lastName}`.trim();
    if (editingTrainer) {
      updateTrainer(editingTrainer.id, { ...form, name });
      toast.success("Trainer updated!");
    } else {
      addTrainer({ id: `t-${Date.now()}`, ...form, name, type: form.role?.includes("Lead") ? "Lead" : form.role?.includes("Senior") ? "Senior" : "Junior", studentCount: 0, avgAttendance: 0, avgProgress: 0 });
      toast.success("Trainer added!");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id) => {
    deleteTrainer(id);
    toast.success("Trainer removed.");
  };

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Training Facilitators</h1>
          <p className="text-muted-foreground mt-1 text-sm">{trainers.length} trainers in the system</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={openAdd} className="rounded-full gap-2"><Plus className="h-4 w-4" /> Add Trainer</Button>
          <Button variant="outline" disabled className="rounded-full gap-2 opacity-50"><Upload className="h-4 w-4" /> Bulk Import <Badge variant="secondary" className="ml-1 text-[9px]">Coming Soon</Badge></Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative flex-1 sm:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search trainers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 bg-background rounded-full border-border/50" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-11 bg-background rounded-full"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {mockOptions.trainerStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-11 bg-background rounded-full"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {mockOptions.trainerTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[140px] h-11 bg-background rounded-full"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-full p-1 bg-muted/30">
          <Button variant={viewMode === "card" ? "default" : "ghost"} size="sm" className="h-8 rounded-full" onClick={() => setViewMode("card")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="h-8 rounded-full" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Card View */}
      {viewMode === "card" && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((trainer) => (
            <PremiumCard key={trainer.id} className="hover:shadow-lg transition-all duration-300 flex flex-col hover:-translate-y-1">
              <PremiumCardContent className="p-6 flex-1 flex flex-col">
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-lg font-bold text-primary shadow-inner border border-primary/10 shrink-0">
                    {trainer.name?.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="font-bold text-lg text-foreground truncate">{trainer.name}</p>
                    <p className="text-xs font-medium text-muted-foreground truncate mb-2">{trainer.email}</p>
                    <StatusBadge status={trainer.type} />
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={() => openEdit(trainer)}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(trainer.id)}><Trash2 className="h-3 w-3" /></Button>
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
      )}

      {/* Table View */}
      {viewMode === "table" && (
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
                  {filtered.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.portalId}</TableCell>
                      <TableCell className="text-muted-foreground">{t.email}</TableCell>
                      <TableCell><StatusBadge status={t.role} /></TableCell>
                      <TableCell><Badge variant="outline" className={cn(t.status === "Active" ? "text-emerald-600" : "text-muted-foreground")}>{t.status}</Badge></TableCell>
                      <TableCell>{t.supervisor}</TableCell>
                      <TableCell>{t.location}</TableCell>
                      <TableCell>{t.leader}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="sm" className="h-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      {filtered.length === 0 && (
        <div className="py-16 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl bg-muted/5">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-bold text-foreground mb-1">No Trainers Found</p>
          <p className="text-sm">Try adjusting your search or filters.</p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTrainer ? "Edit Trainer" : "Add New Trainer"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Portal ID</Label>
              <Input value={form.portalId} onChange={(e) => setField("portalId", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setField("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setField("role", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {mockOptions.trainerRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mockOptions.trainerStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Supervisor</Label>
              <Input value={form.supervisor} onChange={(e) => setField("supervisor", e.target.value)} placeholder="Supervisor name" />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setField("location", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={form.language} onValueChange={(v) => setField("language", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mockOptions.languages.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Leader</Label>
              <Select value={form.leader} onValueChange={(v) => setField("leader", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mockOptions.leaderOptions.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingTrainer ? "Update" : "Add"} Trainer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
