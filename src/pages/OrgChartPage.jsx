import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PremiumCard, PremiumCardContent } from "@/components/learning/PremiumCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, ChevronDown, ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/data/api";
import { normalizeSupervisor, normalizeTrainer } from "@/lib/phase-backend";

function TrainerNode({ trainer }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center" onClick={() => navigate("/trainers")} role="button" tabIndex={0}>
      <div className="bg-background border border-border/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer min-w-[160px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary border border-primary/20">
            {trainer.name.split(" ").map((name) => name[0]).join("")}
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
            <span>{trainer.studentCount || 0} learners</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SupervisorNode({ supervisor }) {
  const [expanded, setExpanded] = useState(true);
  const assignedTrainers = supervisor.trainers || [];

  return (
    <div className="flex flex-col items-center">
      <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-5 shadow-md min-w-[200px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center text-base font-bold text-primary border-2 border-primary/30">
            {supervisor.name.split(" ").map((name) => name[0]).join("")}
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{supervisor.name}</p>
            <Badge className="bg-primary/10 text-primary text-[10px] mt-1">Supervisor</Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">{supervisor.location} - {assignedTrainers.length} trainers</p>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {expanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </div>

      {expanded && assignedTrainers.length > 0 ? (
        <>
          <div className="w-px h-8 bg-border" />
          <div className="relative">
            {assignedTrainers.length > 1 ? (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border" style={{ width: `${(assignedTrainers.length - 1) * 200}px` }} />
            ) : null}
            <div className="flex gap-6 items-start">
              {assignedTrainers.map((trainer) => (
                <div key={trainer.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-border" />
                  <TrainerNode trainer={trainer} />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function OrgChartPage() {
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);

      try {
        const response = await api.orgChart.list();

        if (cancelled) {
          return;
        }

        setSupervisors(
          (response?.supervisors || []).map((supervisor) => ({
            ...normalizeSupervisor(supervisor),
            trainers: Array.isArray(supervisor?.trainers)
              ? supervisor.trainers.map((trainer) => ({
                  ...normalizeTrainer(trainer),
                  studentCount: trainer?.student_count ?? trainer?.studentCount ?? 0,
                }))
              : [],
          })),
        );
      } catch (error) {
        if (!cancelled) {
          toast.error("Failed to load organization chart");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Network className="h-6 w-6 text-primary" /> Organization Chart</h1>
          <p className="text-muted-foreground mt-1 text-sm">Supervisor to trainer hierarchy with team details</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-8">
        <div className="flex flex-col items-center gap-8 min-w-max px-8">
          <div className="bg-primary rounded-2xl px-8 py-4 text-primary-foreground shadow-lg">
            <p className="text-lg font-bold text-center">Training Management</p>
            <p className="text-xs text-center opacity-80">Organization Structure</p>
          </div>
          <div className="w-px h-8 bg-border" />

          {loading ? (
            <PremiumCard>
              <PremiumCardContent className="p-8 text-sm text-center text-muted-foreground">Loading organization chart...</PremiumCardContent>
            </PremiumCard>
          ) : (
            <div className="flex gap-16 items-start flex-wrap justify-center">
              {supervisors.map((supervisor) => (
                <SupervisorNode key={supervisor.id} supervisor={supervisor} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
