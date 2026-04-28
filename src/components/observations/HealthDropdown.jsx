import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const HEALTH_OPTIONS = [
  { value: "GREEN", label: "Green" },
  { value: "AMBER", label: "Amber" },
  { value: "RED", label: "Red" },
];

export function getHealthStyle(value) {
  return value ? "border-primary/20 bg-primary/[0.08] text-primary" : "border-border/60 bg-background text-muted-foreground";
}

export function HealthDropdown({ value, onChange, className }) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-9 w-full text-xs font-semibold transition-all duration-200",
          getHealthStyle(value),
          className
        )}
      >
        <SelectValue placeholder="Health" />
      </SelectTrigger>
      <SelectContent>
        {HEALTH_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              <span className="inline-flex min-w-[3.5rem] items-center justify-center rounded-[var(--radius-field)] border border-primary/15 bg-primary/[0.08] px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                {opt.label}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
