import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ATTENDANCE_VALUES } from "@/lib/tier-config";
import { AlertTriangle } from "lucide-react";

export function OverrideModal({ open, onOpenChange, currentValue, studentName, dayLabel, onConfirm }) {
  const [newValue, setNewValue] = useState(currentValue || "");
  const [reason, setReason] = useState("");

  useEffect(() => {
    setNewValue(currentValue || "");
  }, [currentValue, open]);

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(newValue, reason.trim());
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Override Attendance Value
          </DialogTitle>
          <DialogDescription>
            You are overriding an imported value for <strong>{studentName}</strong> - <strong>{dayLabel}</strong>.
            Please provide a reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Current Value</label>
            <div className="surface-field flex h-9 items-center px-3 text-sm font-mono">
              {currentValue || "-"}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">New Value</label>
            <Select value={newValue} onValueChange={setNewValue}>
              <SelectTrigger className="font-mono">
                <SelectValue placeholder="Select hours or NCNS" />
              </SelectTrigger>
              <SelectContent>
                {ATTENDANCE_VALUES.map((v) => (
                  <SelectItem key={v} value={v} className="font-mono">
                    {v === "NCNS" ? "NCNS" : `${v} hr${v !== "1" ? "s" : ""}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Override Reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you're changing this value (required)..."
              className="min-h-[80px]"
            />
            {reason.trim() === "" && (
              <p className="mt-1 text-xs text-muted-foreground">A valid reason is required to persist this change.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!reason.trim() || newValue === currentValue}>
            Confirm Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
