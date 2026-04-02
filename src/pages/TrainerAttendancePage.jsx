import { useState, useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { PremiumCard, PremiumCardContent } from "@/components/learning/PremiumCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, Download, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isWeekend } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  Present: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  Absent: "bg-destructive/20 text-destructive",
  Late: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  Leave: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  Holiday: "bg-muted text-muted-foreground",
};

const STATUS_ABBR = { Present: "P", Absent: "A", Late: "L", Leave: "Lv", Holiday: "H" };

export default function TrainerAttendancePage() {
  const trainers = useAppStore((s) => s.trainers);
  const trainerAttendance = useAppStore((s) => s.trainerAttendance || []);
  const setTrainerAttendance = useAppStore((s) => s.setTrainerAttendance);

  const [viewMode, setViewMode] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date("2026-04-02"));
  const [bulkStatus, setBulkStatus] = useState("Present");

  const dateRange = useMemo(() => {
    const start = viewMode === "week" ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfMonth(currentDate);
    const end = viewMode === "week" ? endOfWeek(currentDate, { weekStartsOn: 1 }) : endOfMonth(currentDate);
    return eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d));
  }, [currentDate, viewMode]);

  const navigate = (dir) => {
    if (viewMode === "week") setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    else setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const getStatus = (trainerId, dateStr) => {
    const rec = trainerAttendance.find((r) => r.trainerId === trainerId && r.date === dateStr);
    return rec?.status || "";
  };

  const toggleStatus = (trainerId, dateStr) => {
    const statuses = ["Present", "Absent", "Late", "Leave"];
    const current = getStatus(trainerId, dateStr);
    const nextIdx = (statuses.indexOf(current) + 1) % statuses.length;
    const newStatus = statuses[nextIdx];

    const existing = trainerAttendance.filter((r) => !(r.trainerId === trainerId && r.date === dateStr));
    existing.push({ id: `ta-${trainerId}-${dateStr}`, trainerId, date: dateStr, status: newStatus, notes: "", markedBy: "current", markedAt: new Date().toISOString() });
    setTrainerAttendance(existing);
  };

  const bulkMarkDay = (dateStr) => {
    const updated = [...trainerAttendance.filter((r) => r.date !== dateStr)];
    trainers.forEach((t) => {
      updated.push({ id: `ta-${t.id}-${dateStr}`, trainerId: t.id, date: dateStr, status: bulkStatus, notes: "", markedBy: "current", markedAt: new Date().toISOString() });
    });
    setTrainerAttendance(updated);
    toast.success(`Marked all trainers as ${bulkStatus} for ${format(new Date(dateStr), "MMM d")}`);
  };

  const getTrainerStats = (trainerId) => {
    const records = trainerAttendance.filter((r) => r.trainerId === trainerId);
    const total = records.length || 1;
    const present = records.filter((r) => r.status === "Present" || r.status === "Late").length;
    return Math.round((present / total) * 100);
  };

  const exportCSV = () => {
    const headers = ["Trainer", ...dateRange.map((d) => format(d, "MMM d")), "Attendance %"];
    const rows = trainers.map((t) => [
      t.name,
      ...dateRange.map((d) => getStatus(t.id, format(d, "yyyy-MM-dd")) || "-"),
      `${getTrainerStats(t.id)}%`,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trainer-attendance-${format(currentDate, "yyyy-MM")}.csv`;
    a.click();
    toast.success("CSV exported!");
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
                ? `${format(dateRange[0] || currentDate, "MMM d")} – ${format(dateRange[dateRange.length - 1] || currentDate, "MMM d, yyyy")}`
                : format(currentDate, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="icon" onClick={() => navigate(1)} className="rounded-full"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <Button variant="outline" onClick={exportCSV} className="rounded-full gap-2"><Download className="h-4 w-4" /> Export</Button>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center gap-3 px-2">
        <span className="text-sm font-medium text-muted-foreground">Bulk mark:</span>
        <Select value={bulkStatus} onValueChange={setBulkStatus}>
          <SelectTrigger className="w-[130px] bg-background rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["Present", "Absent", "Late", "Leave", "Holiday"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <PremiumCard>
        <PremiumCardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="sticky left-0 bg-muted/30 z-10 min-w-[180px] font-bold">Trainer</TableHead>
                  {dateRange.map((d) => {
                    const dateStr = format(d, "yyyy-MM-dd");
                    return (
                      <TableHead key={dateStr} className="text-center min-w-[60px] p-1">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-muted-foreground">{format(d, "EEE")}</span>
                          <span className="text-xs font-bold">{format(d, "d")}</span>
                          <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px]" onClick={() => bulkMarkDay(dateStr)}>All</Button>
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
                          {trainer.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <span className="truncate">{trainer.name}</span>
                      </div>
                    </TableCell>
                    {dateRange.map((d) => {
                      const dateStr = format(d, "yyyy-MM-dd");
                      const status = getStatus(trainer.id, dateStr);
                      return (
                        <TableCell key={dateStr} className="text-center p-1">
                          <button
                            onClick={() => toggleStatus(trainer.id, dateStr)}
                            className={cn("inline-flex items-center justify-center h-8 w-8 rounded-lg text-xs font-bold transition-all", status ? STATUS_COLORS[status] : "bg-muted/30 text-muted-foreground/50 hover:bg-muted")}
                          >
                            {STATUS_ABBR[status] || "–"}
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
        </PremiumCardContent>
      </PremiumCard>
    </div>
  );
}
