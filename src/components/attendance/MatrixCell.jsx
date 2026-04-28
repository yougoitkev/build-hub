import { HoursDropdown } from "./HoursDropdown";
import { MessageSquare, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function MatrixCell({
    value,
    remarks,
    studentId,
    dayNum,
    provenance,
    hasOverride,
    onValueChange,
    onRemarksEdit
}) {
    return (
        <div className="group flex min-w-[120px] flex-col gap-1.5 rounded-[var(--radius-panel)] p-2.5 transition-colors hover:bg-secondary/50">
            <div className="flex items-center gap-2">
                <HoursDropdown
                    value={value}
                    onChange={(val) => onValueChange(studentId, dayNum, val)}
                    provenance={provenance}
                    hasOverride={hasOverride}
                    className="h-9 w-full"
                />
            </div>

            <div className="mt-0.5 flex items-center gap-1.5">
                {remarks ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex max-w-full cursor-help items-center gap-1.5 rounded-[var(--radius-field)] border border-border/50 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground">
                                <MessageSquare className="h-3 w-3 shrink-0" />
                                <span className="truncate">{remarks}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px] text-xs">
                            <p className="mb-1 font-bold">Remarks:</p>
                            <p>{remarks}</p>
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <button
                        onClick={() => onRemarksEdit(studentId, dayNum)}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground/70 opacity-0 transition-colors hover:text-primary group-hover:opacity-100"
                    >
                        <Pencil className="h-3 w-3" />
                        <span>Add remarks</span>
                    </button>
                )}

                {remarks && (
                    <button
                        onClick={() => onRemarksEdit(studentId, dayNum)}
                        className="text-muted-foreground/70 opacity-0 transition-colors hover:text-primary group-hover:opacity-100"
                    >
                        <Pencil className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    );
}
