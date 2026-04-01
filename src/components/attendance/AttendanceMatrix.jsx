import { useMemo } from "react";
import { getTierForDay, computeSummary } from "@/lib/tier-config";
import { MatrixCell } from "./MatrixCell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, parseISO } from "date-fns";

export function AttendanceMatrix({
    students,
    attendanceData, // Map studentId -> tieredRecord
    selectedDays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // Default range for demo if none selected
    trainingName = "",
    dayLabels = {},
    overrides = {},
    onValueChange,
    onRemarksEdit,
    readOnly = false
}) {
    // Group days by tier for the header
    const tierGroups = useMemo(() => {
        const groups = [];
        let currentTier = null;
        let currentDays = [];

        selectedDays.forEach((day) => {
            const tier = getTierForDay(day);
            if (!currentTier || tier.id !== currentTier.id) {
                if (currentTier) groups.push({ tier: currentTier, days: currentDays });
                currentTier = tier;
                currentDays = [day];
            } else {
                currentDays.push(day);
            }
        });
        if (currentTier) groups.push({ tier: currentTier, days: currentDays });
        return groups;
    }, [selectedDays]);

    return (
        <div className="relative border border-border/50 rounded-2xl bg-card shadow-xl shadow-foreground/5 overflow-hidden animate-fade-in">
            <div className="overflow-auto max-h-[70vh]">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-30 bg-background/95 backdrop-blur-md">
                        {/* Tier Group Labels */}
                        <tr>
                            <th className="sticky left-0 z-40 bg-background/95 border-b border-border/50 min-w-[280px]"></th>
                            {tierGroups.map((group, idx) => (
                                <th
                                    key={group.tier.id + idx}
                                    colSpan={group.days.length}
                                    className="px-4 py-2 text-[10px] uppercase tracking-widest font-black text-primary/60 border-b border-l border-border/10 bg-primary/5"
                                >
                                    {trainingName || group.tier.label}
                                </th>
                            ))}
                            <th className="border-b border-border/50 bg-accent/5 p-2 min-w-[120px]"></th>
                        </tr>
                        {/* Day Numbers */}
                        <tr className="bg-background/95 shadow-sm">
                            <th className="sticky left-0 z-40 bg-background/95 border-b border-border/50 p-4 text-left font-bold text-sm text-foreground">
                                Student Metadata
                            </th>
                            {selectedDays.map((day) => (
                                <th key={day} className="border-b border-l border-border/10 p-2 min-w-[120px] text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-muted-foreground/60">
                                            {dayLabels[day] ? format(parseISO(dayLabels[day]), "MMM") : "DAY"}
                                        </span>
                                        <span className="text-sm font-black text-foreground">
                                            {dayLabels[day] ? format(parseISO(dayLabels[day]), "d") : day}
                                        </span>
                                        {dayLabels[day] && (
                                            <span className="text-[10px] font-medium text-muted-foreground/70">
                                                {format(parseISO(dayLabels[day]), "EEE")}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="border-b border-l border-border/10 p-2 min-w-[120px] text-center bg-accent/5">
                                <span className="text-[10px] font-bold text-accent">SUMMARY</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {students.map((student) => {
                            const record = attendanceData[student.id] || {};
                            const summary = computeSummary(record.dayValues || {});

                            return (
                                <tr key={student.id} className="hover:bg-muted/5 group transition-colors">
                                    {/* Sticky Student Profile Header */}
                                    <td className="sticky left-0 z-20 bg-background/95 group-hover:bg-muted/10 transition-colors border-r border-border/10 p-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border-2 border-primary/10 shadow-sm">
                                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.id}`} />
                                                <AvatarFallback>{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors cursor-pointer">
                                                    {student.firstName} {student.lastName}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted/50 px-1.5 rounded uppercase tracking-wider">
                                                        {student.empId}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-muted-foreground">
                                                        {student.language}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Matrix Cells */}
                                    {selectedDays.map((day) => {
                                        const dayKey = `day_${day}`;
                                        const hasOverride = !!record.overrides?.[dayKey];
                                        return (
                                            <td key={day} className="border-l border-border/10">
                                                <MatrixCell
                                                    studentId={student.id}
                                                    dayNum={day}
                                                    value={record.dayValues?.[dayKey]}
                                                    remarks={record.dayValues?.[`${dayKey}_remarks`]}
                                                    provenance={record.importId ? { importId: record.importId, rowNumber: record.rowNumber } : null}
                                                    hasOverride={hasOverride}
                                                    onValueChange={onValueChange}
                                                    onRemarksEdit={onRemarksEdit}
                                                />
                                            </td>
                                        );
                                    })}

                                    {/* Row Summary */}
                                    <td className="border-l border-border/10 bg-accent/[0.02] p-4">
                                        <div className="flex flex-col gap-1 text-[10px]">
                                            <div className="flex justify-between items-center bg-background/50 p-1 px-2 rounded">
                                                <span className="text-muted-foreground font-medium uppercase tracking-tighter">Total Hrs</span>
                                                <span className="font-black text-foreground">
                                                    {summary.hoursCompleted}h
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center bg-background/50 p-1 px-2 rounded">
                                                <span className="text-muted-foreground font-medium uppercase tracking-tighter">Abs/NCNS</span>
                                                <span className="font-bold text-destructive">
                                                    {summary.totalAbsences + summary.ncnsCount}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

