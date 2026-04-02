import { useState, useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { PremiumCard, PremiumCardContent } from "@/components/learning/PremiumCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, Clock, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

export default function TrainerUtilizationPage() {
  const trainerUtilization = useAppStore((s) => s.trainerUtilization || []);
  const [period, setPeriod] = useState("quarter");
  const [drillDownTrainer, setDrillDownTrainer] = useState(null);

  const stats = useMemo(() => {
    if (!trainerUtilization.length) return { avgUtil: 0, totalBilled: 0, totalAvailable: 0, belowTarget: 0 };
    const totalBilled = trainerUtilization.reduce((a, t) => a + t.billedHours, 0);
    const totalAvailable = trainerUtilization.reduce((a, t) => a + t.availableHours, 0);
    const avgUtil = Math.round((totalBilled / totalAvailable) * 100);
    const belowTarget = trainerUtilization.filter((t) => (t.billedHours / t.availableHours) * 100 < 60).length;
    return { avgUtil, totalBilled, totalAvailable, belowTarget };
  }, [trainerUtilization]);

  const chartData = trainerUtilization.map((t) => ({
    name: t.trainerName.split(" ")[0],
    utilization: Math.round((t.billedHours / t.availableHours) * 100),
    trainerId: t.trainerId,
  }));

  const getBarColor = (val) => (val >= 80 ? "hsl(142, 76%, 36%)" : val >= 60 ? "hsl(38, 92%, 50%)" : "hsl(0, 84%, 60%)");
  const getStatusClass = (val) => (val >= 80 ? "text-emerald-600" : val >= 60 ? "text-amber-600" : "text-destructive");

  const drillDown = drillDownTrainer ? trainerUtilization.find((t) => t.trainerId === drillDownTrainer) : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Trainer Utilization</h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitor trainer billed hours vs available hours</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px] bg-background rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Utilization", value: `${stats.avgUtil}%`, icon: TrendingUp, color: getStatusClass(stats.avgUtil) },
          { label: "Total Billed", value: `${stats.totalBilled}h`, icon: Clock, color: "text-primary" },
          { label: "Total Available", value: `${stats.totalAvailable}h`, icon: Clock, color: "text-muted-foreground" },
          { label: "Below Target", value: stats.belowTarget, icon: AlertTriangle, color: stats.belowTarget > 0 ? "text-destructive" : "text-emerald-600" },
        ].map((kpi) => (
          <PremiumCard key={kpi.label}>
            <PremiumCardContent className="p-5 text-center">
              <kpi.icon className={cn("h-5 w-5 mx-auto mb-2", kpi.color)} />
              <p className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-1">{kpi.label}</p>
            </PremiumCardContent>
          </PremiumCard>
        ))}
      </div>

      {/* Bar Chart */}
      <PremiumCard>
        <PremiumCardContent className="p-6">
          <h3 className="text-sm font-bold mb-4">Utilization by Trainer</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} onClick={(e) => e?.activePayload && setDrillDownTrainer(e.activePayload[0]?.payload?.trainerId)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip formatter={(val) => [`${val}%`, "Utilization"]} />
                <Bar dataKey="utilization" radius={[6, 6, 0, 0]} cursor="pointer">
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={getBarColor(entry.utilization)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* Table */}
      <PremiumCard>
        <PremiumCardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-bold">Trainer</TableHead>
                <TableHead className="text-center font-bold">Billed Hours</TableHead>
                <TableHead className="text-center font-bold">Available Hours</TableHead>
                <TableHead className="text-center font-bold">Utilization %</TableHead>
                <TableHead className="text-center font-bold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trainerUtilization.map((t) => {
                const util = Math.round((t.billedHours / t.availableHours) * 100);
                return (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/20" onClick={() => setDrillDownTrainer(t.trainerId)}>
                    <TableCell className="font-medium">{t.trainerName}</TableCell>
                    <TableCell className="text-center">{t.billedHours}</TableCell>
                    <TableCell className="text-center">{t.availableHours}</TableCell>
                    <TableCell className={cn("text-center font-bold", getStatusClass(util))}>{util}%</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("font-bold", getStatusClass(util))}>
                        {util >= 80 ? "On Track" : util >= 60 ? "Warning" : "Below Target"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </PremiumCardContent>
      </PremiumCard>

      {/* Drill-down */}
      {drillDown && (
        <PremiumCard>
          <PremiumCardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">{drillDown.trainerName} — Daily Breakdown</h3>
              <button onClick={() => setDrillDownTrainer(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <div className="overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {(drillDown.dailyBreakdown || []).map((day) => (
                  <div key={day.date} className="flex flex-col items-center p-2 rounded-lg bg-muted/20 min-w-[50px]">
                    <span className="text-[9px] text-muted-foreground">{day.date.slice(5)}</span>
                    <div className="h-16 w-6 bg-muted/30 rounded relative mt-1">
                      <div className={cn("absolute bottom-0 w-full rounded", day.billed / day.available >= 0.8 ? "bg-emerald-500" : day.billed / day.available >= 0.6 ? "bg-amber-500" : "bg-destructive")} style={{ height: `${(day.billed / day.available) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold mt-1">{day.billed}h</span>
                  </div>
                ))}
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>
      )}
    </div>
  );
}
