import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/app-store";
import { skillCategories as fallbackCategories, skillDefinitions as fallbackSkills, skillLevels as fallbackLevels } from "@/lib/phase3-mock-data";
import { Search, Grid3X3, BarChart3, Download } from "lucide-react";
import { toast } from "sonner";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { api } from "@/data/api";
import {
  normalizeSkillCategory,
  normalizeSkillDefinition,
  normalizeSupervisor,
  normalizeTrainer,
  normalizeTrainerSkill,
  resolveSupervisorForUser,
  toApiId,
} from "@/lib/phase-backend";

const levelColors = {
  "Not Assessed": "bg-muted text-muted-foreground",
  Beginner: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Intermediate: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Advanced: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Expert: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

const levelValue = { "Not Assessed": 0, Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4 };

export default function SkillsMatrixPage() {
  const user = useAppStore((state) => state.user);
  const [trainers, setTrainers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [trainerSkills, setTrainerSkills] = useState([]);
  const [skillCategories, setSkillCategories] = useState(fallbackCategories);
  const [skillDefinitions, setSkillDefinitions] = useState(fallbackSkills);
  const [skillLevels, setSkillLevels] = useState(fallbackLevels);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");

  const currentSupervisor = useMemo(() => resolveSupervisorForUser(supervisors, user), [supervisors, user]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);

      try {
        const [trainerResponse, supervisorResponse, metaResponse, skillResponse] = await Promise.all([
          api.trainers.list(),
          api.supervisors.list(),
          api.skillsMatrix.meta(),
          api.skillsMatrix.list(),
        ]);

        if (cancelled) {
          return;
        }

        const backendCategories = (metaResponse?.categories || []).map(normalizeSkillCategory);
        const backendSkills = (metaResponse?.skills || []).map(normalizeSkillDefinition);
        const backendLevels = Array.isArray(metaResponse?.levels) && metaResponse.levels.length ? metaResponse.levels : fallbackLevels;

        setTrainers((trainerResponse?.trainers || []).map(normalizeTrainer));
        setSupervisors((supervisorResponse?.supervisors || []).map(normalizeSupervisor));
        setSkillCategories(backendCategories.length ? backendCategories : fallbackCategories);
        setSkillDefinitions(backendSkills.length ? backendSkills : fallbackSkills);
        setSkillLevels(backendLevels);
        setTrainerSkills((skillResponse?.trainer_skills || []).map(normalizeTrainerSkill));
      } catch (error) {
        if (!cancelled) {
          toast.error("Failed to load skills matrix");
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

  const [trainerFilter, setTrainerFilter] = useState("all");

  const filteredTrainers = useMemo(() => {
    if (trainerFilter === "all") return trainers;
    return trainers.filter((trainer) => trainer.id === trainerFilter);
  }, [trainers, trainerFilter]);

  const filteredSkills = useMemo(() => {
    return skillDefinitions.filter((skill) => {
      if (categoryFilter !== "all" && skill.categoryId !== categoryFilter) {
        return false;
      }

      if (search && !skill.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [categoryFilter, search, skillDefinitions]);

  const getLevel = (trainerId, skillId) => {
    const found = trainerSkills.find((trainerSkill) => trainerSkill.trainerId === trainerId && trainerSkill.skillId === skillId);
    return found?.level || "Not Assessed";
  };

  const handleLevelChange = async (trainerId, skillId, newLevel) => {
    if (!currentSupervisor) {
      toast.error("No supervisor profile is available for saving skills.");
      return;
    }

    const updatedSkills = (() => {
      const existing = trainerSkills.filter((trainerSkill) => trainerSkill.trainerId === trainerId);
      const untouched = trainerSkills.filter((trainerSkill) => trainerSkill.trainerId !== trainerId);
      const nextTrainerSkills = [...existing];
      const targetIndex = nextTrainerSkills.findIndex((trainerSkill) => trainerSkill.skillId === skillId);

      if (targetIndex >= 0) {
        nextTrainerSkills[targetIndex] = { ...nextTrainerSkills[targetIndex], level: newLevel };
      } else {
        nextTrainerSkills.push({ trainerId, skillId, level: newLevel, notes: "" });
      }

      return [...untouched, ...nextTrainerSkills];
    })();

    setTrainerSkills(updatedSkills);
    setSavingKey(`${trainerId}:${skillId}`);

    try {
      await api.skillsMatrix.update({
        trainer_id: toApiId(trainerId),
        supervisor_id: toApiId(currentSupervisor.backendId),
        skills: updatedSkills
          .filter((trainerSkill) => trainerSkill.trainerId === trainerId)
          .map((trainerSkill) => ({
            skill_id: trainerSkill.skillId,
            level: trainerSkill.level,
            notes: trainerSkill.notes || "",
          })),
      });

      toast.success("Skill level updated");
    } catch (error) {
      toast.error("Failed to save skill level");
      try {
        const response = await api.skillsMatrix.list({ trainer_id: toApiId(trainerId) }, { cache: false });
        const refreshed = (response?.trainer_skills || []).map(normalizeTrainerSkill);
        setTrainerSkills((current) => [...current.filter((trainerSkill) => trainerSkill.trainerId !== trainerId), ...refreshed]);
      } catch {
        // Keep optimistic value if refetch also fails.
      }
    } finally {
      setSavingKey("");
    }
  };

  const handleExport = () => {
    const headers = ["Trainer", ...filteredSkills.map((skill) => skill.name)];
    const rows = trainers.map((trainer) => [trainer.name, ...filteredSkills.map((skill) => getLevel(trainer.id, skill.id))]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "skills_matrix.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Skills matrix exported");
  };

  const radarData = useMemo(() => {
    if (!selectedTrainer) {
      return [];
    }

    return skillCategories.map((category) => {
      const categorySkills = skillDefinitions.filter((skill) => skill.categoryId === category.id);
      const average = categorySkills.length > 0
        ? categorySkills.reduce((total, skill) => total + levelValue[getLevel(selectedTrainer, skill.id)], 0) / categorySkills.length
        : 0;

      return { category: category.name, value: average, fullMark: 4 };
    });
  }, [selectedTrainer, trainerSkills, skillCategories, skillDefinitions]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Skills Matrix</h1>
          <p className="text-sm text-muted-foreground">Trainer capabilities across skill categories and proficiency levels</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search skills..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {skillCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedTrainer || ""} onValueChange={(value) => setSelectedTrainer(value || null)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Radar: Select Trainer" /></SelectTrigger>
          <SelectContent>
            {trainers.map((trainer) => <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="matrix">
        <TabsList>
          <TabsTrigger value="matrix"><Grid3X3 className="h-4 w-4 mr-1" /> Matrix View</TabsTrigger>
          <TabsTrigger value="radar"><BarChart3 className="h-4 w-4 mr-1" /> Radar View</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix">
          <Card>
            <CardContent className="p-0 overflow-auto">
              {loading ? (
                <div className="p-8 text-sm text-center text-muted-foreground">Loading skills matrix...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Trainer</TableHead>
                      {filteredSkills.map((skill) => (
                        <TableHead key={skill.id} className="text-center min-w-[130px]">
                          <div className="text-xs">{skill.name}</div>
                          <div className="text-[10px] text-muted-foreground">{skillCategories.find((category) => category.id === skill.categoryId)?.name}</div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainers.map((trainer) => (
                      <TableRow key={trainer.id}>
                        <TableCell className="sticky left-0 bg-card z-10 font-medium">{trainer.name}</TableCell>
                        {filteredSkills.map((skill) => {
                          const level = getLevel(trainer.id, skill.id);
                          return (
                            <TableCell key={skill.id} className="text-center p-1">
                              <Select value={level} onValueChange={(value) => handleLevelChange(trainer.id, skill.id, value)}>
                                <SelectTrigger className="h-7 text-xs border-0 justify-center" disabled={savingKey === `${trainer.id}:${skill.id}`}>
                                  <Badge className={`${levelColors[level]} text-[10px] px-1.5`}>{level}</Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  {skillLevels.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radar">
          {selectedTrainer ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {trainers.find((trainer) => trainer.id === selectedTrainer)?.name} - Skill Radar
                </CardTitle>
                <CardDescription>Average proficiency by category (0=Not Assessed, 4=Expert)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 4]} tick={{ fontSize: 10 }} />
                    <Radar name="Proficiency" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              Select a trainer from the dropdown above to view their skill radar chart.
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Proficiency Levels</p>
          <div className="flex flex-wrap gap-2">
            {skillLevels.map((level) => (
              <Badge key={level} className={`${levelColors[level]} text-xs`}>{level}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
