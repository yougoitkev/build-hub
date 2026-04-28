import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const RATING_OPTIONS = [
  { value: "ME", label: "ME", description: "Meets Expectations" },
  { value: "EE", label: "EE", description: "Exceeds Expectations" },
  { value: "NI", label: "NI", description: "Needs Improvement" },
  { value: "RF", label: "RF", description: "Risk Factor" },
];

export function getRatingStyle(value) {
  return value ? "border-primary/20 bg-primary/[0.08] text-primary" : "border-border/60 bg-background text-muted-foreground";
}

export function RatingDropdown({ value, onChange, placeholder = "Rate", className }) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-9 w-full text-xs font-semibold transition-all duration-200",
          getRatingStyle(value),
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {RATING_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 min-w-[2rem] items-center justify-center rounded-[var(--radius-field)] border border-primary/15 bg-primary/[0.08] px-1.5 text-[10px] font-black text-primary">
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
