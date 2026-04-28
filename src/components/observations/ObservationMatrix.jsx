import { StudentAvatar } from "@/components/StudentAvatar";
import { Textarea } from "@/components/ui/textarea";
import { RatingDropdown } from "./RatingDropdown";
import { HealthDropdown } from "./HealthDropdown";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CircleDashed, Clock3 } from "lucide-react";

function RowStatus({ row }) {
  const filled = [row.softSkills, row.technicalSkills, row.attendanceRating, row.behavior, row.learnerHealth].filter(Boolean).length;
  if (row._saved) {
    return (
      <Badge variant="outline" className="gap-1 border-primary/15 bg-primary/[0.08] text-[10px] text-primary">
        <CheckCircle2 className="h-3 w-3 text-primary" />
        Saved
      </Badge>
    );
  }
  if (filled > 0 || row.observationText) {
    return (
      <Badge variant="outline" className="gap-1 border-border/60 bg-secondary/70 text-[10px] text-foreground">
        <Clock3 className="h-3 w-3 text-muted-foreground" />
        In Progress
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-border/60 bg-background/80 text-[10px] text-muted-foreground">
      <CircleDashed className="h-3 w-3 text-muted-foreground" />
      Pending
    </Badge>
  );
}

export function ObservationMatrix({ students, observations, onFieldChange }) {
  return (
    <div className="table-shell relative animate-fade-in">
      <div className="overflow-auto max-h-[70vh] scrollbar-thin">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-30 bg-card/95 backdrop-blur-md">
            <tr className="shadow-sm">
              <th className="sticky left-0 z-40 min-w-[260px] border-b border-border/50 bg-card/95 p-4 text-left">
                <span className="section-kicker text-muted-foreground/80">Student</span>
              </th>
              {["Soft Skills", "Technical Skills", "Attendance", "Behavior"].map((col) => (
                <th key={col} className="border-b border-l border-border/10 p-3 min-w-[130px] text-center">
                  <span className="section-kicker text-muted-foreground/80">{col}</span>
                </th>
              ))}
              <th className="border-b border-l border-border/10 p-3 min-w-[130px] text-center">
                <span className="section-kicker text-muted-foreground/80">Learner Health</span>
              </th>
              <th className="border-b border-l border-border/10 p-3 min-w-[280px] text-center">
                <span className="section-kicker text-muted-foreground/80">Observation</span>
              </th>
              <th className="border-b border-l border-border/10 p-3 min-w-[80px] text-center">
                <span className="section-kicker text-muted-foreground/80">Status</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {students.map((student) => {
              const row = observations[student.id] || {};
              return (
                <tr key={student.id} className="group transition-colors hover:bg-secondary/40">
                  <td className="sticky left-0 z-20 border-r border-border/10 bg-card/95 p-4 transition-colors group-hover:bg-secondary/45">
                    <div className="flex items-center gap-3">
                      <StudentAvatar 
                        firstName={student.firstName} 
                        lastName={student.lastName} 
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">
                          {student.firstName} {student.lastName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="rounded-[var(--radius-field)] border border-border/60 bg-muted/70 px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider text-muted-foreground">
                            {student.empId}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground">{student.language}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="border-l border-border/10 p-3">
                    <RatingDropdown value={row.softSkills} onChange={(v) => onFieldChange(student.id, "softSkills", v)} placeholder="Soft" />
                  </td>
                  <td className="border-l border-border/10 p-3">
                    <RatingDropdown value={row.technicalSkills} onChange={(v) => onFieldChange(student.id, "technicalSkills", v)} placeholder="Tech" />
                  </td>
                  <td className="border-l border-border/10 p-3">
                    <RatingDropdown value={row.attendanceRating} onChange={(v) => onFieldChange(student.id, "attendanceRating", v)} placeholder="Attend" />
                  </td>
                  <td className="border-l border-border/10 p-3">
                    <RatingDropdown value={row.behavior} onChange={(v) => onFieldChange(student.id, "behavior", v)} placeholder="Behavior" />
                  </td>

                  <td className="border-l border-border/10 p-3">
                    <HealthDropdown value={row.learnerHealth} onChange={(v) => onFieldChange(student.id, "learnerHealth", v)} />
                  </td>

                  <td className="border-l border-border/10 p-3">
                    <Textarea
                      value={row.observationText || ""}
                      onChange={(e) => onFieldChange(student.id, "observationText", e.target.value)}
                      placeholder="Enter detailed daily observation for this learner..."
                      rows={2}
                      className="min-h-[72px] resize-y text-xs"
                    />
                  </td>

                  <td className="border-l border-border/10 p-3 text-center">
                    <RowStatus row={row} />
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-16 text-muted-foreground">
                  <p className="text-sm font-medium">No students found for the selected filters.</p>
                  <p className="text-xs mt-1">Select a date and training to load the roster.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
