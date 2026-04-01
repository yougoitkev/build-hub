import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { TrendingUp, Users, AlertTriangle, CheckCircle2, Award, Target, Milestone, UserSearch } from "lucide-react";

export default function ProgressPage() {
  const students = useAppStore((s) => s.students);
  const progress = useAppStore((s) => s.progress);
  const observations = useAppStore((s) => s.observations);
  const attendance = useAppStore((s) => s.attendance);
  const [selectedStudent, setSelectedStudent] = useState("");

  const student = students.find((s) => s.id === selectedStudent);
  const studentProgress = progress.filter((p) => p.studentId === selectedStudent);
  const studentObs = observations.filter((o) => o.studentId === selectedStudent);
  const studentAtt = attendance.filter((a) => a.studentId === selectedStudent);
  const attendanceRate = studentAtt.length > 0
    ? Math.round((studentAtt.filter((a) => a.status === "Present").length / studentAtt.length) * 100) : 0;

  const levelCounts = {
    l1Complete: students.filter((s) => s.level1 === "Complete").length,
    l1InProgress: students.filter((s) => s.level1 === "In Progress").length,
    l2Complete: students.filter((s) => s.level2 === "Complete").length,
    l3Complete: students.filter((s) => s.level3 === "Complete").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Training Progress</h1>
        <p className="text-muted-foreground">Track student level progression and milestones</p>
      </div>

      {/* Dashboard cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <PremiumCard className="overflow-hidden border-border/50 bg-gradient-to-br from-card to-card hover:border-status-in-progress/30 transition-colors">
          <PremiumCardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-status-in-progress/10 text-status-in-progress shadow-inner">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{levelCounts.l1InProgress}</p>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">L1 Active</p>
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard className="overflow-hidden border-border/50 bg-gradient-to-br from-card to-card hover:border-status-completed/30 transition-colors">
          <PremiumCardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-status-completed/10 text-status-completed shadow-inner">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{levelCounts.l1Complete}</p>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">L1 Graduated</p>
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard className="overflow-hidden border-border/50 bg-gradient-to-br from-card to-card hover:border-primary/30 transition-colors">
          <PremiumCardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{levelCounts.l2Complete}</p>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">L2 Certified</p>
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard className="overflow-hidden border-border/50 bg-gradient-to-br from-card to-card hover:border-warning/30 transition-colors">
          <PremiumCardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-warning/10 text-warning shadow-inner">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{students.filter((s) => s.status === "Active" && s.level1 !== "Complete").length}</p>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">At Risk</p>
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <PremiumCard>
            <PremiumCardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <PremiumCardTitle className="text-lg flex items-center gap-2">
                <UserSearch className="h-5 w-5 text-primary" /> Student Lookup
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold mb-2 block text-foreground/80">Select Learner</label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger className="h-12 bg-background"><SelectValue placeholder="Search by name..." /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {student && (
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <div className="p-4 rounded-xl border border-border/50 bg-muted/10">
                      <p className="text-lg font-bold text-foreground">{student.firstName} {student.lastName}</p>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">{student.empId} · RM {student.location}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl border border-border/50 bg-card text-center shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground mb-2">Level 1</p>
                        <StatusBadge status={student.level1} />
                      </div>
                      <div className="p-3 rounded-xl border border-border/50 bg-card text-center shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground mb-2">Level 2</p>
                        <StatusBadge status={student.level2} />
                      </div>
                      <div className="p-3 rounded-xl border border-border/50 bg-card text-center shadow-sm">
                        <p className="text-xs font-bold text-muted-foreground mb-2">Level 3</p>
                        <StatusBadge status={student.level3} />
                      </div>
                    </div>

                    <div className="p-5 rounded-xl border border-border/50 bg-primary/5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-primary/80">Attendance Rate</p>
                        <p className="text-xs font-medium text-muted-foreground mt-0.5">Overall presence</p>
                      </div>
                      <p className="text-3xl font-bold tracking-tight text-primary">{attendanceRate}%</p>
                    </div>
                  </div>
                )}
              </div>
            </PremiumCardContent>
          </PremiumCard>
        </div>

        <div className="lg:col-span-2">
          <PremiumCard className="h-full">
            <PremiumCardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <PremiumCardTitle className="text-lg flex items-center gap-2">
                <Milestone className="h-5 w-5 text-primary" />
                {student ? `Timeline — ${student.firstName} ${student.lastName}` : "Progress Timeline"}
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="p-6 md:p-8">
              {!selectedStudent ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Target className="h-16 w-16 mx-auto mb-4 opacity-10 text-primary" />
                  <p className="text-xl font-bold text-foreground mb-2">No Learner Selected</p>
                  <p className="text-sm">Select a student from the lookup to view their detailed progression timeline and milestones.</p>
                </div>
              ) : studentProgress.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Milestone className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="font-semibold text-foreground">No milestone entries found</p>
                </div>
              ) : (
                <div className="relative pl-2 md:pl-4">
                  {/* Vertical line */}
                  <div className="absolute left-[15px] md:left-[23px] top-4 bottom-4 w-[2px] bg-border/80" />

                  <div className="space-y-8">
                    {studentProgress.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((entry, idx) => (
                      <div key={entry.id} className="relative pl-10 md:pl-14 transition-all duration-300 hover:translate-x-1">
                        {/* Timeline dot */}
                        <div className={`absolute left-0 top-1.5 h-8 w-8 rounded-full border-[3px] flex items-center justify-center bg-card
                                ${idx === 0 ? 'border-primary text-primary' : 'border-border/80 text-muted-foreground'}`}>
                          <div className={`h-2.5 w-2.5 rounded-full ${idx === 0 ? 'bg-primary' : 'bg-transparent'}`} />
                        </div>

                        <div className={`p-5 rounded-2xl border transition-shadow ${idx === 0 ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-border/50 bg-card hover:border-primary/20 hover:shadow-sm'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-3">
                              <h4 className="font-bold text-base text-foreground">{entry.level}</h4>
                              <StatusBadge status={entry.status} />
                            </div>
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider bg-background px-2.5 py-1 rounded-md border border-border/50">{entry.date}</span>
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed">{entry.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </PremiumCardContent>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}
