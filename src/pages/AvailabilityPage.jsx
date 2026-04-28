import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppStore } from "@/store/app-store";
import { leaveTypes } from "@/lib/phase3-mock-data";
import { Plus, Trash2, CheckCircle, XCircle, CalendarOff } from "lucide-react";
import { format, parseISO, eachDayOfInterval, isWeekend, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/data/api";
import { normalizeAvailabilityRecord, normalizeTrainer, toApiId } from "@/lib/phase-backend";

const statusColors = {
  Approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function AvailabilityPage() {
  const user = useAppStore((state) => state.user);
  const [trainers, setTrainers] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [monthDate, setMonthDate] = useState(new Date("2026-04-01"));
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLeave, setNewLeave] = useState({ trainerId: "", type: "Annual Leave", startDate: "", endDate: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const loadData = async () => {
    setLoading(true);

    try {
      const [trainerResponse, availabilityResponse] = await Promise.all([
        api.trainers.list(),
        api.availabilityPage.list({ from: format(monthStart, "yyyy-MM-dd"), to: format(monthEnd, "yyyy-MM-dd") }),
      ]);

      setTrainers((trainerResponse?.trainers || []).map(normalizeTrainer));
      setAvailability((availabilityResponse?.availability || []).map(normalizeAvailabilityRecord));
    } catch (error) {
      toast.error("Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthDate]);

  const filteredAvailability = useMemo(() => {
    return availability.filter((record) => {
      if (trainerFilter !== "all" && record.trainerId !== trainerFilter) {
        return false;
      }

      return true;
    });
  }, [availability, trainerFilter]);

  const getLeaveForDay = (trainerId, day) => {
    return filteredAvailability.find((record) => {
      const start = parseISO(record.startDate);
      const end = parseISO(record.endDate);
      return record.trainerId === trainerId && day >= start && day <= end;
    });
  };

  const handleAddLeave = async () => {
    if (!newLeave.trainerId || !newLeave.startDate || !newLeave.endDate) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);

    try {
      await api.availabilityPage.create({
        trainer_id: toApiId(newLeave.trainerId),
        type: newLeave.type,
        start_date: newLeave.startDate,
        end_date: newLeave.endDate,
        notes: newLeave.notes,
        status: isSupervisor ? "Approved" : "Pending",
        created_by_portalid: user?.portalId || user?.id || "system",
      });

      setShowAddDialog(false);
      setNewLeave({ trainerId: "", type: "Annual Leave", startDate: "", endDate: "", notes: "" });
      await loadData();
      toast.success("Leave record added");
    } catch (error) {
      toast.error("Failed to add leave record");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (backendId) => {
    setSaving(true);

    try {
      await api.availabilityPage.remove(backendId);
      await loadData();
      toast.success("Leave record removed");
    } catch (error) {
      toast.error("Failed to delete leave record");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (backendId, record, status) => {
    setSaving(true);

    try {
      await api.availabilityPage.update(backendId, {
        trainer_id: toApiId(record.trainerId),
        type: record.type,
        start_date: record.startDate,
        end_date: record.endDate,
        notes: record.notes,
        status,
        created_by_portalid: user?.portalId || user?.id || "system",
      });

      await loadData();
      toast.success(`Leave ${status.toLowerCase()}`);
    } catch (error) {
      toast.error("Failed to update leave status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        icon={CalendarOff}
        eyebrow="Scheduling"
        title="Availability & Leave Management"
        description="Track trainer availability and prevent scheduling conflicts."
        actions={
          <Button onClick={() => setShowAddDialog(true)} size="sm" className="rounded-full">
            <Plus className="h-4 w-4 mr-1" /> Add Leave
          </Button>
        }
      />

      <div className="flex gap-3 items-center">
        <Select value={trainerFilter} onValueChange={setTrainerFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Trainers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trainers</SelectItem>
            {trainers.map((trainer) => <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setMonthDate(subMonths(monthDate, 1))}>←</Button>
          <span className="text-sm font-medium min-w-[120px] text-center">{format(monthDate, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" onClick={() => setMonthDate(addMonths(monthDate, 1))}>→</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          {loading ? (
            <div className="p-8 text-sm text-center text-muted-foreground">Loading availability...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 min-w-[140px]">Trainer</TableHead>
                  {daysInMonth.map((day) => (
                    <TableHead key={day.toISOString()} className={cn("text-center min-w-[36px] p-1 text-[10px]", isWeekend(day) && "bg-muted/50")}>
                      <div>{format(day, "d")}</div>
                      <div className="text-muted-foreground">{format(day, "EEE")}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainers.filter((trainer) => trainerFilter === "all" || trainer.id === trainerFilter).map((trainer) => (
                  <TableRow key={trainer.id}>
                    <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">{trainer.name}</TableCell>
                    {daysInMonth.map((day) => {
                      const leave = getLeaveForDay(trainer.id, day);
                      const weekend = isWeekend(day);
                      return (
                        <TableCell key={day.toISOString()} className={cn("text-center p-0.5", weekend && "bg-muted/30")}>
                          {leave ? (
                            <div
                              className={cn(
                                "w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-medium mx-auto cursor-help",
                                leave.status === "Approved" ? "bg-destructive/20 text-destructive" :
                                  leave.status === "Pending" ? "bg-warning/20 text-warning-foreground" :
                                    "bg-muted text-muted-foreground",
                              )}
                              title={`${leave.type} (${leave.status})`}
                            >
                              {leave.type.charAt(0)}
                            </div>
                          ) : weekend ? (
                            <div className="w-7 h-7 rounded-md bg-muted/50 mx-auto" />
                          ) : (
                            <div className="w-7 h-7 rounded-md bg-success/10 mx-auto flex items-center justify-center">
                              <span className="text-[9px] text-success">✓</span>
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Leave Records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trainer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                {isSupervisor ? <TableHead>Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAvailability.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{trainers.find((trainer) => trainer.id === record.trainerId)?.name || record.trainerId}</TableCell>
                  <TableCell>{record.type}</TableCell>
                  <TableCell>{record.startDate}</TableCell>
                  <TableCell>{record.endDate}</TableCell>
                  <TableCell><Badge className={statusColors[record.status]}>{record.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{record.notes}</TableCell>
                  {isSupervisor ? (
                    <TableCell>
                      <div className="flex gap-1">
                        {record.status === "Pending" ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => handleStatusChange(record.backendId, record, "Approved")} disabled={saving}><CheckCircle className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleStatusChange(record.backendId, record, "Rejected")} disabled={saving}><XCircle className="h-4 w-4" /></Button>
                          </>
                        ) : null}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(record.backendId)} disabled={saving}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {!filteredAvailability.length ? (
                <TableRow>
                  <TableCell colSpan={isSupervisor ? 7 : 6} className="text-center text-sm text-muted-foreground py-8">No leave records found.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-success/10" /> Available</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-destructive/20" /> Approved Leave</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-warning/20" /> Pending Leave</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-muted/50" /> Weekend</div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Leave / Unavailability</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Trainer</Label>
              <Select value={newLeave.trainerId} onValueChange={(value) => setNewLeave({ ...newLeave, trainerId: value })}>
                <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                <SelectContent>{trainers.map((trainer) => <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type</Label>
              <Select value={newLeave.type} onValueChange={(value) => setNewLeave({ ...newLeave, type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{leaveTypes.map((leaveType) => <SelectItem key={leaveType} value={leaveType}>{leaveType}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={newLeave.startDate} onChange={(event) => setNewLeave({ ...newLeave, startDate: event.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={newLeave.endDate} onChange={(event) => setNewLeave({ ...newLeave, endDate: event.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={newLeave.notes} onChange={(event) => setNewLeave({ ...newLeave, notes: event.target.value })} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddLeave} disabled={saving}>Add Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
