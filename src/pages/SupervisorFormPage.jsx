import { useEffect, useState } from "react";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Plus, Pencil, Search, Users } from "lucide-react";
import { api } from "@/data/api";
import { toast } from "sonner";

const EMPTY_FORM = { name: "", email: "", portalId: "" };

export default function SupervisorFormPage() {
  const [supervisors, setSupervisors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await api.supervisors.list().catch(() => null);
      const list = Array.isArray(response?.supervisors)
        ? response.supervisors.map((s) => ({
            id: String(s.id || s.supervisor_id || ""),
            name: s.name || s.full_name || "",
            email: s.email || s.emailid || "",
            portalId: s.portalid || s.portalId || "",
          }))
        : [];
      setSupervisors(list);
    } catch {
      toast.error("Failed to load supervisors.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = supervisors.filter((s) => {
    const q = search.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.portalId?.toLowerCase().includes(q);
  });

  const openAdd = () => { setEditingId(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true); };
  const openEdit = (sup) => { setEditingId(sup.id); setForm({ name: sup.name, email: sup.email, portalId: sup.portalId }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required."); return; }
    setIsSaving(true);
    try {
      if (editingId) {
        await api.supervisors.update?.(editingId, {
          name: form.name.trim(),
          email: form.email.trim(),
          portalid: form.portalId.trim(),
        });
        toast.success("Supervisor updated.");
      } else {
        await api.supervisors.create?.({
          name: form.name.trim(),
          email: form.email.trim(),
          portalid: form.portalId.trim(),
        });
        toast.success("Supervisor added.");
      }
      setDialogOpen(false);
      await loadData();
    } catch {
      toast.error("Failed to save supervisor.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      <PageHeader
        icon={Shield}
        eyebrow="People"
        title="Supervisor Management"
        description={`${supervisors.length} supervisors in the system`}
        actions={
          <Button onClick={openAdd} className="rounded-full gap-2">
            <Plus className="h-4 w-4" /> Add Supervisor
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search supervisors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 rounded-full" />
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Loading supervisors...</div>
      ) : (
        <PremiumCard>
          <PremiumCardHeader className="border-b border-border/50">
            <PremiumCardTitle className="text-lg">All Supervisors</PremiumCardTitle>
          </PremiumCardHeader>
          <PremiumCardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-bold">Name</TableHead>
                    <TableHead className="font-bold">Portal ID</TableHead>
                    <TableHead className="font-bold">Email</TableHead>
                    <TableHead className="text-center font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sup) => (
                    <TableRow key={sup.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{sup.name}</TableCell>
                      <TableCell className="font-mono text-xs">{sup.portalId || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{sup.email || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(sup)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>No supervisors found.</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </PremiumCardContent>
        </PremiumCard>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Supervisor" : "Add Supervisor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="supervisor@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Portal ID</Label>
              <Input value={form.portalId} onChange={(e) => setForm({ ...form, portalId: e.target.value })} placeholder="P-xxxx" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : editingId ? "Update" : "Add"} Supervisor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
