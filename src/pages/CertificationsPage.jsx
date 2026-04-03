import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppStore } from "@/store/app-store";
import { certificationTypes } from "@/lib/phase3-mock-data";
import { Award, Search, Plus, AlertTriangle, CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";

const statusConfig = {
  Active: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle },
  Expired: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  "Renewal Due": { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: AlertTriangle },
};

export default function CertificationsPage() {
  const trainers = useAppStore((s) => s.trainers);
  const certifications = useAppStore((s) => s.certifications);
  const setCertifications = useAppStore((s) => s.setCertifications);
  const user = useAppStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCert, setNewCert] = useState({ trainerId: "", name: "", type: "Technical", level: "Standard", issuedDate: "", expiryDate: "", issuedBy: "" });

  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";

  const filteredCerts = useMemo(() => {
    return certifications.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (trainerFilter !== "all" && c.trainerId !== trainerFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q);
      }
      return true;
    });
  }, [certifications, search, statusFilter, trainerFilter]);

  const stats = useMemo(() => ({
    total: certifications.length,
    active: certifications.filter((c) => c.status === "Active").length,
    expired: certifications.filter((c) => c.status === "Expired").length,
    renewalDue: certifications.filter((c) => c.status === "Renewal Due").length,
    expiringSoon: certifications.filter((c) => {
      if (c.status !== "Active") return false;
      const days = differenceInDays(parseISO(c.expiryDate), new Date());
      return days <= 90 && days > 0;
    }).length,
  }), [certifications]);

  const getDaysUntilExpiry = (expiryDate) => {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    return days;
  };

  const handleAdd = () => {
    if (!newCert.trainerId || !newCert.name || !newCert.issuedDate || !newCert.expiryDate) {
      toast.error("Please fill all required fields");
      return;
    }
    const cert = {
      id: `cert-${Date.now()}`,
      ...newCert,
      status: "Active",
    };
    setCertifications([...certifications, cert]);
    setShowAddDialog(false);
    setNewCert({ trainerId: "", name: "", type: "Technical", level: "Standard", issuedDate: "", expiryDate: "", issuedBy: "" });
    toast.success("Certification added");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Certification Management</h1>
          <p className="text-sm text-muted-foreground">Track trainer certifications, expiry, and renewal lifecycle</p>
        </div>
        {isSupervisor && (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Certification
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 text-center"><Shield className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" /><p className="text-xl font-bold text-green-600">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><XCircle className="h-5 w-5 mx-auto mb-1 text-red-600" /><p className="text-xl font-bold text-red-600">{stats.expired}</p><p className="text-xs text-muted-foreground">Expired</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-600" /><p className="text-xl font-bold text-amber-600">{stats.renewalDue}</p><p className="text-xs text-muted-foreground">Renewal Due</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Clock className="h-5 w-5 mx-auto mb-1 text-orange-600" /><p className="text-xl font-bold text-orange-600">{stats.expiringSoon}</p><p className="text-xs text-muted-foreground">Expiring ≤90d</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search certifications..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
            <SelectItem value="Renewal Due">Renewal Due</SelectItem>
          </SelectContent>
        </Select>
        <Select value={trainerFilter} onValueChange={setTrainerFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Trainers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trainers</SelectItem>
            {trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certification</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issuer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCerts.map((cert) => {
                const daysLeft = getDaysUntilExpiry(cert.expiryDate);
                const StatusIcon = statusConfig[cert.status]?.icon || CheckCircle;
                return (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{cert.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{trainers.find((t) => t.id === cert.trainerId)?.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{cert.type}</Badge></TableCell>
                    <TableCell className="text-sm">{cert.level}</TableCell>
                    <TableCell className="text-sm">{cert.issuedDate}</TableCell>
                    <TableCell className="text-sm">{cert.expiryDate}</TableCell>
                    <TableCell>
                      <span className={cn("text-sm font-medium",
                        daysLeft <= 0 ? "text-destructive" :
                        daysLeft <= 30 ? "text-orange-600" :
                        daysLeft <= 90 ? "text-amber-600" :
                        "text-green-600"
                      )}>
                        {daysLeft <= 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`}
                      </span>
                    </TableCell>
                    <TableCell><Badge className={cn("text-[10px]", statusConfig[cert.status]?.color)}><StatusIcon className="h-3 w-3 mr-1" />{cert.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{cert.issuedBy}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Certification</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Trainer</Label>
              <Select value={newCert.trainerId} onValueChange={(v) => setNewCert({ ...newCert, trainerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                <SelectContent>{trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Certification Name</Label><Input value={newCert.name} onChange={(e) => setNewCert({ ...newCert, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={newCert.type} onValueChange={(v) => setNewCert({ ...newCert, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{certificationTypes.map((ct) => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Level</Label>
                <Select value={newCert.level} onValueChange={(v) => setNewCert({ ...newCert, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                    <SelectItem value="Expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Issued Date</Label><Input type="date" value={newCert.issuedDate} onChange={(e) => setNewCert({ ...newCert, issuedDate: e.target.value })} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={newCert.expiryDate} onChange={(e) => setNewCert({ ...newCert, expiryDate: e.target.value })} /></div>
            </div>
            <div><Label>Issued By</Label><Input value={newCert.issuedBy} onChange={(e) => setNewCert({ ...newCert, issuedBy: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
