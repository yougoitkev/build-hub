import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/store/app-store";
import { TIER_CONFIG, computeSummary } from "@/lib/tier-config";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileSpreadsheet, Upload, Eye, CheckCircle2, AlertTriangle, XCircle,
  Settings2, Download, Play, RefreshCw, Columns3, RotateCcw,
} from "lucide-react";
import { api } from "@/data/api";

const statusConfig = {
  processing: { label: "Processing", icon: RefreshCw, className: "bg-info/10 text-info border-info/20" },
  validated: { label: "Validated", icon: AlertTriangle, className: "bg-warning/10 text-warning border-warning/20" },
  applied: { label: "Applied", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  failed: { label: "Failed", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const targetFields = [
  { value: "source", label: "Source" },
  { value: "empId", label: "EMP ID" },
  { value: "language", label: "Language" },
  { value: "lastName", label: "Last Name" },
  { value: "firstName", label: "First Name" },
  { value: "status", label: "Status" },
  ...Array.from({ length: 47 }, (_, index) => ({ value: `day_${index + 1}`, label: `Day ${index + 1}` })),
];

const attendanceTransforms = {
  attendance: { P: "8", A: "0", NCNS: "NCNS" },
};

const mapImportRecord = (item) => ({
  id: Number(item.id),
  filename: item.filename || "Import",
  uploadedAt: item.uploaded_at || item.processed_at || item.applied_at || new Date().toISOString(),
  uploadedBy: item.uploaded_by || "",
  status: item.status || "processing",
  totalRows: Number(item.total_rows || 0),
  validRows: Number(item.valid_rows || 0),
  errorRows: Number(item.error_rows || 0),
  warningRows: Number(item.warning_rows || 0),
  mappingId: item.mapping_id || null,
  storedFilePath: item.stored_file_path || null,
  processedAt: item.processed_at || null,
  appliedAt: item.applied_at || null,
  errorMessage: item.error_message || null,
});

const normalizeIssue = (issue) => {
  if (typeof issue === "string") {
    return { columnName: "row", message: issue };
  }

  return {
    columnName: issue?.columnName || issue?.column_name || issue?.field || "row",
    message: issue?.message || String(issue || ""),
  };
};

const mapPreviewRow = (row) => {
  const errors = Array.isArray(row?.errors) ? row.errors.map(normalizeIssue) : [];
  const warnings = Array.isArray(row?.warnings) ? row.warnings.map(normalizeIssue) : [];
  const status = row?.status || (errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid");

  return {
    rowNumber: row?.rowNumber || row?.row_number || 0,
    data: row?.data || {},
    validation: {
      status,
      errors,
      warnings,
    },
    matchedStudentId: row?.matchedStudentId || row?.matched_student_id || null,
    duplicate: Boolean(row?.duplicate || row?.duplicateMatch),
  };
};

const buildDownload = (content, filename, type = "text/plain;charset=utf-8") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function ImportManagementPage() {
  const user = useAppStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const [imports, setImports] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewColumns, setPreviewColumns] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [selectedImport, setSelectedImport] = useState(null);
  const [columnMappings, setColumnMappings] = useState({});
  const [mappingName, setMappingName] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const scheduledTrainingId = searchParams.get("scheduledTrainingId") || searchParams.get("trainingId") || "";

  const loadImportsAndMappings = useCallback(async () => {
    try {
      setIsLoadingData(true);
      setFetchError(false);

      const [importsResponse, mappingsResponse] = await Promise.all([
        api.imports.list(),
        api.mappings.list(),
      ]);

      const importRows = Array.isArray(importsResponse?.imports)
        ? importsResponse.imports.map(mapImportRecord)
        : [];
      const mappingRows = Array.isArray(mappingsResponse?.mappings)
        ? mappingsResponse.mappings
        : [];

      setImports(importRows);
      setMappings(mappingRows);
    } catch (error) {
      setImports([]);
      setMappings([]);
      setFetchError(true);
      toast.error(error?.message || "Failed to load import data.");
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadImportsAndMappings();
  }, [loadImportsAndMappings]);

  const detectedColumns = useMemo(() => {
    if (previewColumns.length > 0) {
      return previewColumns.map((column) => column.excelColumn || column.excel_column).filter(Boolean);
    }

    return Object.keys(previewRows[0]?.data || {});
  }, [previewColumns, previewRows]);

  const buildAutoMap = useCallback((columns, existingMappings = []) => {
    const mapped = {};

    existingMappings.forEach((item) => {
      if (item?.excelColumn && item?.appField) {
        mapped[item.excelColumn] = item.appField;
      }
    });

    columns.forEach((column) => {
      if (mapped[column]) {
        return;
      }

      const normalized = column.replace(/\s+/g, "").toLowerCase();
      const directField = targetFields.find((field) => field.value.toLowerCase() === normalized);
      if (directField) {
        mapped[column] = directField.value;
        return;
      }

      const labelledField = targetFields.find((field) => field.label.replace(/\s+/g, "").toLowerCase() === normalized);
      if (labelledField) {
        mapped[column] = labelledField.value;
      }
    });

    return mapped;
  }, []);

  const loadPreview = useCallback(async (imp) => {
    setSelectedImport(imp);
    setIsLoadingPreview(true);

    try {
      const [detailResponse, previewResponse] = await Promise.all([
        api.imports.detail(imp.id),
        api.imports.preview(imp.id),
      ]);

      const refreshedImport = detailResponse?.import ? mapImportRecord(detailResponse.import) : imp;
      const rows = Array.isArray(previewResponse?.rows) ? previewResponse.rows.map(mapPreviewRow) : [];
      const columns = Array.isArray(previewResponse?.columns) ? previewResponse.columns : [];

      setSelectedImport(refreshedImport);
      setPreviewRows(rows);
      setPreviewColumns(columns);

      return { refreshedImport, rows, columns };
    } catch (error) {
      setPreviewRows([]);
      setPreviewColumns([]);
      toast.error(error?.message || "Failed to load import preview.");
      throw error;
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  const handlePreview = async (imp) => {
    setPreviewOpen(true);
    try {
      await loadPreview(imp);
    } catch {
      // Error already handled in loadPreview.
    }
  };

  const handleMapping = async (imp) => {
    try {
      const { columns, rows } = await loadPreview(imp);
      const sourceColumns = columns.length > 0
        ? columns.map((column) => column.excelColumn || column.excel_column).filter(Boolean)
        : Object.keys(rows[0]?.data || {});
      setColumnMappings(buildAutoMap(sourceColumns));
      setMappingName(`${imp.filename} Mapping`);
      setMappingOpen(true);
    } catch {
      // Error already handled in loadPreview.
    }
  };

  const handleApply = async (imp) => {
    if (imp.errorRows > 0) {
      toast.error(`Cannot apply - ${imp.errorRows} error rows must be resolved first.`);
      return;
    }

    if (!scheduledTrainingId) {
      toast.error("Scheduled training ID is required in the page URL to apply this import.");
      return;
    }

    try {
      await api.imports.apply(imp.id, {
        scheduled_training_id: Number(scheduledTrainingId),
        skipRows: [],
        user_id: user?.portalId || user?.id,
        user_name: user?.name || "User",
      });
      toast.success(`Import "${imp.filename}" applied successfully.`);
      await loadImportsAndMappings();
    } catch (error) {
      toast.error(error?.message || "Failed to apply import.");
    }
  };

  const handleSaveMapping = async () => {
    try {
      const mappingsPayload = Object.entries(columnMappings)
        .filter(([, value]) => Boolean(value))
        .map(([excelColumn, appField]) => ({
          excelColumn,
          appField,
          transform: appField.startsWith("day_") ? "attendance" : "trim",
        }));

      await api.mappings.create({
        name: mappingName || selectedImport?.filename || "Untitled Mapping",
        mappings: mappingsPayload,
        transforms: attendanceTransforms,
        created_by_portalid: user?.portalId || user?.id,
      });

      toast.success(`Mapping "${mappingName || "Untitled"}" saved for reuse.`);
      setMappingOpen(false);
      await loadImportsAndMappings();
    } catch (error) {
      toast.error(error?.message || "Failed to save mapping.");
    }
  };

  const handleDownloadErrors = async (imp) => {
    try {
      const response = await api.imports.downloadErrors(imp.id);
      const rows = Array.isArray(response?.errors) ? response.errors : [];
      const csv = [
        "Row Number,Status,Errors,Warnings",
        ...rows.map((row) => [
          row.rowNumber ?? "",
          row.status ?? "",
          `"${(row.errors || []).join(" | ")}"`,
          `"${(row.warnings || []).join(" | ")}"`,
        ].join(",")),
      ].join("\n");
      buildDownload(csv, `${imp.filename.replace(/\.[^.]+$/, "")}_errors.csv`, "text/csv;charset=utf-8");
      toast.success("Error rows CSV download started.");
    } catch (error) {
      toast.error(error?.message || "Failed to download import errors.");
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      await api.imports.create({
        file,
        filename: file.name,
        uploaded_by_portalid: user?.portalId || user?.id,
        uploaded_by_name: user?.name || "User",
      });
      toast.success(`Import "${file.name}" created successfully.`);
      await loadImportsAndMappings();
    } catch (error) {
      toast.error(error?.message || "Failed to create import.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleLoadSavedMapping = (mapping) => {
    const loadedMappings = Array.isArray(mapping?.mappings)
      ? mapping.mappings.reduce((accumulator, item) => {
        if (item?.excelColumn && item?.appField) {
          accumulator[item.excelColumn] = item.appField;
        }
        return accumulator;
      }, {})
      : {};

    setColumnMappings(loadedMappings);
    setMappingName(mapping?.name || "");
    setMappingOpen(true);
    toast.success(`Loaded mapping "${mapping?.name || "Template"}".`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import Management</h1>
          <p className="text-muted-foreground">Manage Excel imports, column mappings, and validation</p>
        </div>
        <>
          <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
          <Button className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Upload className="h-4 w-4" /> Trigger Import
          </Button>
        </>
      </div>

      {isLoadingData && <p className="text-sm text-muted-foreground">Loading data...</p>}
      {!isLoadingData && fetchError && <p className="text-sm text-destructive">Error in fetching data</p>}

      {!isLoadingData && (
        <>
          <PremiumCard>
            <PremiumCardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <PremiumCardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" /> Import History
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-center">Rows</TableHead>
                    <TableHead className="text-center">Valid</TableHead>
                    <TableHead className="text-center">Errors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((imp) => {
                    const sc = statusConfig[imp.status] || statusConfig.processing;
                    return (
                      <TableRow key={imp.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{imp.filename}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(imp.uploadedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">{imp.totalRows}</TableCell>
                        <TableCell className="text-center font-mono text-sm text-success">{imp.validRows}</TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {imp.errorRows > 0 ? (
                            <span className="text-destructive font-bold">{imp.errorRows}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sc.className}>
                            <sc.icon className="h-3 w-3 mr-1" /> {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => handlePreview(imp)} title="Preview">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleMapping(imp)} title="Map Columns">
                              <Columns3 className="h-4 w-4" />
                            </Button>
                            {imp.status === "validated" && (
                              <Button variant="ghost" size="sm" onClick={() => handleApply(imp)} title="Apply" className="text-success hover:text-success">
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            {imp.errorRows > 0 && (
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadErrors(imp)} title="Download Errors" className="text-destructive hover:text-destructive">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {imports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                        No imports found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </PremiumCardContent>
          </PremiumCard>

          <PremiumCard>
            <PremiumCardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <PremiumCardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" /> Saved Mapping Templates
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="p-4">
              {mappings.length > 0 ? (
                <div className="space-y-2">
                  {mappings.map((mapping) => (
                    <div key={mapping.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card">
                      <div>
                        <p className="text-sm font-semibold">{mapping.name}</p>
                        <p className="text-xs text-muted-foreground">Created {mapping.created_at ? new Date(mapping.created_at).toLocaleString() : "-"}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleLoadSavedMapping(mapping)}>Load</Button>
                        <Button variant="ghost" size="sm" onClick={loadImportsAndMappings}><RotateCcw className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No saved mappings yet.</p>
              )}
            </PremiumCardContent>
          </PremiumCard>
        </>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Import Preview - {selectedImport?.filename}
            </DialogTitle>
            <DialogDescription>
              {selectedImport?.totalRows || 0} rows - {selectedImport?.validRows || 0} valid - {selectedImport?.errorRows || 0} errors
            </DialogDescription>
          </DialogHeader>
          {isLoadingPreview ? (
            <p className="text-sm text-muted-foreground">Loading data...</p>
          ) : (
            <Tabs defaultValue="data">
              <TabsList>
                <TabsTrigger value="data">Data Preview</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
              </TabsList>
              <TabsContent value="data">
                <ScrollArea className="h-[50vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>EMP ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        {TIER_CONFIG.map((tier) => (
                          <TableHead key={tier.id} className="text-center text-xs">
                            {tier.label}<br />
                            <span className="text-muted-foreground font-normal">({tier.days.length}d)</span>
                          </TableHead>
                        ))}
                        <TableHead className="text-center">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row) => {
                        const summary = computeSummary(row.data);
                        return (
                          <TableRow key={row.rowNumber} className={row.validation.status === "error" ? "bg-destructive/5" : ""}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{row.rowNumber}</TableCell>
                            <TableCell className="font-mono text-xs">{row.data.empId}</TableCell>
                            <TableCell className="text-sm font-medium">{row.data.firstName} {row.data.lastName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{row.data.status}</Badge>
                            </TableCell>
                            {TIER_CONFIG.map((tier) => {
                              const total = tier.days.reduce((sum, day) => {
                                const value = parseFloat(row.data[`day_${day}`]);
                                return sum + (Number.isNaN(value) ? 0 : value);
                              }, 0);

                              return (
                                <TableCell key={tier.id} className="text-center font-mono text-xs">{total}h</TableCell>
                              );
                            })}
                            <TableCell className="text-center font-mono text-sm font-bold">{summary.hoursCompleted}h</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="validation">
                <ScrollArea className="h-[50vh]">
                  <div className="space-y-2 p-2">
                    {previewRows.map((row) => (
                      <div key={row.rowNumber} className="p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-muted-foreground">Row {row.rowNumber}</span>
                          <span className="font-medium text-sm">{row.data.firstName} {row.data.lastName}</span>
                          {row.validation.status === "valid" && (
                            <Badge className="bg-success/10 text-success border-success/20" variant="outline">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Valid
                            </Badge>
                          )}
                          {row.validation.status === "warning" && (
                            <Badge className="bg-warning/10 text-warning border-warning/20" variant="outline">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Warning
                            </Badge>
                          )}
                          {row.validation.status === "error" && (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="outline">
                              <XCircle className="h-3 w-3 mr-1" /> Error
                            </Badge>
                          )}
                          {row.matchedStudentId && (
                            <span className="text-xs text-muted-foreground">Matched: {row.matchedStudentId}</span>
                          )}
                          {row.duplicate && (
                            <Badge variant="destructive" className="text-xs">Duplicate</Badge>
                          )}
                        </div>
                        {(row.validation.errors.length > 0 || row.validation.warnings.length > 0) && (
                          <div className="space-y-1 ml-4">
                            {row.validation.errors.map((error, index) => (
                              <p key={`error-${index}`} className="text-xs text-muted-foreground">
                                <span className="font-mono text-warning">{error.columnName}</span>: {error.message}
                              </p>
                            ))}
                            {row.validation.warnings.map((warning, index) => (
                              <p key={`warning-${index}`} className="text-xs text-muted-foreground">
                                <span className="font-mono text-warning">{warning.columnName}</span>: {warning.message}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            {selectedImport?.errorRows > 0 && (
              <Button variant="outline" onClick={() => handleDownloadErrors(selectedImport)} className="gap-2">
                <Download className="h-4 w-4" /> Download Errors CSV
              </Button>
            )}
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            {selectedImport?.status === "validated" && selectedImport?.errorRows === 0 && (
              <Button onClick={() => { handleApply(selectedImport); setPreviewOpen(false); }} className="gap-2">
                <Play className="h-4 w-4" /> Apply Import
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mappingOpen} onOpenChange={setMappingOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Columns3 className="h-5 w-5 text-primary" />
              Column Mapping
            </DialogTitle>
            <DialogDescription>
              Map Excel columns to app fields. Mappings can be saved for reuse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Mapping Template Name</label>
              <Input
                value={mappingName}
                onChange={(event) => setMappingName(event.target.value)}
                placeholder="e.g. Standard Training Template"
              />
            </div>
            <ScrollArea className="h-[40vh]">
              <div className="space-y-2 pr-3">
                {detectedColumns.map((column) => (
                  <div key={column} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <span className="text-sm font-mono w-32 truncate shrink-0" title={column}>{column}</span>
                    <span className="text-muted-foreground">-&gt;</span>
                    <Select
                      value={columnMappings[column] || ""}
                      onValueChange={(value) => setColumnMappings((prev) => ({ ...prev, [column]: value }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select target field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {targetFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMapping}>Save Mapping</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
