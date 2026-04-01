import { useEffect, useState } from "react";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Activity, Target } from "lucide-react";
import { api } from "@/data/api";
import { toast } from "sonner";

export default function TrainersPage() {
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [remoteTrainers, setRemoteTrainers] = useState([]);
  const [options, setOptions] = useState({ trainerTypes: [] });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    const mapTrainerRecord = (trainer) => ({
      id: String(trainer.id),
      firstName: trainer.first_name || trainer.firstName || "",
      lastName: trainer.last_name || trainer.lastName || "",
      portalId: trainer.portalid || trainer.portalId || "",
      email: trainer.emailid || trainer.email || "",
      role: trainer.role || "",
      status: trainer.status || "Active",
      leader: trainer.leader || "No",
      supervisor: trainer.supervisor || "",
      name:
        trainer.full_name ||
        trainer.name ||
        `${trainer.first_name || trainer.firstName || ""} ${trainer.last_name || trainer.lastName || ""}`.trim(),
      type: trainer.type || (trainer.role?.includes("Lead") ? "Lead" : trainer.role?.includes("Senior") ? "Senior" : "Junior"),
      location: trainer.location || "TBD",
      language: trainer.language || "English",
      studentCount: trainer.studentCount || 0,
      avgAttendance: trainer.avgAttendance || 0,
      avgProgress: trainer.avgProgress || 0,
    });

    const loadTrainers = async () => {
      try {
        if (isMounted) {
          setIsLoadingData(true);
          setFetchError(false);
        }

        const [optionsResponse, response] = await Promise.all([
          api.options.get(),
          api.trainers.list(),
        ]);
        const trainerList = Array.isArray(response?.trainers) ? response.trainers.map(mapTrainerRecord) : [];
        if (isMounted) {
          setOptions({
            trainerTypes: Array.isArray(optionsResponse?.trainerTypes) ? optionsResponse.trainerTypes : [],
          });
          setRemoteTrainers(trainerList);
          setIsLoadingData(false);
        }
      } catch (error) {
        if (isMounted) {
          setRemoteTrainers([]);
          setFetchError(true);
          setIsLoadingData(false);
        }
        toast.error(error?.message || "Failed to load trainers.");
      }
    };

    loadTrainers();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayedTrainers = remoteTrainers;

  const filtered = displayedTrainers.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || String(t.location || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || t.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Training Faciliators
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{displayedTrainers.length} active trainers available for placement</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search trainers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11 bg-background rounded-full border-border/50" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px] h-11 bg-background rounded-full border-border/50"><SelectValue placeholder="Specialty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              {options.trainerTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoadingData && (
        <p className="text-sm text-muted-foreground">Loading data...</p>
      )}
      {!isLoadingData && fetchError && (
        <p className="text-sm text-destructive">Error in fetching data</p>
      )}

      {!isLoadingData && !fetchError && (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((trainer) => (
          <PremiumCard key={trainer.id} className="hover:shadow-lg transition-all duration-300 flex flex-col hover:-translate-y-1">
            <PremiumCardContent className="p-6 flex-1 flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-lg font-bold text-primary shadow-inner border border-primary/10 shrink-0">
                  {trainer.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="font-bold text-lg text-foreground truncate">{trainer.name}</p>
                  <p className="text-xs font-medium text-muted-foreground truncate mb-2">{trainer.email}</p>
                  <StatusBadge status={trainer.type} />
                </div>
              </div>

              <div className="mt-auto grid grid-cols-3 gap-3 pt-5 border-t border-border/50 text-center">
                <div className="flex flex-col items-center p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <Users className="h-4 w-4 text-primary/60 mb-1.5" />
                  <p className="text-xl font-bold text-foreground">{trainer.studentCount}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Learners</p>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <Activity className="h-4 w-4 text-primary/60 mb-1.5" />
                  <p className="text-xl font-bold text-foreground">{trainer.avgAttendance}%</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Attend</p>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <Target className="h-4 w-4 text-primary/60 mb-1.5" />
                  <p className="text-xl font-bold text-foreground">{trainer.avgProgress}%</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Success</p>
                </div>
              </div>
            </PremiumCardContent>
          </PremiumCard>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl bg-muted/5">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-bold text-foreground mb-1">No Trainers Found</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
