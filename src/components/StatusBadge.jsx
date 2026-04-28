import { cn } from "@/lib/utils";
import { getStatusBadgeClasses } from "@/lib/tms-status";

const trainerTypeMap = {
  Junior: "bg-trainer-junior/15 text-trainer-junior border-trainer-junior/30",
  Senior: "bg-trainer-senior/15 text-trainer-senior border-trainer-senior/30",
  Lead: "bg-trainer-lead/15 text-trainer-lead border-trainer-lead/30",
  Onsite: "bg-trainer-onsite/15 text-trainer-onsite border-trainer-onsite/30",
  Remote: "bg-trainer-remote/15 text-trainer-remote border-trainer-remote/30",
};

export function StatusBadge({ status, domain, className }) {
  const colors = getStatusBadgeClasses(status, domain) || trainerTypeMap[status] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center rounded-[var(--radius-field)] border px-2.5 py-0.5 text-xs font-medium", colors, className)}>
      {status}
    </span>
  );
}
