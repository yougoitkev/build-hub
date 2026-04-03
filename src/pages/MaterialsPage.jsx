import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppStore } from "@/store/app-store";
import { FileText, Upload, Download, Search, History, Eye, Trash2, Plus, File, Video, TableIcon, Presentation } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

export default function MaterialsPage() {
  const trainers = useAppStore((s) => s.trainers);
  const materials = useAppStore((s) => s.materials);
  const setMaterials = useAppStore((s) => s.setMaterials);
  const trainings = useAppStore((s) => s.trainings);
  const user = useAppStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(null);
  const [newMaterial, setNewMaterial] = useState({ title: "", fileName: "", type: "Document", topic: "", account: "", locale: "EN-US", programId: "" });

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return m.title.toLowerCase().includes(q) || m.topic.toLowerCase().includes(q) || m.account.toLowerCase().includes(q);
      }
      return true;
    });
  }, [materials, search, typeFilter]);

  const handleUpload = () => {
    if (!newMaterial.title || !newMaterial.fileName) {
      toast.error("Title and file name required");
      return;
    }
    const mat = {
      id: `mat-${Date.now()}`,
      ...newMaterial,
      programId: newMaterial.programId || null,
      version: "1.0",
      size: "0 KB",
      uploadedBy: user?.id || "unknown",
      uploadedAt: new Date().toISOString().split("T")[0],
      versions: [{ version: "1.0", date: new Date().toISOString().split("T")[0], uploadedBy: user?.id || "unknown" }],
    };
    setMaterials([...materials, mat]);
    setShowUploadDialog(false);
    setNewMaterial({ title: "", fileName: "", type: "Document", topic: "", account: "", locale: "EN-US", programId: "" });
    toast.success("Material uploaded");
  };

  const handleDelete = (id) => {
    setMaterials(materials.filter((m) => m.id !== id));
    toast.success("Material deleted");
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {["Document", "Presentation", "Spreadsheet", "Video"].map((type) => {
          const Icon = typeIcons[type] || File;
          const count = materials.filter((m) => m.type === type).length;
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

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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

      {/* Materials Table */}
      <Card>
        <CardContent className="p-0">
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
              {filteredMaterials.map((mat) => {
                const Icon = typeIcons[mat.type] || File;
                return (
                  <TableRow key={mat.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{mat.title}</p>
                          <p className="text-[10px] text-muted-foreground">{mat.fileName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={cn("text-[10px]", typeColors[mat.type])}>{mat.type}</Badge></TableCell>
                    <TableCell className="text-sm">{mat.topic}</TableCell>
                    <TableCell className="text-sm">{mat.account}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">v{mat.version}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{mat.size}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{mat.uploadedAt}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Download"><Download className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Version History" onClick={() => setShowVersionDialog(mat.id)}><History className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete" onClick={() => handleDelete(mat.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Training Material</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={newMaterial.title} onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })} /></div>
            <div><Label>File Name</Label><Input value={newMaterial.fileName} onChange={(e) => setNewMaterial({ ...newMaterial, fileName: e.target.value })} placeholder="e.g., guide.pdf" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={newMaterial.type} onValueChange={(v) => setNewMaterial({ ...newMaterial, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Document">Document</SelectItem>
                    <SelectItem value="Presentation">Presentation</SelectItem>
                    <SelectItem value="Spreadsheet">Spreadsheet</SelectItem>
                    <SelectItem value="Video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Topic</Label><Input value={newMaterial.topic} onChange={(e) => setNewMaterial({ ...newMaterial, topic: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Account</Label><Input value={newMaterial.account} onChange={(e) => setNewMaterial({ ...newMaterial, account: e.target.value })} /></div>
              <div>
                <Label>Locale</Label>
                <Select value={newMaterial.locale} onValueChange={(v) => setNewMaterial({ ...newMaterial, locale: v })}>
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
              <Select value={newMaterial.programId} onValueChange={(v) => setNewMaterial({ ...newMaterial, programId: v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {trainings.slice(0, 10).map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button onClick={handleUpload}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={!!showVersionDialog} onOpenChange={() => setShowVersionDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Version History</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {materials.find((m) => m.id === showVersionDialog)?.versions?.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <Badge variant="outline" className="text-xs">v{v.version}</Badge>
                  <span className="text-sm ml-2">{v.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">by {trainers.find((t) => t.id === v.uploadedBy)?.name || v.uploadedBy}</span>
                  <Button variant="ghost" size="sm"><Download className="h-3 w-3 mr-1" /> Download</Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
