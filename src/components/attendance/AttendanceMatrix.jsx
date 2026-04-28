import { useMemo } from "react";
import { getTierForDay, computeSummary } from "@/lib/tier-config";
import { MatrixCell } from "./MatrixCell";
import { format, parseISO } from "date-fns";
import { StudentAvatar } from "@/components/StudentAvatar";

export function AttendanceMatrix({
    students,
    attendanceData,
    selectedDays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    trainingName = "",
    dayLabels = {},
    overrides = {},
    onValueChange,
    onRemarksEdit,
    readOnly = false
}) {
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
        <div className="table-shell relative animate-fade-in">
            <div className="max-h-[70vh] overflow-auto">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-30 bg-card/95 backdrop-blur-md">
                        <tr>
                            <th className="sticky left-0 z-40 min-w-[280px] border-b border-border/50 bg-card/95"></th>
                            {tierGroups.map((group, idx) => (
                                <th
                                    key={group.tier.id + idx}
                                    colSpan={group.days.length}
                                    className="border-b border-l border-border/10 bg-primary/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary/80"
                                >
                                    {trainingName || group.tier.label}
                                </th>
                            ))}
                            <th className="min-w-[120px] border-b border-border/50 bg-secondary/80 p-2"></th>
                        </tr>
                        <tr className="bg-card/95 shadow-sm">
                            <th className="sticky left-0 z-40 border-b border-border/50 bg-card/95 p-4 text-left text-sm font-bold text-foreground">
                                Student Metadata
                            </th>
                            {selectedDays.map((day) => (
                                <th key={day} className="min-w-[120px] border-b border-l border-border/10 p-2 text-center">
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
                            <th className="min-w-[120px] border-b border-l border-border/10 bg-secondary/80 p-2 text-center">
                                <span className="section-kicker text-muted-foreground/80">Summary</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {students.map((student) => {
                            const record = attendanceData[student.id] || {};
                            const summary = computeSummary(record.dayValues || {});

                            return (
                                <tr key={student.id} className="group transition-colors hover:bg-secondary/40">
                                    <td className="sticky left-0 z-20 border-r border-border/10 bg-card/95 p-4 transition-colors group-hover:bg-secondary/45">
                                        <div className="flex items-center gap-3">
                                            <StudentAvatar 
                                                firstName={student.firstName} 
                                                lastName={student.lastName} 
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate text-sm font-bold text-foreground">
                                                    {student.firstName} {student.lastName}
                                                </p>
                                                <div className="mt-0.5 flex items-center gap-2">
                                                    <span className="rounded-[var(--radius-field)] border border-border/60 bg-muted/70 px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider text-muted-foreground">
                                                        {student.empId}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-muted-foreground">
                                                        {student.language}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

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

                                    <td className="border-l border-border/10 bg-secondary/45 p-3">
                                        <div className="flex flex-col gap-1 text-[10px]">
                                            <div className="flex items-center justify-between rounded-[var(--radius-field)] border border-border/60 bg-background/85 p-1.5 px-2">
                                                <span className="font-medium uppercase tracking-tighter text-muted-foreground">Total Hrs</span>
                                                <span className="font-black text-foreground">
                                                    {summary.hoursCompleted}h
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-[var(--radius-field)] border border-border/60 bg-background/85 p-1.5 px-2">
                                                <span className="font-medium uppercase tracking-tighter text-muted-foreground">Abs/NCNS</span>
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
