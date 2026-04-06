import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { PremiumCard, PremiumCardContent } from "@/components/learning/PremiumCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ClipboardCheck, Download, ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle, XCircle, Pencil, CalendarOff } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isWeekend, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/data/api";
import { downloadBlob, normalizeTrainer, normalizeTrainerAttendanceRecord, normalizeAvailabilityRecord, toApiId } from "@/lib/phase-backend";
import { leaveTypes } from "@/lib/phase3-mock-data";

const STATUS_COLORS = {
  Present: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  Absent: "bg-destructive/20 text-destructive",
  Late: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  Leave: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  Holiday: "bg-muted text-muted-foreground",
};

const STATUS_ABBR = { Present: "P", Absent: "A", Late: "L", Leave: "Lv", Holiday: "H" };
const ATTENDANCE_STATUSES = ["Present", "Absent", "Late", "Leave"];

const leaveStatusColors = {
  Approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function TrainerAttendancePage() {
  const user = useAppStore((state) => state.user);
  const [trainers, setTrainers] = useState([]);
  const [trainerAttendance, setTrainerAttendance] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [viewMode, setViewMode] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date("2026-04-02"));
  const [bulkStatus, setBulkStatus] = useState("Present");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [newLeave, setNewLeave] = useState({ trainerId: "", type: "Annual Leave", startDate: "", endDate: "", notes: "" });

  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const dateRange = useMemo(() => {
    const start = viewMode === "week" ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfMonth(currentDate);
    const end = viewMode === "week" ? endOfWeek(currentDate, { weekStartsOn: 1 }) : endOfMonth(currentDate);
    return eachDayOfInterval({ start, end }).filter((date) => !isWeekend(date));
  }, [currentDate, viewMode]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);

      try {
        const query = {
          from: format(dateRange[0] || currentDate, "yyyy-MM-dd"),
          to: format(dateRange[dateRange.length - 1] || currentDate, "yyyy-MM-dd"),
        };

        const [trainerResponse, attendanceResponse, availabilityResponse] = await Promise.all([
          api.trainers.list(),
          api.trainerAttendance.list(query),
          api.availabilityPage.list({ from: format(monthStart, "yyyy-MM-dd"), to: format(monthEnd, "yyyy-MM-dd") }),
        ]);

        if (cancelled) return;

        setTrainers((trainerResponse?.trainers || []).map(normalizeTrainer));
        setTrainerAttendance((attendanceResponse?.records || []).map(normalizeTrainerAttendanceRecord));
        setAvailability((availabilityResponse?.availability || []).map(normalizeAvailabilityRecord));
      } catch (error) {
        if (!cancelled) toast.error("Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [currentDate, dateRange, viewMode]);

  const navigate = (direction) => {
    if (viewMode === "week") {
      setCurrentDate(direction === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
      return;
    }
    setCurrentDate(direction === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const getStatus = (trainerId, dateStr) => {
    const record = trainerAttendance.find((item) => item.trainerId === trainerId && item.date === dateStr);
    return record?.status || "";
  };

  const upsertAttendanceRecord = (record) => {
    setTrainerAttendance((current) => {
      const filtered = current.filter((item) => !(item.trainerId === record.trainerId && item.date === record.date));
      return [...filtered, record];
    });
  };

  const toggleStatus = async (trainerId, dateStr) => {
    const trainer = trainers.find((item) => item.id === trainerId);
    if (!trainer) return;

    const currentStatus = getStatus(trainerId, dateStr);
    const nextIndex = (ATTENDANCE_STATUSES.indexOf(currentStatus) + 1) % ATTENDANCE_STATUSES.length;
    const newStatus = ATTENDANCE_STATUSES[nextIndex];

    setSaving(true);
    try {
      const response = await api.trainerAttendance.create({
        trainer_id: toApiId(trainer.backendId),
        date: dateStr,
        status: newStatus,
        notes: "",
        marked_by: user?.portalId || user?.id || "system",
      });
      upsertAttendanceRecord(normalizeTrainerAttendanceRecord(response?.record || {}));
    } catch (error) {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const bulkMarkDay = async (dateStr) => {
    if (!trainers.length) return;
    setSaving(true);
    try {
      await api.trainerAttendance.bulk({
        records: trainers.map((trainer) => ({
          trainer_id: toApiId(trainer.backendId),
          date: dateStr,
          status: bulkStatus,
          notes: "",
          marked_by: user?.portalId || user?.id || "system",
        })),
      });
      const attendanceResponse = await api.trainerAttendance.list({ date: dateStr, from: dateStr, to: dateStr }, { cache: false });
      const dayRecords = (attendanceResponse?.records || []).map(normalizeTrainerAttendanceRecord);
      setTrainerAttendance((current) => [...current.filter((item) => item.date !== dateStr), ...dayRecords]);
      toast.success(`Marked all trainers as ${bulkStatus} for ${format(new Date(dateStr), "MMM d")}`);
    } catch (error) {
      toast.error("Failed to save bulk attendance");
    } finally {
      setSaving(false);
    }
  };

  const getTrainerStats = (trainerId) => {
    const records = trainerAttendance.filter((record) => record.trainerId === trainerId);
    const total = records.length || 1;
    const present = records.filter((record) => record.status === "Present" || record.status === "Late").length;
    return Math.round((present / total) * 100);
  };

  const exportCSV = async () => {
    try {
      const blob = await api.trainerAttendance.export({
        from: format(dateRange[0] || currentDate, "yyyy-MM-dd"),
        to: format(dateRange[dateRange.length - 1] || currentDate, "yyyy-MM-dd"),
      });
      downloadBlob(blob, `trainer-attendance-${format(currentDate, "yyyy-MM")}.csv`);
      toast.success("CSV exported");
    } catch (error) {
      toast.error("Failed to export attendance");
    }
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
      setShowLeaveDialog(false);
      setNewLeave({ trainerId: "", type: "Annual Leave", startDate: "", endDate: "", notes: "" });
      setEditingLeave(null);
      // Reload availability
      const availabilityResponse = await api.availabilityPage.list({ from: format(monthStart, "yyyy-MM-dd"), to: format(monthEnd, "yyyy-MM-dd") });
      setAvailability((availabilityResponse?.availability || []).map(normalizeAvailabilityRecord));
      toast.success("Leave record added");
    } catch (error) {
      toast.error("Failed to add leave record");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLeave = async (backendId) => {
    setSaving(true);
    try {
      await api.availabilityPage.remove(backendId);
      const availabilityResponse = await api.availabilityPage.list({ from: format(monthStart, "yyyy-MM-dd"), to: format(monthEnd, "yyyy-MM-dd") });
      setAvailability((availabilityResponse?.availability || []).map(normalizeAvailabilityRecord));
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
      const availabilityResponse = await api.availabilityPage.list({ from: format(monthStart, "yyyy-MM-dd"), to: format(monthEnd, "yyyy-MM-dd") });
      setAvailability((availabilityResponse?.availability || []).map(normalizeAvailabilityRecord));
      toast.success(`Leave ${status.toLowerCase()}`);
    } catch (error) {
      toast.error("Failed to update leave status");
    } finally {
      setSaving(false);
    }
  };

  const openEditLeave = (record) => {
    setEditingLeave(record);
    setNewLeave({
      trainerId: record.trainerId,
      type: record.type,
      startDate: record.startDate,
      endDate: record.endDate,
      notes: record.notes || "",
    });
    setShowLeaveDialog(true);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" /> Trainer Attendance & Availability
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Unified view of attendance records and leave management</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={() => { setEditingLeave(null); setNewLeave({ trainerId: "", type: "Annual Leave", startDate: "", endDate: "", notes: "" }); setShowLeaveDialog(true); }}>
            <Plus className="h-4 w-4" /> Add Leave
          </Button>
          <Button variant="outline" onClick={exportCSV} className="rounded-full gap-2"><Download className="h-4 w-4" /> Export</Button>
        </div>
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance"><ClipboardCheck className="h-4 w-4 mr-1" /> Attendance</TabsTrigger>
          <TabsTrigger value="leave"><CalendarOff className="h-4 w-4 mr-1" /> Leave Records</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-[120px] bg-background rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full"><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {viewMode === "week"
                  ? `${format(dateRange[0] || currentDate, "MMM d")} - ${format(dateRange[dateRange.length - 1] || currentDate, "MMM d, yyyy")}`
                  : format(currentDate, "MMMM yyyy")}
              </span>
              <Button variant="outline" size="icon" onClick={() => navigate(1)} className="rounded-full"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Bulk:</span>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-[130px] bg-background rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Present", "Absent", "Late", "Leave", "Holiday"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <PremiumCard>
            <PremiumCardContent className="p-0">
              {loading ? (
                <div className="p-8 text-sm text-center text-muted-foreground">Loading trainer attendance...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="sticky left-0 bg-muted/30 z-10 min-w-[180px] font-bold">Trainer</TableHead>
                        {dateRange.map((date) => {
                          const dateStr = format(date, "yyyy-MM-dd");
                          return (
                            <TableHead key={dateStr} className="text-center min-w-[60px] p-1">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[10px] text-muted-foreground">{format(date, "EEE")}</span>
                                <span className="text-xs font-bold">{format(date, "d")}</span>
                                <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px]" onClick={() => bulkMarkDay(dateStr)} disabled={saving}>All</Button>
                              </div>
                            </TableHead>
                          );
                        })}
                        <TableHead className="text-center min-w-[80px] font-bold">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trainers.map((trainer) => (
                        <TableRow key={trainer.id} className="hover:bg-muted/20">
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {trainer.name.split(" ").map((name) => name[0]).join("")}
                              </div>
                              <span className="truncate">{trainer.name}</span>
                            </div>
                          </TableCell>
                          {dateRange.map((date) => {
                            const dateStr = format(date, "yyyy-MM-dd");
                            const status = getStatus(trainer.id, dateStr);
                            return (
                              <TableCell key={dateStr} className="text-center p-1">
                                <button
                                  onClick={() => toggleStatus(trainer.id, dateStr)}
                                  disabled={saving}
                                  className={cn(
                                    "inline-flex items-center justify-center h-8 w-8 rounded-lg text-xs font-bold transition-all",
                                    status ? STATUS_COLORS[status] : "bg-muted/30 text-muted-foreground/50 hover:bg-muted",
                                    saving && "opacity-60 cursor-not-allowed",
                                  )}
                                >
                                  {STATUS_ABBR[status] || "-"}
                                </button>
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn("font-bold", getTrainerStats(trainer.id) >= 90 ? "text-emerald-600" : getTrainerStats(trainer.id) >= 75 ? "text-amber-600" : "text-destructive")}>
                              {getTrainerStats(trainer.id)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </PremiumCardContent>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availability.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{trainers.find((t) => t.id === record.trainerId)?.name || record.trainerId}</TableCell>
                      <TableCell>{record.type}</TableCell>
                      <TableCell>{record.startDate}</TableCell>
                      <TableCell>{record.endDate}</TableCell>
                      <TableCell><Badge className={leaveStatusColors[record.status]}>{record.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{record.notes}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditLeave(record)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                          {isSupervisor && record.status === "Pending" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleStatusChange(record.backendId, record, "Approved")} disabled={saving}><CheckCircle className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleStatusChange(record.backendId, record, "Rejected")} disabled={saving}><XCircle className="h-4 w-4" /></Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteLeave(record.backendId)} disabled={saving}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!availability.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No leave records found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-green-100" /> Approved</div>
              <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-amber-100" /> Pending</div>
              <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-red-100" /> Rejected</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingLeave ? "Edit Leave" : "Add Leave / Unavailability"}</DialogTitle></DialogHeader>
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
              <div><Label>Start Date</Label><Input type="date" value={newLeave.startDate} onChange={(event) => setNewLeave({ ...newLeave, startDate: event.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={newLeave.endDate} onChange={(event) => setNewLeave({ ...newLeave, endDate: event.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={newLeave.notes} onChange={(event) => setNewLeave({ ...newLeave, notes: event.target.value })} placeholder="Optional notes..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>Cancel</Button>
            <Button onClick={handleAddLeave} disabled={saving}>{editingLeave ? "Update" : "Add"} Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
