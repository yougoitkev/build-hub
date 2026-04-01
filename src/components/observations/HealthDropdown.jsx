import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const HEALTH_OPTIONS = [
  { value: "GREEN", label: "Green", color: "bg-success/15 text-success border-success/30" },
  { value: "AMBER", label: "Amber", color: "bg-warning/15 text-warning border-warning/30" },
  { value: "RED", label: "Red", color: "bg-destructive/15 text-destructive border-destructive/30" },
];

export function getHealthStyle(value) {
  return HEALTH_OPTIONS.find(o => o.value === value)?.color || "bg-muted text-muted-foreground border-border";
}

export function HealthDropdown({ value, onChange, className }) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-9 w-full text-xs font-bold border transition-all duration-200",
          value ? getHealthStyle(value) : "border-border/50 text-muted-foreground",
          className
        )}
      >
        <SelectValue placeholder="Health" />
      </SelectTrigger>
      <SelectContent>
        {HEALTH_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-full", 
                opt.value === "GREEN" ? "bg-success" : opt.value === "AMBER" ? "bg-warning" : "bg-destructive"
              )} />
              <span className="text-xs font-semibold">{opt.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
