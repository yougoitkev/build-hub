import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { RatingDropdown } from "./RatingDropdown";
import { HealthDropdown } from "./HealthDropdown";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

function RowStatus({ row }) {
  const filled = [row.softSkills, row.technicalSkills, row.attendanceRating, row.behavior, row.learnerHealth].filter(Boolean).length;
  if (row._saved) return <Badge variant="outline" className="text-[10px] gap-1 border-success/30 text-success"><CheckCircle2 className="h-3 w-3" />Saved</Badge>;
  if (filled > 0 || row.observationText) return <Badge variant="outline" className="text-[10px] gap-1 border-warning/30 text-warning"><Clock className="h-3 w-3" />Draft</Badge>;
  return <Badge variant="outline" className="text-[10px] gap-1 border-border text-muted-foreground"><AlertCircle className="h-3 w-3" />Pending</Badge>;
}

export function ObservationMatrix({ students, observations, onFieldChange }) {
  return (
    <div className="relative border border-border/50 rounded-2xl bg-card shadow-xl shadow-foreground/5 overflow-hidden animate-fade-in">
      <div className="overflow-auto max-h-[70vh] scrollbar-thin">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-30 bg-background/95 backdrop-blur-md">
            <tr className="shadow-sm">
              <th className="sticky left-0 z-40 bg-background/95 border-b border-border/50 p-4 text-left min-w-[260px]">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Student</span>
              </th>
              {["Soft Skills", "Technical Skills", "Attendance", "Behavior"].map((col) => (
                <th key={col} className="border-b border-l border-border/10 p-3 min-w-[130px] text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{col}</span>
                </th>
              ))}
              <th className="border-b border-l border-border/10 p-3 min-w-[130px] text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Learner Health</span>
              </th>
              <th className="border-b border-l border-border/10 p-3 min-w-[280px] text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Observation</span>
              </th>
              <th className="border-b border-l border-border/10 p-3 min-w-[80px] text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Status</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {students.map((student) => {
              const row = observations[student.id] || {};
              return (
                <tr key={student.id} className="hover:bg-muted/5 group transition-colors">
                  {/* Student info - sticky */}
                  <td className="sticky left-0 z-20 bg-background/95 group-hover:bg-muted/10 transition-colors border-r border-border/10 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border-2 border-primary/10 shadow-sm">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.id}`} />
                        <AvatarFallback className="text-[10px] font-bold">{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors cursor-pointer">
                          {student.firstName} {student.lastName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted/50 px-1.5 rounded uppercase tracking-wider">
                            {student.empId}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground">{student.language}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Rating dropdowns */}
                  <td className="border-l border-border/10 p-2">
                    <RatingDropdown value={row.softSkills} onChange={(v) => onFieldChange(student.id, "softSkills", v)} placeholder="Soft" />
                  </td>
                  <td className="border-l border-border/10 p-2">
                    <RatingDropdown value={row.technicalSkills} onChange={(v) => onFieldChange(student.id, "technicalSkills", v)} placeholder="Tech" />
                  </td>
                  <td className="border-l border-border/10 p-2">
                    <RatingDropdown value={row.attendanceRating} onChange={(v) => onFieldChange(student.id, "attendanceRating", v)} placeholder="Attend" />
                  </td>
                  <td className="border-l border-border/10 p-2">
                    <RatingDropdown value={row.behavior} onChange={(v) => onFieldChange(student.id, "behavior", v)} placeholder="Behavior" />
                  </td>

                  {/* Learner Health */}
                  <td className="border-l border-border/10 p-2">
                    <HealthDropdown value={row.learnerHealth} onChange={(v) => onFieldChange(student.id, "learnerHealth", v)} />
                  </td>

                  {/* Observation text */}
                  <td className="border-l border-border/10 p-2">
                    <Textarea
                      value={row.observationText || ""}
                      onChange={(e) => onFieldChange(student.id, "observationText", e.target.value)}
                      placeholder="Enter detailed daily observation for this learner..."
                      rows={2}
                      className="min-h-[60px] text-xs resize-y border-border/50"
                    />
                  </td>

                  {/* Status */}
                  <td className="border-l border-border/10 p-2 text-center">
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
