import { computeSummary } from "@/lib/tier-config";
import { Clock, XCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

export function StudentSummaryCard({ dayValues, className }) {
  const { totalAbsences, earlyLate, ncnsCount, hoursCompleted } = computeSummary(dayValues);

  const metrics = [
    { label: "Hours Completed", value: hoursCompleted, icon: CheckCircle2, color: "text-success" },
    { label: "Total Absences (0 hrs)", value: totalAbsences, icon: XCircle, color: "text-warning" },
    { label: "# of Leave early/ lates", value: earlyLate, icon: Clock, color: "text-info" },
    { label: "# of NCNS", value: ncnsCount, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className || ""}`}>
      {metrics.map((m) => (
        <div key={m.label} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
          <m.icon className={`h-5 w-5 ${m.color} shrink-0`} />
          <div>
            <p className="text-xl font-bold text-foreground leading-none">{m.value}</p>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{m.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
