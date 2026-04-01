import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const RATING_OPTIONS = [
  { value: "ME", label: "ME", description: "Meets Expectations", color: "bg-success/15 text-success border-success/30" },
  { value: "EE", label: "EE", description: "Exceeds Expectations", color: "bg-primary/15 text-primary border-primary/30" },
  { value: "NI", label: "NI", description: "Needs Improvement", color: "bg-warning/15 text-warning border-warning/30" },
  { value: "RF", label: "RF", description: "Risk Factor", color: "bg-destructive/15 text-destructive border-destructive/30" },
];

export function getRatingStyle(value) {
  return RATING_OPTIONS.find(o => o.value === value)?.color || "bg-muted text-muted-foreground border-border";
}

export function RatingDropdown({ value, onChange, placeholder = "Rate", className }) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-9 w-full text-xs font-bold border transition-all duration-200",
          value ? getRatingStyle(value) : "border-border/50 text-muted-foreground",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {RATING_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              <span className={cn("inline-flex h-5 w-8 items-center justify-center rounded text-[10px] font-black", opt.color)}>
                {opt.label}
              </span>
              <span className="text-xs text-muted-foreground">{opt.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
