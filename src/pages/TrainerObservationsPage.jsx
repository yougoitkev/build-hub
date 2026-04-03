import { useState, useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { PremiumCard, PremiumCardContent } from "@/components/learning/PremiumCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Star, Send, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OBSERVATION_CATEGORIES } from "@/lib/phase2-mock-data";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";

export default function TrainerObservationsPage() {
  const trainers = useAppStore((s) => s.trainers);
  const trainerObservations = useAppStore((s) => s.trainerObservations || []);
  const addTrainerObservation = useAppStore((s) => s.addTrainerObservation);

  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [ratings, setRatings] = useState(Object.fromEntries(OBSERVATION_CATEGORIES.map((c) => [c, 5])));
  const [comments, setComments] = useState(Object.fromEntries(OBSERVATION_CATEGORIES.map((c) => [c, ""])));

  const trainer = trainers.find((t) => t.id === selectedTrainer);
  const trainerObs = useMemo(() => trainerObservations.filter((o) => o.trainerId === selectedTrainer).sort((a, b) => b.date.localeCompare(a.date)), [trainerObservations, selectedTrainer]);

  const radarData = useMemo(() => {
    if (!trainerObs.length) return [];
    return OBSERVATION_CATEGORIES.map((cat) => {
      const scores = trainerObs.map((o) => o.ratings[cat]).filter(Boolean);
      return { category: cat, score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0, fullMark: 10 };
    });
  }, [trainerObs]);

  const handleSubmit = () => {
    if (!selectedTrainer) { toast.error("Select a trainer first."); return; }
    addTrainerObservation({
      id: `tobs-${Date.now()}`,
      trainerId: selectedTrainer,
      trainerName: trainer?.name || "",
      supervisorId: "current",
      supervisorName: "Current Supervisor",
      date: format(new Date(), "yyyy-MM-dd"),
      ratings: { ...ratings },
      comments: { ...comments },
    });
    setRatings(Object.fromEntries(OBSERVATION_CATEGORIES.map((c) => [c, 5])));
    setComments(Object.fromEntries(OBSERVATION_CATEGORIES.map((c) => [c, ""])));
    toast.success("Observation submitted!");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Eye className="h-6 w-6 text-primary" /> Trainer Observation Survey</h1>
          <p className="text-muted-foreground mt-1 text-sm">Evaluate trainer performance across key categories</p>
        </div>
        <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
          <SelectTrigger className="w-[220px] bg-background rounded-full"><SelectValue placeholder="Select Trainer" /></SelectTrigger>
          <SelectContent>
            {trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedTrainer && (
        <Tabs defaultValue="survey" className="space-y-4">
          <TabsList className="bg-muted/50 rounded-full p-1">
            <TabsTrigger value="survey" className="rounded-full gap-1"><Star className="h-3.5 w-3.5" /> New Survey</TabsTrigger>
            <TabsTrigger value="history" className="rounded-full gap-1"><Eye className="h-3.5 w-3.5" /> History ({trainerObs.length})</TabsTrigger>
            <TabsTrigger value="summary" className="rounded-full gap-1"><BarChart3 className="h-3.5 w-3.5" /> Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="survey" className="space-y-4">
            <PremiumCard>
              <PremiumCardContent className="p-6 space-y-6">
                <p className="text-sm text-muted-foreground">Rating scale: 1 (Poor) – 10 (Excellent)</p>
                {OBSERVATION_CATEGORIES.map((cat) => (
                  <div key={cat} className="space-y-2 pb-4 border-b border-border/50 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{cat}</span>
                      <Badge variant="outline" className="font-bold text-primary">{ratings[cat]}/10</Badge>
                    </div>
                    <Slider value={[ratings[cat]]} onValueChange={([v]) => setRatings((r) => ({ ...r, [cat]: v }))} min={1} max={10} step={1} className="w-full" />
                    <Textarea placeholder={`Comments on ${cat}...`} value={comments[cat]} onChange={(e) => setComments((c) => ({ ...c, [cat]: e.target.value }))} className="min-h-[60px] text-sm" />
                  </div>
                ))}
                <Button onClick={handleSubmit} className="w-full rounded-full gap-2"><Send className="h-4 w-4" /> Submit Observation</Button>
              </PremiumCardContent>
            </PremiumCard>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {trainerObs.length === 0 && <p className="text-center text-muted-foreground py-12">No observation records yet.</p>}
            {trainerObs.map((obs) => (
              <PremiumCard key={obs.id}>
                <PremiumCardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold">{format(new Date(obs.date), "MMM d, yyyy")}</span>
                    <span className="text-xs text-muted-foreground">by {obs.supervisorName}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {OBSERVATION_CATEGORIES.map((cat) => (
                      <div key={cat} className="text-center p-2 rounded-lg bg-muted/30">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{cat}</p>
                        <p className="text-lg font-bold text-primary">{obs.ratings[cat]}/10</p>
                        {obs.comments[cat] && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{obs.comments[cat]}</p>}
                      </div>
                    ))}
                  </div>
                </PremiumCardContent>
              </PremiumCard>
            ))}
          </TabsContent>

          <TabsContent value="summary">
            <PremiumCard>
              <PremiumCardContent className="p-6">
                {radarData.length > 0 ? (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
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
      )}

      {!selectedTrainer && (
        <div className="py-20 text-center text-muted-foreground">
          <Eye className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-bold text-foreground mb-1">Select a Trainer</p>
          <p className="text-sm">Choose a trainer from the dropdown to begin an observation survey.</p>
        </div>
      )}
    </div>
  );
}
