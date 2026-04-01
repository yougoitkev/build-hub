import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, MinusCircle, Copy, Clipboard, Save, Trash2 } from "lucide-react";
import { ATTENDANCE_VALUES } from "@/lib/tier-config";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function BulkActionsToolbar({ onBulkAction, onSave, onDiscard, hasChanges }) {
    return (
        <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-border/50 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 px-2 border-r border-border/50 mr-2">Bulk Ops</span>

                <div className="flex items-center gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold bg-success/5 border-success/20 text-success hover:bg-success/10 hover:text-success"
                        onClick={() => onBulkAction("set-value", "8")}
                    >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> All 8h
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold bg-warning/5 border-warning/20 text-warning hover:bg-warning/10 hover:text-warning"
                        onClick={() => onBulkAction("set-value", "0")}
                    >
                        <MinusCircle className="h-3.5 w-3.5 mr-1.5" /> All 0h
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold bg-destructive/5 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onBulkAction("set-value", "NCNS")}
                    >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" /> All NCNS
                    </Button>
                </div>

                <div className="h-4 w-[1px] bg-border mx-2" />

                <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => onBulkAction("copy")}>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => onBulkAction("paste")}>
                        <Clipboard className="h-3.5 w-3.5 mr-1.5" /> Paste
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {hasChanges && (
                    <span className="text-xs font-medium text-accent animate-pulse">Changes pending...</span>
                )}
                <Button variant="ghost" size="sm" onClick={onDiscard} className="h-9 hover:bg-destructive/5 hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Discard
                </Button>
                <Button onClick={onSave} size="sm" className="h-9 px-6 rounded-lg shadow-lg shadow-primary/20" disabled={!hasChanges}>
                    <Save className="h-4 w-4 mr-2" /> Save Changes
                </Button>
            </div>
        </div>
    );
}
