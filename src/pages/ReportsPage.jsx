import { useCallback, useEffect, useMemo, useState } from "react";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, RefreshCw, BarChart3, HardDriveDownload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/data/api";

const reportConfigs = [
  {
    title: "Student List",
    description: "Export all student records with current status and levels.",
    icon: FileSpreadsheet,
    type: "students",
  },
  {
    title: "Attendance Report",
    description: "Export attendance records with overrides and remarks.",
    icon: FileSpreadsheet,
    type: "attendance",
  },
  {
    title: "Training Summary",
    description: "Export training cohort sizes, capacity, and enrollment status.",
    icon: BarChart3,
    type: "trainings",
  },
];

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const buildImportStatus = (latestImport) => {
  if (!latestImport) {
    return {
      status: "pending",
      timestamp: new Date().toISOString(),
      message: "No import activity available yet.",
      recordsProcessed: 0,
      errors: 0,
    };
  }

  const status = latestImport.status || "pending";
  const timestamp = latestImport.processed_at || latestImport.uploaded_at || new Date().toISOString();
  const filename = latestImport.filename || "Import";

  const messageByStatus = {
    processing: `${filename} is still being processed.`,
    validated: `${filename} is validated and ready to apply.`,
    applied: `${filename} was applied successfully.`,
    failed: latestImport.error_message || `${filename} failed to process.`,
  };

  return {
    status,
    timestamp,
    message: messageByStatus[status] || `${filename} status is ${status}.`,
    recordsProcessed: Number(latestImport.valid_rows || 0),
    errors: Number(latestImport.error_rows || 0),
  };
};

export default function ReportsPage() {
  const [latestImport, setLatestImport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [exportingType, setExportingType] = useState("");

  const loadImports = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(false);
      const response = await api.imports.list();
      const imports = Array.isArray(response?.imports) ? response.imports : [];
      const sortedImports = [...imports].sort((left, right) => new Date(right.uploaded_at) - new Date(left.uploaded_at));
      setLatestImport(sortedImports[0] || null);
    } catch (error) {
      setLatestImport(null);
      setFetchError(true);
      toast.error(error?.message || "Failed to load import synchronization status.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImports();
  }, [loadImports]);

  const importStatus = useMemo(() => buildImportStatus(latestImport), [latestImport]);

  const handleExport = async (type) => {
    try {
      setExportingType(type);
      const response = await api.reports.exports({ type });
      const filename = response?.filename;

      if (!filename) {
        throw new Error("Export filename not returned by backend.");
      }

      const blob = await api.reports.downloadExport(filename);
      downloadBlob(blob, filename);
      toast.success(`Exported ${filename}`);
    } catch (error) {
      toast.error(error?.message || "Failed to export report.");
    } finally {
      setExportingType("");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Reports & Export
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Download comprehensive platform data and monitor backend synchronization</p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading data...</p>}
      {!isLoading && fetchError && <p className="text-sm text-destructive">Error in fetching data</p>}

      <div className="grid gap-6 sm:grid-cols-2">
        {reportConfigs.map((report) => (
          <PremiumCard key={report.title} className="hover:-translate-y-1 transition-transform duration-300 group">
            <PremiumCardContent className="p-6">
              <div className="flex flex-col h-full">
                <div className="p-3 rounded-xl bg-primary/10 text-primary w-12 h-12 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <report.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{report.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-6 leading-relaxed">{report.description}</p>
                  <Button variant="default" className="w-full justify-start rounded-xl" onClick={() => handleExport(report.type)} disabled={exportingType === report.type}>
                    <Download className="h-4 w-4 mr-2" />Export CSV
                  </Button>
                </div>
              </div>
            </PremiumCardContent>
          </PremiumCard>
        ))}
      </div>

      <PremiumCard>
        <PremiumCardHeader className="bg-muted/20 border-b border-border/50">
          <PremiumCardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDriveDownload className="h-5 w-5 text-primary" /> Data Import Synchronization
            </div>
            <Button variant="outline" size="sm" onClick={loadImports} className="rounded-full">
              <RefreshCw className="h-4 w-4 mr-2" />Refresh
            </Button>
          </PremiumCardTitle>
        </PremiumCardHeader>
        <PremiumCardContent className="p-6">
          <div className="p-6 rounded-xl bg-card border border-border/50 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${importStatus.status === "pending" || importStatus.status === "processing" ? "bg-warning" : importStatus.status === "failed" ? "bg-destructive" : "bg-status-active"}`} />

            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  {importStatus.status === "processing" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${importStatus.status === "pending" || importStatus.status === "processing" ? "bg-warning" : importStatus.status === "failed" ? "bg-destructive" : "bg-status-active"}`}></span>
                </div>
                <span className="font-bold text-lg capitalize">{importStatus.status.replace("_", " ")}</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-md">{new Date(importStatus.timestamp).toLocaleString()}</span>
            </div>

            <p className="text-foreground/80 font-medium mb-6">{importStatus.message}</p>

            <div className="flex flex-wrap gap-4 pt-4 border-t border-border/50">
              <div className="bg-primary/5 px-4 py-2 rounded-lg">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Processed</p>
                <p className="text-xl font-bold text-foreground">{importStatus.recordsProcessed} records</p>
              </div>
              <div className="bg-destructive/5 px-4 py-2 rounded-lg">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Errors</p>
                <p className="text-xl font-bold text-destructive">{importStatus.errors} failures</p>
              </div>
            </div>
          </div>
        </PremiumCardContent>
      </PremiumCard>
    </div>
  );
}
