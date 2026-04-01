import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ATTENDANCE_VALUES } from "@/lib/tier-config";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function getCellStyle(value) {
  if (value === "NCNS") return "bg-destructive/10 text-destructive border-destructive/30";
  const num = parseInt(value);
  if (num === 0) return "bg-warning/10 text-warning border-warning/30";
  if (num >= 1 && num < 8) return "bg-info/10 text-info border-info/30";
  if (num === 8) return "bg-success/10 text-success border-success/30";
  return "";
}

export function HoursDropdown({ value, onChange, disabled, provenance, hasOverride, className }) {
  const trigger = (
    <Select value={String(value ?? "")} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "h-8 w-[76px] text-xs font-mono font-semibold border transition-colors",
          getCellStyle(value),
          hasOverride && "ring-1 ring-accent ring-offset-1",
          className
        )}
        aria-label="Select hours or NCNS"
      >
        <SelectValue placeholder="—" />
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
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          <p>Imported from Excel (Import #{provenance.importId}, row {provenance.rowNumber})</p>
          {hasOverride && <p className="text-accent mt-1 font-semibold">Manually overridden</p>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return trigger;
}
