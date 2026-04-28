import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { PremiumCard, PremiumCardContent } from "@/components/learning/PremiumCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Star, Send, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { OBSERVATION_CATEGORIES } from "@/lib/phase2-mock-data";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";
import { api } from "@/data/api";
import {
  normalizeSupervisor,
  normalizeTrainer,
  normalizeTrainerObservation,
  normalizeTrainerObservationSummary,
  resolveSupervisorForUser,
  toApiId,
} from "@/lib/phase-backend";
import { deriveObservationPerformanceStatus, normalizeObservationScore } from "@/lib/tms-status";
import { StatusBadge } from "@/components/StatusBadge";

const buildDefaultRatings = () => Object.fromEntries(OBSERVATION_CATEGORIES.map((category) => [category, 5]));
const buildDefaultComments = () => Object.fromEntries(OBSERVATION_CATEGORIES.map((category) => [category, ""]));

export default function TrainerObservationsPage() {
  const user = useAppStore((state) => state.user);
  const [trainers, setTrainers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [trainerObservations, setTrainerObservations] = useState([]);
  const [observationSummary, setObservationSummary] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [ratings, setRatings] = useState(buildDefaultRatings);
  const [comments, setComments] = useState(buildDefaultComments);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);

      try {
        const [trainerResponse, supervisorResponse, observationsResponse, summaryResponse] = await Promise.all([
          api.trainers.list(),
          api.supervisors.list(),
          api.trainerObservations.list(),
          api.trainerObservations.summary(),
        ]);

        if (cancelled) {
          return;
        }

        setTrainers((trainerResponse?.trainers || []).map(normalizeTrainer));
        setSupervisors((supervisorResponse?.supervisors || []).map(normalizeSupervisor));
        setTrainerObservations((observationsResponse?.observations || []).map(normalizeTrainerObservation));
        setObservationSummary((summaryResponse?.summary || []).map(normalizeTrainerObservationSummary));
      } catch (error) {
        if (!cancelled) {
          toast.error("Failed to load trainer observations");
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

  const trainer = trainers.find((item) => item.id === selectedTrainer);
  const selectedSummary = observationSummary.find((item) => item.trainerId === selectedTrainer);
  const currentSupervisor = useMemo(() => resolveSupervisorForUser(supervisors, user), [supervisors, user]);

  const trainerObs = useMemo(
    () => trainerObservations.filter((observation) => observation.trainerId === selectedTrainer).sort((left, right) => right.date.localeCompare(left.date)),
    [selectedTrainer, trainerObservations],
  );

  const radarData = useMemo(() => {
    if (!trainerObs.length) {
      return [];
    }

    return OBSERVATION_CATEGORIES.map((category) => {
      const scores = trainerObs
        .map((observation) => observation.ratings[category])
        .filter((score) => score !== undefined && score !== null)
        .map(normalizeObservationScore);
      return {
        category,
        score: scores.length ? Math.round((scores.reduce((total, score) => total + score, 0) / scores.length) * 10) / 10 : 0,
        fullMark: 5,
      };
    });
  }, [trainerObs]);

  const selectedAverage = normalizeObservationScore(selectedSummary?.averageRating || 0);
  const selectedAverageStatus = deriveObservationPerformanceStatus(selectedAverage);

  const loadObservationsForTrainer = async (trainerId) => {
    const [observationsResponse, summaryResponse] = await Promise.all([
      api.trainerObservations.list({ trainer_id: toApiId(trainerId) }, { cache: false }),
      api.trainerObservations.summary({ trainer_id: toApiId(trainerId) }, { cache: false }),
    ]);

    setTrainerObservations((current) => {
      const other = current.filter((observation) => observation.trainerId !== trainerId);
      return [...other, ...(observationsResponse?.observations || []).map(normalizeTrainerObservation)];
    });

    setObservationSummary((current) => {
      const other = current.filter((summary) => summary.trainerId !== trainerId);
      return [...other, ...(summaryResponse?.summary || []).map(normalizeTrainerObservationSummary)];
    });
  };

  const handleSubmit = async () => {
    if (!selectedTrainer) {
      toast.error("Select a trainer first.");
      return;
    }

    if (!currentSupervisor) {
      toast.error("No supervisor profile is available for this account.");
      return;
    }

    setSubmitting(true);

    try {
      await api.trainerObservations.create({
        trainer_id: toApiId(selectedTrainer),
        supervisor_id: toApiId(currentSupervisor.backendId),
        date: format(new Date(), "yyyy-MM-dd"),
        ratings: { ...ratings },
        comments: { ...comments },
      });

      await loadObservationsForTrainer(selectedTrainer);
      setRatings(buildDefaultRatings());
      setComments(buildDefaultComments());
      toast.success("Observation submitted");
    } catch (error) {
      toast.error("Failed to submit observation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <PageHeader
        icon={Eye}
        eyebrow="Quality"
        title="Trainer Observation Survey"
        description="Evaluate trainer performance across key categories and keep monthly scorecards visible."
        actions={
          <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
            <SelectTrigger className="h-11 w-[220px] bg-background"><SelectValue placeholder="Select Trainer" /></SelectTrigger>
            <SelectContent>
              {trainers.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Loading trainer observations...</div>
      ) : selectedTrainer ? (
        <Tabs defaultValue="survey" className="space-y-4">
          <TabsList className="w-fit">
            <TabsTrigger value="survey" className="gap-1.5"><Star className="h-3.5 w-3.5" /> New Survey</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> History ({trainerObs.length})</TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="survey" className="space-y-4">
            <PremiumCard>
              <PremiumCardContent className="p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Rating scale: 1 (Poor) - 5 (Excellent). Target score: 4.0 / 5.0.</p>
                  <StatusBadge status="On Track" domain="performance" />
                </div>
                {OBSERVATION_CATEGORIES.map((category) => (
                  <div key={category} className="space-y-2 pb-4 border-b border-border/50 last:border-0">
                    <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{category}</span>
                      <Badge variant="outline" className="border-primary/15 bg-primary/[0.08] font-bold text-primary">{ratings[category]}/5</Badge>
                    </div>
                    <Slider value={[ratings[category]]} onValueChange={([value]) => setRatings((current) => ({ ...current, [category]: value }))} min={1} max={5} step={1} className="w-full" />
                    <Textarea placeholder={`Comments on ${category}...`} value={comments[category]} onChange={(event) => setComments((current) => ({ ...current, [category]: event.target.value }))} className="min-h-[60px] text-sm" />
                  </div>
                ))}
                <Button onClick={handleSubmit} className="w-full gap-2" disabled={submitting}>
                  <Send className="h-4 w-4" /> {submitting ? "Submitting..." : "Submit Observation"}
                </Button>
              </PremiumCardContent>
            </PremiumCard>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {trainerObs.length === 0 && <p className="text-center text-muted-foreground py-12">No observation records yet.</p>}
            {trainerObs.map((observation) => (
              <PremiumCard key={observation.id}>
                <PremiumCardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold">{format(new Date(observation.date), "MMM d, yyyy")}</span>
                    <span className="text-xs text-muted-foreground">by {observation.supervisorName}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {OBSERVATION_CATEGORIES.map((category) => (
                      <div key={category} className="surface-panel p-2 text-center">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{category}</p>
                        <p className="text-lg font-bold text-primary">{normalizeObservationScore(observation.ratings[category] || 0)}/5</p>
                        {observation.comments[category] && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{observation.comments[category]}</p>}
                      </div>
                    ))}
                  </div>
                </PremiumCardContent>
              </PremiumCard>
            ))}
          </TabsContent>

          <TabsContent value="summary">
            <PremiumCard>
              <PremiumCardContent className="p-6 space-y-6">
                {selectedSummary ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="surface-panel p-4">
                      <p className="text-xs text-muted-foreground">Trainer</p>
                      <p className="text-sm font-bold">{selectedSummary.trainerName}</p>
                    </div>
                    <div className="surface-panel p-4">
                      <p className="text-xs text-muted-foreground">Observations</p>
                      <p className="text-sm font-bold">{selectedSummary.observationCount}</p>
                    </div>
                    <div className="surface-panel p-4">
                      <p className="text-xs text-muted-foreground">Average Rating</p>
                      <p className="text-sm font-bold">{selectedAverage.toFixed(1)}/5</p>
                    </div>
                    <div className="surface-panel p-4">
                      <p className="text-xs text-muted-foreground">Latest</p>
                      <p className="text-sm font-bold">{selectedSummary.latestObservationDate || "-"}</p>
                    </div>
                  </div>
                ) : null}

                {selectedSummary ? (
                  <div className="surface-shell-soft flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Observation Threshold</p>
                      <p className="text-xs text-muted-foreground">Client target is 80% or higher across the standardized 1-5 score scale.</p>
                    </div>
                    <StatusBadge status={selectedAverageStatus} domain="performance" />
                  </div>
                ) : null}

                {radarData.length > 0 ? (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                        <Radar name={trainer?.name} dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-12">No data to display. Submit observations first.</p>
                )}
              </PremiumCardContent>
            </PremiumCard>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="surface-shell py-20 text-center text-muted-foreground">
          <Eye className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-bold text-foreground mb-1">Select a Trainer</p>
          <p className="text-sm">Choose a trainer from the dropdown to begin an observation survey.</p>
        </div>
      )}
    </div>
  );
}
