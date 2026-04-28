import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, MinusCircle, Copy, Clipboard, Save, Trash2 } from "lucide-react";

export function BulkActionsToolbar({ onBulkAction, onSave, onDiscard, hasChanges }) {
    return (
        <div className="surface-shell flex flex-wrap items-center justify-between gap-3 p-3 animate-in slide-in-from-top-2 duration-300">
            <div className="flex flex-wrap items-center gap-3">
                <span className="section-kicker mr-1 border-r border-border/50 px-2">Bulk Ops</span>

                <div className="flex items-center gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-primary/15 bg-primary/[0.08] text-xs font-semibold text-primary hover:bg-primary/[0.12] hover:text-primary"
                        onClick={() => onBulkAction("set-value", "8")}
                    >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> All 8h
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold"
                        onClick={() => onBulkAction("set-value", "0")}
                    >
                        <MinusCircle className="mr-1.5 h-3.5 w-3.5" /> All 0h
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold"
                        onClick={() => onBulkAction("set-value", "NCNS")}
                    >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" /> All NCNS
                    </Button>
                </div>

                <div className="mx-2 h-4 w-px bg-border" />

                <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onBulkAction("copy")}>
                        <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onBulkAction("paste")}>
                        <Clipboard className="mr-1.5 h-3.5 w-3.5" /> Paste
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {hasChanges && (
                    <span className="animate-pulse text-xs font-medium text-primary">Changes pending...</span>
                )}
                <Button variant="ghost" size="sm" onClick={onDiscard} className="h-9">
                    <Trash2 className="mr-2 h-4 w-4" /> Discard
                </Button>
                <Button onClick={onSave} size="sm" className="h-9 px-5" disabled={!hasChanges}>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
            </div>
        </div>
    );
}
