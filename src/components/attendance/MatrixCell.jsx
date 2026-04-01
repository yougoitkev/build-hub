import { useState } from "react";
import { HoursDropdown } from "./HoursDropdown";
import { MessageSquare, Pencil, History, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    const [isEditingRemarks, setIsEditingRemarks] = useState(false);

    return (
        <div className="flex flex-col gap-1.5 p-2 min-w-[120px] transition-colors hover:bg-muted/30 group">
            <div className="flex items-center gap-2">
                <HoursDropdown
                    value={value}
                    onChange={(val) => onValueChange(studentId, dayNum, val)}
                    provenance={provenance}
                    hasOverride={hasOverride}
                    className="h-9 w-full"
                />
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
                {remarks ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-help bg-muted/40 px-2 py-0.5 rounded truncate max-w-full">
                                <MessageSquare className="h-3 w-3 shrink-0" />
                                <span className="truncate">{remarks}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px] text-xs">
                            <p className="font-bold mb-1">Remarks:</p>
                            <p>{remarks}</p>
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <button
                        onClick={() => onRemarksEdit(studentId, dayNum)}
                        className="text-[10px] text-muted-foreground/40 hover:text-primary flex items-center gap-1 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Pencil className="h-3 w-3" />
                        <span>Add remarks</span>
                    </button>
                )}

                {remarks && (
                    <button
                        onClick={() => onRemarksEdit(studentId, dayNum)}
                        className="text-muted-foreground/40 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Pencil className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    );
}
