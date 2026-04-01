import { cn } from "@/lib/utils";

const statusColorMap = {
  Active: "bg-status-active/15 text-status-active border-status-active/30",
  "On Hold": "bg-status-on-hold/15 text-status-on-hold border-status-on-hold/30",
  Completed: "bg-status-completed/15 text-status-completed border-status-completed/30",
  Complete: "bg-status-completed/15 text-status-completed border-status-completed/30",
  Dropped: "bg-status-dropped/15 text-status-dropped border-status-dropped/30",
  "Not Started": "bg-status-not-started/15 text-status-not-started border-status-not-started/30",
  "In Progress": "bg-status-in-progress/15 text-status-in-progress border-status-in-progress/30",
  Present: "bg-status-active/15 text-status-active border-status-active/30",
  Absent: "bg-status-dropped/15 text-status-dropped border-status-dropped/30",
  Excused: "bg-status-on-hold/15 text-status-on-hold border-status-on-hold/30",
};

const trainerTypeMap = {
  Junior: "bg-trainer-junior/15 text-trainer-junior border-trainer-junior/30",
  Senior: "bg-trainer-senior/15 text-trainer-senior border-trainer-senior/30",
  Lead: "bg-trainer-lead/15 text-trainer-lead border-trainer-lead/30",
  Onsite: "bg-trainer-onsite/15 text-trainer-onsite border-trainer-onsite/30",
  Remote: "bg-trainer-remote/15 text-trainer-remote border-trainer-remote/30",
};

export function StatusBadge({ status, className }) {
  const colors = statusColorMap[status] || trainerTypeMap[status] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", colors, className)}>
      {status}
    </span>
  );
}
