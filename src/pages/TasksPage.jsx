import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/app-store";
import { taskStatuses, taskPriorities } from "@/lib/phase3-mock-data";
import { Plus, MessageSquare, Calendar, Flag, User, Search, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const priorityColors = {
  Low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  High: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const statusColors = {
  New: "border-blue-300 bg-blue-50 dark:bg-blue-900/10",
  "In Progress": "border-amber-300 bg-amber-50 dark:bg-amber-900/10",
  Blocked: "border-red-300 bg-red-50 dark:bg-red-900/10",
  Done: "border-green-300 bg-green-50 dark:bg-green-900/10",
};

const statusHeaderColors = {
  New: "text-blue-700 dark:text-blue-300",
  "In Progress": "text-amber-700 dark:text-amber-300",
  Blocked: "text-red-700 dark:text-red-300",
  Done: "text-green-700 dark:text-green-300",
};

export default function TasksPage() {
  const trainers = useAppStore((s) => s.trainers);
  const tasks = useAppStore((s) => s.tasks);
  const setTasks = useAppStore((s) => s.setTasks);
  const trainings = useAppStore((s) => s.trainings);
  const user = useAppStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [view, setView] = useState("kanban");
  const [newTask, setNewTask] = useState({ title: "", description: "", assignedTo: "", programId: "", priority: "Medium", dueDate: "" });

  const isSupervisor = user?.role === "supervisor" || user?.role === "admin";

  const filteredTasks = useMemo(() => {
    if (!search) return tasks;
    const q = search.toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
  }, [tasks, search]);

  const handleAddTask = () => {
    if (!newTask.title || !newTask.assignedTo) {
      toast.error("Title and assignee are required");
      return;
    }
    const task = {
      id: `task-${Date.now()}`,
      ...newTask,
      programId: newTask.programId || null,
      status: "New",
      createdAt: new Date().toISOString().split("T")[0],
      createdBy: user?.id || "unknown",
      comments: [],
    };
    setTasks([...tasks, task]);
    setShowAddDialog(false);
    setNewTask({ title: "", description: "", assignedTo: "", programId: "", priority: "Medium", dueDate: "" });
    toast.success("Task created");
  };

  const handleStatusChange = (taskId, newStatus) => {
    setTasks(tasks.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    setTasks(tasks.map((t) => t.id === showCommentDialog ? {
      ...t,
      comments: [...t.comments, { id: `c-${Date.now()}`, text: commentText, author: user?.name || "User", date: new Date().toISOString().split("T")[0] }]
    } : t));
    setCommentText("");
    setShowCommentDialog(null);
    toast.success("Comment added");
  };

  const isOverdue = (task) => task.status !== "Done" && task.dueDate && new Date(task.dueDate) < new Date();

  const TaskCard = ({ task }) => (
    <Card className={cn("mb-3 border-l-4 transition-shadow hover:shadow-md", statusColors[task.status], isOverdue(task) && "ring-1 ring-destructive/30")}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground leading-tight">{task.title}</h4>
          <Badge className={cn("text-[10px] shrink-0", priorityColors[task.priority])}>{task.priority}</Badge>
        </div>
        {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><User className="h-3 w-3" />{trainers.find((t) => t.id === task.assignedTo)?.name || "Unassigned"}</span>
          {task.dueDate && <span className={cn("flex items-center gap-0.5", isOverdue(task) && "text-destructive font-medium")}><Calendar className="h-3 w-3" />{task.dueDate}</span>}
          {task.comments?.length > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{task.comments.length}</span>}
        </div>
        <div className="flex gap-1 pt-1">
          <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
            <SelectTrigger className="h-6 text-[10px] w-auto flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>{taskStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCommentDialog(task.id)}><MessageSquare className="h-3 w-3" /></Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Management</h1>
          <p className="text-sm text-muted-foreground">Assign and track training-related tasks</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}><LayoutGrid className="h-4 w-4 mr-1" /> Kanban</Button>
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}><List className="h-4 w-4 mr-1" /> List</Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4 mr-1" /> New Task</Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {taskStatuses.map((status) => {
          const count = filteredTasks.filter((t) => t.status === status).length;
          return (
            <Card key={status}>
              <CardContent className="p-4 text-center">
                <p className={cn("text-2xl font-bold", statusHeaderColors[status])}>{count}</p>
                <p className="text-xs text-muted-foreground">{status}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {taskStatuses.map((status) => (
            <div key={status}>
              <h3 className={cn("text-sm font-bold mb-3 px-2", statusHeaderColors[status])}>{status} ({filteredTasks.filter((t) => t.status === status).length})</h3>
              <div className="space-y-0">
                {filteredTasks.filter((t) => t.status === status).map((task) => <TaskCard key={task.id} task={task} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Task</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Assignee</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Priority</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Due</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id} className={cn("border-b hover:bg-muted/30", isOverdue(task) && "bg-destructive/5")}>
                    <td className="p-3 text-sm font-medium">{task.title}</td>
                    <td className="p-3 text-sm text-muted-foreground">{trainers.find((t) => t.id === task.assignedTo)?.name}</td>
                    <td className="p-3"><Badge className={cn("text-[10px]", priorityColors[task.priority])}>{task.priority}</Badge></td>
                    <td className="p-3">
                      <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                        <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{taskStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className={cn("p-3 text-sm", isOverdue(task) && "text-destructive font-medium")}>{task.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Add Task Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assign To</Label>
                <Select value={newTask.assignedTo} onValueChange={(v) => setNewTask({ ...newTask, assignedTo: v })}>
                  <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                  <SelectContent>{trainers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{taskPriorities.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
              </div>
              <div>
                <Label>Program (optional)</Label>
                <Select value={newTask.programId} onValueChange={(v) => setNewTask({ ...newTask, programId: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {trainings.slice(0, 10).map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddTask}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={!!showCommentDialog} onOpenChange={() => setShowCommentDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Task Comments</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {tasks.find((t) => t.id === showCommentDialog)?.comments?.map((c) => (
              <div key={c.id} className="p-2 bg-muted rounded-lg">
                <p className="text-xs font-medium">{c.author} <span className="text-muted-foreground font-normal">• {c.date}</span></p>
                <p className="text-sm mt-1">{c.text}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add comment..." className="flex-1" />
            <Button onClick={handleAddComment} className="self-end">Post</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
