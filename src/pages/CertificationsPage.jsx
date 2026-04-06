import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppStore } from "@/store/app-store";
import { certificationTypes } from "@/lib/phase3-mock-data";
import { Award, Search, Plus, AlertTriangle, CheckCircle, XCircle, Clock, Shield, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import { api } from "@/data/api";
import { normalizeCertification, normalizeTrainer, toApiId } from "@/lib/phase-backend";

const statusConfig = {
  Active: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle },
  Expired: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  "Renewal Due": { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: AlertTriangle },
};

const emptyCertification = { trainerId: "", name: "", type: "Technical", level: "Standard", issuedDate: "", expiryDate: "", issuedBy: "", documentName: "" };

const deriveStatus = (certification) => {
  if (certification.status) {
    return certification.status;
  }

  if (!certification.expiryDate) {
    return "Active";
  }

  const daysLeft = differenceInDays(parseISO(certification.expiryDate), new Date());
  if (daysLeft <= 0) {
    return "Expired";
  }

  if (daysLeft <= 90) {
    return "Renewal Due";
  }

  return "Active";
};

export default function CertificationsPage() {
  const user = useAppStore((state) => state.user);
  const [trainers, setTrainers] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCert, setNewCert] = useState(emptyCertification);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";

  const loadData = async () => {
    setLoading(true);

    try {
      const [trainerResponse, certificationResponse] = await Promise.all([
        api.trainers.list(),
        api.certificationsPage.list(),
      ]);

      setTrainers((trainerResponse?.trainers || []).map(normalizeTrainer));
      setCertifications(
        (certificationResponse?.certifications || []).map((certification) => {
          const normalized = normalizeCertification(certification);
          return { ...normalized, status: deriveStatus(normalized) };
        }),
      );
    } catch (error) {
      toast.error("Failed to load certifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCerts = useMemo(() => {
    return certifications.filter((certification) => {
      if (statusFilter !== "all" && certification.status !== statusFilter) {
        return false;
      }

      if (trainerFilter !== "all" && certification.trainerId !== trainerFilter) {
        return false;
      }

      if (search) {
        const query = search.toLowerCase();
        return certification.name.toLowerCase().includes(query) || certification.type.toLowerCase().includes(query);
      }

      return true;
    });
  }, [certifications, search, statusFilter, trainerFilter]);

  const stats = useMemo(() => ({
    total: certifications.length,
    active: certifications.filter((certification) => certification.status === "Active").length,
    expired: certifications.filter((certification) => certification.status === "Expired").length,
    renewalDue: certifications.filter((certification) => certification.status === "Renewal Due").length,
    expiringSoon: certifications.filter((certification) => {
      if (certification.status !== "Active") {
        return false;
      }

      const days = differenceInDays(parseISO(certification.expiryDate), new Date());
      return days <= 90 && days > 0;
    }).length,
  }), [certifications]);

  const getDaysUntilExpiry = (expiryDate) => differenceInDays(parseISO(expiryDate), new Date());

  const handleAdd = async () => {
    if (!newCert.trainerId || !newCert.name || !newCert.issuedDate || !newCert.expiryDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);

    try {
      await api.certificationsPage.create({
        trainer_id: toApiId(newCert.trainerId),
        name: newCert.name,
        type: newCert.type,
        level: newCert.level,
        issued_date: newCert.issuedDate,
        expiry_date: newCert.expiryDate,
        status: deriveStatus(newCert),
        issued_by: newCert.issuedBy,
      });

      await loadData();
      setShowAddDialog(false);
      setNewCert(emptyCertification);
      toast.success("Certification added");
    } catch (error) {
      toast.error("Failed to add certification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Certification Management</h1>
          <p className="text-sm text-muted-foreground">Track trainer certifications, expiry, and renewal lifecycle</p>
        </div>
        {isSupervisor ? (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Certification
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 text-center"><Shield className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" /><p className="text-xl font-bold text-green-600">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><XCircle className="h-5 w-5 mx-auto mb-1 text-red-600" /><p className="text-xl font-bold text-red-600">{stats.expired}</p><p className="text-xs text-muted-foreground">Expired</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-600" /><p className="text-xl font-bold text-amber-600">{stats.renewalDue}</p><p className="text-xs text-muted-foreground">Renewal Due</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Clock className="h-5 w-5 mx-auto mb-1 text-orange-600" /><p className="text-xl font-bold text-orange-600">{stats.expiringSoon}</p><p className="text-xs text-muted-foreground">Expiring within 90d</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search certifications..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
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
            {trainers.map((trainer) => <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-sm text-center text-muted-foreground">Loading certifications...</div>
          ) : (
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
                {filteredCerts.map((certification) => {
                  const daysLeft = getDaysUntilExpiry(certification.expiryDate);
                  const StatusIcon = statusConfig[certification.status]?.icon || CheckCircle;
                  return (
                    <TableRow key={certification.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-primary" />
                          <div>
                            <span className="font-medium text-sm">{certification.name}</span>
                            {certification.documentName && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Upload className="h-2.5 w-2.5" />{certification.documentName}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{trainers.find((trainer) => trainer.id === certification.trainerId)?.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{certification.type}</Badge></TableCell>
                      <TableCell className="text-sm">{certification.level}</TableCell>
                      <TableCell className="text-sm">{certification.issuedDate}</TableCell>
                      <TableCell className="text-sm">{certification.expiryDate}</TableCell>
                      <TableCell>
                        <span className={cn("text-sm font-medium", daysLeft <= 0 ? "text-destructive" : daysLeft <= 30 ? "text-orange-600" : daysLeft <= 90 ? "text-amber-600" : "text-green-600")}>
                          {daysLeft <= 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`}
                        </span>
                      </TableCell>
                      <TableCell><Badge className={cn("text-[10px]", statusConfig[certification.status]?.color)}><StatusIcon className="h-3 w-3 mr-1" />{certification.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{certification.issuedBy}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Certification</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Trainer</Label>
              <Select value={newCert.trainerId} onValueChange={(value) => setNewCert({ ...newCert, trainerId: value })}>
                <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                <SelectContent>{trainers.map((trainer) => <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Certification Name</Label><Input value={newCert.name} onChange={(event) => setNewCert({ ...newCert, name: event.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={newCert.type} onValueChange={(value) => setNewCert({ ...newCert, type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{certificationTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Level</Label>
                <Select value={newCert.level} onValueChange={(value) => setNewCert({ ...newCert, level: value })}>
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
              <div><Label>Issued Date</Label><Input type="date" value={newCert.issuedDate} onChange={(event) => setNewCert({ ...newCert, issuedDate: event.target.value })} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={newCert.expiryDate} onChange={(event) => setNewCert({ ...newCert, expiryDate: event.target.value })} /></div>
            </div>
            <div><Label>Issued By</Label><Input value={newCert.issuedBy} onChange={(event) => setNewCert({ ...newCert, issuedBy: event.target.value })} /></div>
            <div>
              <Label>Upload Certificate Document</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setNewCert({ ...newCert, documentName: file.name });
                  }
                }}
                className="cursor-pointer"
              />
              {newCert.documentName && <p className="text-xs text-muted-foreground mt-1">Selected: {newCert.documentName}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
