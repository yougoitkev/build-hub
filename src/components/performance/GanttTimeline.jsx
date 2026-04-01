import React, { useMemo, useState } from "react";
import { format, addDays, differenceInDays, isBefore, isAfter, isSameDay } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export function GanttTimeline({ students, dataModel, onStudentClick }) {
    // dataModel provides the structured timeline per student.

    // 1. Determine Global Date Range for the Headers
    const { minDate, maxDate } = useMemo(() => {
        let min = new Date();
        let max = new Date();

        let hasData = false;

        dataModel.forEach(studentNode => {
            studentNode.phases.forEach(p => {
                if (!hasData) {
                    min = p.startDate;
                    max = p.endDate;
                    hasData = true;
                } else {
                    if (p.startDate && isBefore(p.startDate, min)) min = p.startDate;
                    if (p.endDate && isAfter(p.endDate, max)) max = p.endDate;
                }
            });
        });

        // Add some padding to max boundary
        if (hasData) {
            max = addDays(max, 5);
        }

        return { minDate: min, maxDate: max };
    }, [dataModel]);

    const totalDays = differenceInDays(maxDate, minDate) + 1;

    // Generate an array of dates for the header
    const dateHeaders = useMemo(() => {
        const headers = [];
        for (let i = 0; i < totalDays; i++) {
            headers.push(addDays(minDate, i));
        }
        return headers;
    }, [minDate, totalDays]);

    if (!dataModel || dataModel.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground w-full">
                <p>No timeline data available for the current selection.</p>
            </div>
        );
    }

    const cellWidth = 40; // width per day in pixels

    return (
        <div className="relative w-full rounded-b-xl border border-border/50 bg-background overflow-hidden flex flex-col h-full animate-fade-in">
            {/* Header Row */}
            <div className="flex border-b border-border/50 bg-muted/30 sticky top-0 z-20">
                {/* Sticky Left Column Header */}
                <div className="w-[300px] shrink-0 border-r border-border/50 p-4 sticky left-0 z-30 bg-muted/90 backdrop-blur-md flex items-center justify-between">
                    <span className="font-bold text-sm tracking-wider uppercase text-muted-foreground">Learner</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-background border border-border/50">{dataModel.length}</span>
                </div>

                {/* Scrollable Right Header Timeline */}
                <div className="flex-1 overflow-x-auto relative flex select-none no-scrollbar">
                    {dateHeaders.map((date, i) => (
                        <div key={i} className="flex flex-col items-center justify-end shrink-0 border-r border-border/30 h-12" style={{ width: `${cellWidth}px` }}>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase">{format(date, "EEE")}</span>
                            <span className="text-sm font-bold text-foreground mb-1">{format(date, "d")}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Body Rows */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar">
                {dataModel.map((studentNode) => (
                    <div key={studentNode.studentId} className="flex border-b border-border/30 hover:bg-muted/10 transition-colors group">

                        {/* Sticky Left Column - Student Info */}
                        <div
                            className="w-[300px] shrink-0 border-r border-border/50 bg-background group-hover:bg-muted/50 p-3 sticky left-0 z-10 transition-colors cursor-pointer"
                            onClick={() => onStudentClick && onStudentClick(studentNode.studentId)}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                    {studentNode.studentName}
                                </p>
                                {studentNode.riskStatus === 'At Risk' && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <AlertTriangle className="h-4 w-4 text-warning" />
                                            </TooltipTrigger>
                                            <TooltipContent>Flagged At Risk</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-mono">{studentNode.empId}</span>
                                <span>•</span>
                                <span className="truncate" title={studentNode.trainingName}>{studentNode.trainingName}</span>
                            </div>
                            {/* Small Completion Bar under name */}
                            <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-1000"
                                    style={{ width: `${studentNode.completionPercentage}%` }}
                                />
                            </div>
                        </div>

                        {/* Scrollable Right Timeline Rows */}
                        <div className="flex-1 overflow-x-auto relative pt-3 pb-3 no-scrollbar" style={{ minWidth: `${totalDays * cellWidth}px` }}>

                            {/* Grid Lines Overlay */}
                            <div className="absolute inset-0 flex pointer-events-none opacity-20">
                                {dateHeaders.map((_, i) => (
                                    <div key={i} className="shrink-0 border-r border-border/40 h-full" style={{ width: `${cellWidth}px` }} />
                                ))}
                            </div>

                            {/* Render Phases/Bars */}
                            <TooltipProvider delayDuration={200}>
                                {studentNode.phases.map((phase, pIdx) => {
                                    if (!phase.startDate || !phase.endDate) return null;

                                    const startOffsetDays = differenceInDays(phase.startDate, minDate);
                                    const durationDays = differenceInDays(phase.endDate, phase.startDate) + 1;

                                    if (startOffsetDays < 0 || durationDays <= 0) return null;

                                    const leftPosition = startOffsetDays * cellWidth;
                                    const barWidth = durationDays * cellWidth;

                                    // Styling based on status
                                    let barColor = "bg-primary/20 border-primary/40 text-primary";
                                    let icon = null;

                                    if (phase.status === "Completed") {
                                        barColor = "bg-status-completed border-status-completed/50 text-status-completed-foreground";
                                        icon = <CheckCircle2 className="h-3.5 w-3.5" />;
                                    } else if (phase.status === "In Progress") {
                                        barColor = "bg-status-in-progress border-status-in-progress/50 text-status-in-progress-foreground shadow-sm shadow-status-in-progress/20 animate-pulse-slow";
                                        icon = <Clock className="h-3.5 w-3.5" />;
                                    } else if (phase.status === "Delayed") {
                                        barColor = "bg-destructive border-destructive/50 text-destructive-foreground shadow-sm shadow-destructive/20";
                                        icon = <AlertTriangle className="h-3.5 w-3.5" />;
                                    } else if (phase.status === "Not Started") {
                                        barColor = "bg-muted/50 border-border/50 text-muted-foreground border-dashed";
                                    }

                                    return (
                                        <Tooltip key={pIdx}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={`absolute top-3 h-8 rounded-md border flex items-center px-2 cursor-help transition-all duration-300 hover:ring-2 hover:ring-foreground/20 z-10 ${barColor}`}
                                                    style={{ left: `${leftPosition}px`, width: `${Math.max(barWidth - 4, 20)}px` }}
                                                >
                                                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                                        {icon}
                                                        {barWidth > 60 && <span className="text-xs font-bold truncate">{phase.name}</span>}
                                                    </div>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="flex flex-col gap-1.5 pb-3">
                                                <div className="font-bold text-sm mb-1">{phase.name} - {phase.status}</div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                                    <span className="text-muted-foreground">Start:</span>
                                                    <span className="font-medium text-right">{format(phase.startDate, "MMM do yyyy")}</span>
                                                    <span className="text-muted-foreground">End (Est):</span>
                                                    <span className="font-medium text-right">{format(phase.endDate, "MMM do yyyy")}</span>
                                                    <span className="text-muted-foreground">Duration:</span>
                                                    <span className="font-medium text-right">{durationDays} days</span>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </TooltipProvider>

                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
