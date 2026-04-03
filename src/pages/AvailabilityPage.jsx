import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppStore } from "@/store/app-store";
import { leaveTypes } from "@/lib/phase3-mock-data";
import { CalendarDays, Plus, Trash2, CalendarIcon, CheckCircle, Clock, XCircle } from "lucide-react";
import { format, parseISO, eachDayOfInterval, isSameMonth, isWeekend, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusColors = {
  Approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function AvailabilityPage() {
  const trainers = useAppStore((s) => s.trainers);
  const availability = useAppStore((s) => s.availability);
  const setAvailability = useAppStore((s) => s.setAvailability);
  const user = useAppStore((s) => s.user);
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [monthDate, setMonthDate] = useState(new Date("2026-04-01"));
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newLeave, setNewLeave] = useState({ trainerId: "", type: "Annual Leave", startDate: "", endDate: "", notes: "" });

  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const filteredAvailability = useMemo(() => {
    return availability.filter((a) => {
      if (trainerFilter !== "all" && a.trainerId !== trainerFilter) return false;
      return true;
    });
  }, [availability, trainerFilter]);

  const getLeaveForDay = (trainerId, day) => {
    return filteredAvailability.find((a) => {
      const start = parseISO(a.startDate);
      const end = parseISO(a.endDate);
      return a.trainerId === trainerId && day >= start && day <= end;
    });
  };

  const handleAddLeave = () => {
    if (!newLeave.trainerId || !newLeave.startDate || !newLeave.endDate) {
      toast.error("Please fill all required fields");
      return;
    }
    const leave = {
      id: `av-${Date.now()}`,
      ...newLeave,
      status: isSupervisor ? "Approved" : "Pending",
    };
    setAvailability([...availability, leave]);
    setShowAddDialog(false);
    setNewLeave({ trainerId: "", type: "Annual Leave", startDate: "", endDate: "", notes: "" });
    toast.success("Leave record added");
  };

  const handleDelete = (id) => {
    setAvailability(availability.filter((a) => a.id !== id));
    toast.success("Leave record removed");
  };

  const handleStatusChange = (id, status) => {
    setAvailability(availability.map((a) => a.id === id ? { ...a, status } : a));
    toast.success(`Leave ${status.toLowerCase()}`);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Availability & Leave Management</h1>
          <p className="text-sm text-muted-foreground">Track trainer availability and prevent scheduling conflicts</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Leave
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Select value={trainerFilter} onValueChange={setTrainerFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Trainers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trainers</SelectItem>
            {trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setMonthDate(subMonths(monthDate, 1))}>←</Button>
          <span className="text-sm font-medium min-w-[120px] text-center">{format(monthDate, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" onClick={() => setMonthDate(addMonths(monthDate, 1))}>→</Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0 overflow-auto">
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
              {trainers.filter((t) => trainerFilter === "all" || t.id === trainerFilter).map((trainer) => (
                <TableRow key={trainer.id}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">{trainer.name}</TableCell>
                  {daysInMonth.map((day) => {
                    const leave = getLeaveForDay(trainer.id, day);
                    const weekend = isWeekend(day);
                    return (
                      <TableCell key={day.toISOString()} className={cn("text-center p-0.5", weekend && "bg-muted/30")}>
                        {leave ? (
                          <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-medium mx-auto cursor-help",
                            leave.status === "Approved" ? "bg-destructive/20 text-destructive" :
                            leave.status === "Pending" ? "bg-warning/20 text-warning-foreground" :
                            "bg-muted text-muted-foreground"
                          )} title={`${leave.type} (${leave.status})`}>
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
        </CardContent>
      </Card>

      {/* Leave Records List */}
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
                {isSupervisor && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAvailability.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{trainers.find((t) => t.id === a.trainerId)?.name || a.trainerId}</TableCell>
                  <TableCell>{a.type}</TableCell>
                  <TableCell>{a.startDate}</TableCell>
                  <TableCell>{a.endDate}</TableCell>
                  <TableCell><Badge className={statusColors[a.status]}>{a.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{a.notes}</TableCell>
                  {isSupervisor && (
                    <TableCell>
                      <div className="flex gap-1">
                        {a.status === "Pending" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => handleStatusChange(a.id, "Approved")}><CheckCircle className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleStatusChange(a.id, "Rejected")}><XCircle className="h-4 w-4" /></Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-success/10" /> Available</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-destructive/20" /> Approved Leave</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-warning/20" /> Pending Leave</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-muted/50" /> Weekend</div>
        </CardContent>
      </Card>

      {/* Add Leave Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Leave / Unavailability</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Trainer</Label>
              <Select value={newLeave.trainerId} onValueChange={(v) => setNewLeave({ ...newLeave, trainerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                <SelectContent>{trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type</Label>
              <Select value={newLeave.type} onValueChange={(v) => setNewLeave({ ...newLeave, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{leaveTypes.map((lt) => <SelectItem key={lt} value={lt}>{lt}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={newLeave.startDate} onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={newLeave.endDate} onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={newLeave.notes} onChange={(e) => setNewLeave({ ...newLeave, notes: e.target.value })} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddLeave}>Add Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
