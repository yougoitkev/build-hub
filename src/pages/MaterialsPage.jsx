import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppStore } from "@/store/app-store";
import { FileText, Upload, Download, Search, History, Trash2, File, Video, TableIcon, Presentation } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/data/api";
import { normalizeMaterial, normalizeProgram, normalizeTrainer, normalizeMaterialVersion, toApiId } from "@/lib/phase-backend";

const typeIcons = {
  Document: FileText,
  Presentation: Presentation,
  Spreadsheet: TableIcon,
  Video: Video,
};

const typeColors = {
  Document: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Presentation: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Spreadsheet: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Video: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

const emptyMaterial = { title: "", fileName: "", type: "Document", topic: "", account: "", locale: "EN-US", programId: "none" };

export default function MaterialsPage() {
  const user = useAppStore((state) => state.user);
  const [trainers, setTrainers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(null);
  const [newMaterial, setNewMaterial] = useState(emptyMaterial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadMaterials = async () => {
    const response = await api.materialsPage.list();
    const nextMaterials = (response?.materials || []).map(normalizeMaterial);
    setMaterials(nextMaterials);
    return nextMaterials;
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);

      try {
        const [trainerResponse, materialResponse, programResponse] = await Promise.all([
          api.trainers.list(),
          api.materialsPage.list(),
          api.trainingPrograms.list(),
        ]);

        if (cancelled) {
          return;
        }

        setTrainers((trainerResponse?.trainers || []).map(normalizeTrainer));
        setMaterials((materialResponse?.materials || []).map(normalizeMaterial));
        setPrograms((programResponse?.programs || []).map(normalizeProgram));
      } catch (error) {
        if (!cancelled) {
          toast.error("Failed to load materials");
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

  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      if (typeFilter !== "all" && material.type !== typeFilter) {
        return false;
      }

      if (search) {
        const query = search.toLowerCase();
        return material.title.toLowerCase().includes(query) || material.topic.toLowerCase().includes(query) || material.account.toLowerCase().includes(query);
      }

      return true;
    });
  }, [materials, search, typeFilter]);

  const currentTrainer = useMemo(() => (
    trainers.find((trainer) =>
      trainer.id === String(user?.trainerId || "") ||
      trainer.portalId === String(user?.portalId || "") ||
      trainer.name.toLowerCase() === String(user?.name || "").toLowerCase(),
    ) || null
  ), [trainers, user]);

  const handleUpload = async () => {
    if (!newMaterial.title || !newMaterial.fileName) {
      toast.error("Title and file name required");
      return;
    }

    setSaving(true);

    try {
      const selectedProgram = programs.find((program) => program.id === newMaterial.programId);

      await api.materialsPage.create({
        title: newMaterial.title,
        file_name: newMaterial.fileName,
        type: newMaterial.type,
        topic: newMaterial.topic,
        account: newMaterial.account,
        locale: newMaterial.locale,
        version: "1.0",
        size: "0 KB",
        uploaded_by: currentTrainer ? toApiId(currentTrainer.backendId) : undefined,
        program_id: newMaterial.programId === "none" ? null : newMaterial.programId,
        training_program_id: selectedProgram?.backendId ?? null,
      });

      await loadMaterials();
      setShowUploadDialog(false);
      setNewMaterial(emptyMaterial);
      toast.success("Material uploaded");
    } catch (error) {
      try {
        const nextMaterials = await loadMaterials();
        const recoveredMaterial = nextMaterials.find((material) => material.title === newMaterial.title && material.fileName === newMaterial.fileName);

        if (recoveredMaterial) {
          setShowUploadDialog(false);
          setNewMaterial(emptyMaterial);
          toast.success("Material uploaded");
        } else {
          toast.error("Failed to upload material");
        }
      } catch {
        toast.error("Failed to upload material");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (material) => {
    setSaving(true);

    try {
      await api.materialsPage.remove(material.backendId);
      await loadMaterials();
      toast.success("Material deleted");
    } catch (error) {
      toast.error("Failed to delete material");
    } finally {
      setSaving(false);
    }
  };

  const openVersions = async (material) => {
    setShowVersionDialog(material.id);

    try {
      const response = await api.materialsPage.versions(material.backendId);
      const versions = (response?.versions || []).map(normalizeMaterialVersion);
      setMaterials((current) => current.map((item) => (item.id === material.id ? { ...item, versions } : item)));
    } catch (error) {
      toast.error("Failed to load version history");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Document Repository</h1>
          <p className="text-sm text-muted-foreground">Centralized training materials with versioning</p>
        </div>
        <Button size="sm" onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-1" /> Upload Material
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {["Document", "Presentation", "Spreadsheet", "Video"].map((type) => {
          const Icon = typeIcons[type] || File;
          const count = materials.filter((material) => material.type === type).length;
          return (
            <Card key={type} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTypeFilter(type)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", typeColors[type])}><Icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">{type}s</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search materials..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Document">Documents</SelectItem>
            <SelectItem value="Presentation">Presentations</SelectItem>
            <SelectItem value="Spreadsheet">Spreadsheets</SelectItem>
            <SelectItem value="Video">Videos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-sm text-center text-muted-foreground">Loading materials...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => {
                  const Icon = typeIcons[material.type] || File;
                  return (
                    <TableRow key={material.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{material.title}</p>
                            <p className="text-[10px] text-muted-foreground">{material.fileName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge className={cn("text-[10px]", typeColors[material.type])}>{material.type}</Badge></TableCell>
                      <TableCell className="text-sm">{material.topic}</TableCell>
                      <TableCell className="text-sm">{material.account}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">v{material.version}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{material.size}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{material.uploadedAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Download" onClick={() => toast.info("File download is not exposed by the backend yet.")}><Download className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Version History" onClick={() => openVersions(material)}><History className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete" onClick={() => handleDelete(material)} disabled={saving}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Training Material</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={newMaterial.title} onChange={(event) => setNewMaterial({ ...newMaterial, title: event.target.value })} /></div>
            <div><Label>File Name</Label><Input value={newMaterial.fileName} onChange={(event) => setNewMaterial({ ...newMaterial, fileName: event.target.value })} placeholder="e.g., guide.pdf" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={newMaterial.type} onValueChange={(value) => setNewMaterial({ ...newMaterial, type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Document">Document</SelectItem>
                    <SelectItem value="Presentation">Presentation</SelectItem>
                    <SelectItem value="Spreadsheet">Spreadsheet</SelectItem>
                    <SelectItem value="Video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Topic</Label><Input value={newMaterial.topic} onChange={(event) => setNewMaterial({ ...newMaterial, topic: event.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Account</Label><Input value={newMaterial.account} onChange={(event) => setNewMaterial({ ...newMaterial, account: event.target.value })} /></div>
              <div>
                <Label>Locale</Label>
                <Select value={newMaterial.locale} onValueChange={(value) => setNewMaterial({ ...newMaterial, locale: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EN-US">EN-US</SelectItem>
                    <SelectItem value="EN-CA">EN-CA</SelectItem>
                    <SelectItem value="FR-CA">FR-CA</SelectItem>
                    <SelectItem value="ES-US">ES-US</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Program (optional)</Label>
              <Select value={newMaterial.programId} onValueChange={(value) => setNewMaterial({ ...newMaterial, programId: value })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {programs.map((program) => <SelectItem key={program.id} value={program.id}>{program.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={saving}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showVersionDialog} onOpenChange={() => setShowVersionDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Version History</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {materials.find((material) => material.id === showVersionDialog)?.versions?.map((version, index) => (
              <div key={`${version.version}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <Badge variant="outline" className="text-xs">v{version.version}</Badge>
                  <span className="text-sm ml-2">{version.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">by {trainers.find((trainer) => trainer.id === String(version.uploadedBy))?.name || version.uploadedBy}</span>
                  <Button variant="ghost" size="sm" onClick={() => toast.info("File download is not exposed by the backend yet.")}><Download className="h-3 w-3 mr-1" /> Download</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
