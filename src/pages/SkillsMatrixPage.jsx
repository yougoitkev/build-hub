import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/app-store";
import { skillCategories, skillDefinitions, skillLevels } from "@/lib/phase3-mock-data";
import { Search, Grid3X3, BarChart3, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from "recharts";

const levelColors = {
  "Not Assessed": "bg-muted text-muted-foreground",
  "Beginner": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Intermediate": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Advanced": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Expert": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

const levelValue = { "Not Assessed": 0, "Beginner": 1, "Intermediate": 2, "Advanced": 3, "Expert": 4 };

export default function SkillsMatrixPage() {
  const trainers = useAppStore((s) => s.trainers);
  const trainerSkills = useAppStore((s) => s.trainerSkills);
  const setTrainerSkills = useAppStore((s) => s.setTrainerSkills);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedTrainer, setSelectedTrainer] = useState(null);

  const filteredSkills = useMemo(() => {
    return skillDefinitions.filter((sk) => {
      if (categoryFilter !== "all" && sk.categoryId !== categoryFilter) return false;
      if (search && !sk.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [categoryFilter, search]);

  const getLevel = (trainerId, skillId) => {
    const found = trainerSkills.find((ts) => ts.trainerId === trainerId && ts.skillId === skillId);
    return found?.level || "Not Assessed";
  };

  const handleLevelChange = (trainerId, skillId, newLevel) => {
    const updated = [...trainerSkills];
    const idx = updated.findIndex((ts) => ts.trainerId === trainerId && ts.skillId === skillId);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], level: newLevel };
    } else {
      updated.push({ trainerId, skillId, level: newLevel });
    }
    setTrainerSkills(updated);
    toast.success("Skill level updated");
  };

  const handleExport = () => {
    const headers = ["Trainer", ...filteredSkills.map((s) => s.name)];
    const rows = trainers.map((t) => [t.name, ...filteredSkills.map((s) => getLevel(t.id, s.id))]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skills_matrix.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Skills matrix exported");
  };

  // Radar chart data for selected trainer
  const radarData = useMemo(() => {
    if (!selectedTrainer) return [];
    return skillCategories.map((cat) => {
      const catSkills = skillDefinitions.filter((s) => s.categoryId === cat.id);
      const avg = catSkills.length > 0
        ? catSkills.reduce((sum, sk) => sum + levelValue[getLevel(selectedTrainer, sk.id)], 0) / catSkills.length
        : 0;
      return { category: cat.name, value: avg, fullMark: 4 };
    });
  }, [selectedTrainer, trainerSkills]);

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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search skills..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {skillCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedTrainer || ""} onValueChange={(v) => setSelectedTrainer(v || null)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Radar: Select Trainer" /></SelectTrigger>
          <SelectContent>
            {trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card z-10 min-w-[150px]">Trainer</TableHead>
                    {filteredSkills.map((sk) => (
                      <TableHead key={sk.id} className="text-center min-w-[130px]">
                        <div className="text-xs">{sk.name}</div>
                        <div className="text-[10px] text-muted-foreground">{skillCategories.find((c) => c.id === sk.categoryId)?.name}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainers.map((trainer) => (
                    <TableRow key={trainer.id}>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium">{trainer.name}</TableCell>
                      {filteredSkills.map((sk) => {
                        const level = getLevel(trainer.id, sk.id);
                        return (
                          <TableCell key={sk.id} className="text-center p-1">
                            <Select value={level} onValueChange={(v) => handleLevelChange(trainer.id, sk.id, v)}>
                              <SelectTrigger className="h-7 text-xs border-0 justify-center">
                                <Badge className={`${levelColors[level]} text-[10px] px-1.5`}>{level}</Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {skillLevels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radar">
          {selectedTrainer ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {trainers.find((t) => t.id === selectedTrainer)?.name} — Skill Radar
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

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Proficiency Levels</p>
          <div className="flex flex-wrap gap-2">
            {skillLevels.map((l) => (
              <Badge key={l} className={`${levelColors[l]} text-xs`}>{l}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
