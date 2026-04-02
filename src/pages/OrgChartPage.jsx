import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useNavigate } from "react-router-dom";
import { PremiumCard, PremiumCardContent } from "@/components/learning/PremiumCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, ChevronDown, ChevronRight, Users, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockSupervisors } from "@/lib/phase2-mock-data";

function TrainerNode({ trainer, students }) {
  const navigate = useNavigate();
  const studentCount = students.filter((s) => s.trainerId === trainer.id).length;

  return (
    <div className="flex flex-col items-center" onClick={() => navigate(`/trainers`)} role="button" tabIndex={0}>
      <div className="bg-background border border-border/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer min-w-[160px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary border border-primary/20">
            {trainer.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{trainer.name}</p>
            <p className="text-[10px] text-muted-foreground">{trainer.role}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px]", trainer.status === "Active" ? "text-emerald-600 border-emerald-300" : "text-muted-foreground")}>
              {trainer.status}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{studentCount} learners</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SupervisorNode({ supervisor, trainers, students }) {
  const [expanded, setExpanded] = useState(true);
  const assignedTrainers = trainers.filter((t) => supervisor.trainerIds.includes(t.id));

  return (
    <div className="flex flex-col items-center">
      {/* Supervisor card */}
      <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-5 shadow-md min-w-[200px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center text-base font-bold text-primary border-2 border-primary/30">
            {supervisor.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{supervisor.name}</p>
            <Badge className="bg-primary/10 text-primary text-[10px] mt-1">Supervisor</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">{supervisor.location} • {assignedTrainers.length} trainers</p>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {expanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </div>

      {/* Connector line */}
      {expanded && assignedTrainers.length > 0 && (
        <>
          <div className="w-px h-8 bg-border" />
          <div className="relative">
            {assignedTrainers.length > 1 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border" style={{ width: `${(assignedTrainers.length - 1) * 200}px` }} />
            )}
            <div className="flex gap-6 items-start">
              {assignedTrainers.map((trainer) => (
                <div key={trainer.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-border" />
                  <TrainerNode trainer={trainer} students={students} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const trainers = useAppStore((s) => s.trainers);
  const students = useAppStore((s) => s.students);

  return (
    <div className="space-y-6 animate-fade-in max-w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Network className="h-6 w-6 text-primary" /> Organization Chart</h1>
          <p className="text-muted-foreground mt-1 text-sm">Supervisor → Trainer hierarchy with team details</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-8">
        <div className="flex flex-col items-center gap-8 min-w-max px-8">
          {/* Organization header */}
          <div className="bg-primary rounded-2xl px-8 py-4 text-primary-foreground shadow-lg">
            <p className="text-lg font-bold text-center">Training Management</p>
            <p className="text-xs text-center opacity-80">Organization Structure</p>
          </div>
          <div className="w-px h-8 bg-border" />

          {/* Supervisors */}
          <div className="flex gap-16 items-start flex-wrap justify-center">
            {mockSupervisors.map((sup) => (
              <SupervisorNode key={sup.id} supervisor={sup} trainers={trainers} students={students} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
