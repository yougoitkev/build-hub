import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ATTENDANCE_VALUES } from "@/lib/tier-config";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function getCellStyle(value) {
  if (value === "NCNS") return "border-destructive/20 bg-destructive/[0.06] text-destructive";
  const num = parseInt(value, 10);
  if (num === 0) return "border-border/60 bg-secondary/80 text-muted-foreground";
  if (num >= 1 && num < 8) return "border-border/60 bg-background text-foreground";
  if (num === 8) return "border-primary/20 bg-primary/[0.08] text-primary";
  return "border-border/60 bg-background text-muted-foreground";
}

export function HoursDropdown({ value, onChange, disabled, provenance, hasOverride, className }) {
  const trigger = (
    <Select value={String(value ?? "")} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "h-8 w-[76px] text-xs font-mono font-semibold shadow-none transition-colors",
          getCellStyle(value),
          hasOverride && "ring-1 ring-primary/40 ring-offset-1",
          className
        )}
        aria-label="Select hours or NCNS"
      >
        <SelectValue placeholder="-" />
      </SelectTrigger>
      <SelectContent>
        {ATTENDANCE_VALUES.map((v) => (
          <SelectItem key={v} value={v} className="text-xs font-mono">
            {v === "NCNS" ? "NCNS" : `${v} hr${v !== "1" ? "s" : ""}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (provenance) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">
          <p>Imported from Excel (Import #{provenance.importId}, row {provenance.rowNumber})</p>
          {hasOverride && <p className="mt-1 font-semibold text-primary">Manually overridden</p>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return trigger;
}
