import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { PremiumCard, PremiumCardContent } from "@/components/learning/PremiumCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isWeekend } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/data/api";
import { downloadBlob, normalizeTrainer, normalizeTrainerAttendanceRecord, toApiId } from "@/lib/phase-backend";

const STATUS_COLORS = {
  Present: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  Absent: "bg-destructive/20 text-destructive",
  Late: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  Leave: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  Holiday: "bg-muted text-muted-foreground",
};

const STATUS_ABBR = { Present: "P", Absent: "A", Late: "L", Leave: "Lv", Holiday: "H" };
const ATTENDANCE_STATUSES = ["Present", "Absent", "Late", "Leave"];

export default function TrainerAttendancePage() {
  const user = useAppStore((state) => state.user);
  const [trainers, setTrainers] = useState([]);
  const [trainerAttendance, setTrainerAttendance] = useState([]);
  const [viewMode, setViewMode] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date("2026-04-02"));
  const [bulkStatus, setBulkStatus] = useState("Present");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

        const [trainerResponse, attendanceResponse] = await Promise.all([
          api.trainers.list(),
          api.trainerAttendance.list(query),
        ]);

        if (cancelled) {
          return;
        }

        setTrainers((trainerResponse?.trainers || []).map(normalizeTrainer));
        setTrainerAttendance((attendanceResponse?.records || []).map(normalizeTrainerAttendanceRecord));
      } catch (error) {
        if (!cancelled) {
          toast.error("Failed to load trainer attendance");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
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
    if (!trainer) {
      return;
    }

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
    if (!trainers.length) {
      return;
    }

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

      setTrainerAttendance((current) => [
        ...current.filter((item) => item.date !== dateStr),
        ...dayRecords,
      ]);
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

  return (
    <div className="space-y-6 animate-fade-in max-w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" /> Trainer Attendance
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Track and manage trainer attendance records</p>
        </div>
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
          <Button variant="outline" onClick={exportCSV} className="rounded-full gap-2"><Download className="h-4 w-4" /> Export</Button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-2">
        <span className="text-sm font-medium text-muted-foreground">Bulk mark:</span>
        <Select value={bulkStatus} onValueChange={setBulkStatus}>
          <SelectTrigger className="w-[130px] bg-background rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["Present", "Absent", "Late", "Leave", "Holiday"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
          </SelectContent>
        </Select>
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
    </div>
  );
}
