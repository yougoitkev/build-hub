import { useEffect, useMemo, useState } from "react";
import { PremiumCard, PremiumCardContent } from "@/components/learning/PremiumCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { api } from "@/data/api";

const mapAuditLog = (log) => ({
  id: String(log.id),
  action: log.action || "Unknown",
  user: log.changed_by_name || "System",
  entity: log.entity_id || log.entity_type || "",
  date: log.created_at,
  details: log.details || "",
});

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAuditLogs = async () => {
      try {
        if (isMounted) {
          setIsLoading(true);
          setFetchError(false);
        }

        const response = await api.auditLogs.list({
          action: actionFilter === "all" ? undefined : actionFilter,
          from: dateFrom || undefined,
          to: dateTo || undefined,
          search: search || undefined,
        });

        if (!isMounted) {
          return;
        }

        const rows = Array.isArray(response?.logs) ? response.logs.map(mapAuditLog) : [];
        setLogs(rows);
      } catch (error) {
        if (isMounted) {
          setLogs([]);
          setFetchError(true);
        }
        toast.error(error?.message || "Failed to load audit logs.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAuditLogs();

    return () => {
      isMounted = false;
    };
  }, [actionFilter, dateFrom, dateTo, search]);

  const actionTypes = useMemo(() => {
    const set = new Set(logs.map((log) => log.action).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Audit Trail
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Track all activity across the platform</p>
        </div>
        <Badge variant="outline" className="text-sm font-bold">{logs.length} entries</Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-end bg-muted/20 border border-border/50 rounded-xl p-4">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search logs..." className="pl-9" />
          </div>
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue placeholder="All Actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actionTypes.map((action) => <SelectItem key={action} value={action}>{action}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="space-y-1 flex-1">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">From</Label>
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-9" />
          </div>
          <div className="space-y-1 flex-1">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">To</Label>
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-9" />
          </div>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading data...</p>}
      {!isLoading && fetchError && <p className="text-sm text-destructive">Error in fetching data</p>}

      {!isLoading && (
        <PremiumCard>
          <PremiumCardContent className="p-0">
            {logs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date / Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {log.date ? format(new Date(log.date), "MMM d, yyyy h:mm a") : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-bold">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{log.user}</TableCell>
                      <TableCell className="text-sm">{log.entity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate" title={log.details}>
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-semibold text-foreground">No Audit Entries</p>
                <p className="text-sm">Activity will appear here as actions are performed.</p>
              </div>
            )}
          </PremiumCardContent>
        </PremiumCard>
      )}
    </div>
  );
}
