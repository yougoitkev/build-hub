import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAppStore } from "@/store/app-store";
import { taskStatuses, taskPriorities } from "@/lib/phase3-mock-data";
import { Plus, MessageSquare, Calendar, User, Search, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/data/api";
import { normalizeProgram, normalizeTask, normalizeTrainer, toApiId } from "@/lib/phase-backend";

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

const emptyTask = { title: "", description: "", assignedTo: "", programId: "none", priority: "Medium", dueDate: "" };
const mapTaskStatusForApi = (status) => {
  if (status === "Done") {
    return "Completed";
  }

  return status;
};

export default function TasksPage() {
  const user = useAppStore((state) => state.user);
  const [trainers, setTrainers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [view, setView] = useState("kanban");
  const [newTask, setNewTask] = useState(emptyTask);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTasks = async () => {
    const response = await api.tasksPage.list();
    setTasks((response?.tasks || []).map(normalizeTask));
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);

      try {
        const [trainerResponse, taskResponse, programResponse] = await Promise.all([
          api.trainers.list(),
          api.tasksPage.list(),
          api.trainingPrograms.list(),
        ]);

        if (cancelled) {
          return;
        }

        setTrainers((trainerResponse?.trainers || []).map(normalizeTrainer));
        setTasks((taskResponse?.tasks || []).map(normalizeTask));
        setPrograms((programResponse?.programs || []).map(normalizeProgram));
      } catch (error) {
        if (!cancelled) {
          toast.error("Failed to load tasks");
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

  const filteredTasks = useMemo(() => {
    if (!search) {
      return tasks;
    }

    const query = search.toLowerCase();
    return tasks.filter((task) => task.title.toLowerCase().includes(query) || task.description?.toLowerCase().includes(query));
  }, [tasks, search]);

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.assignedTo) {
      toast.error("Title and assignee are required");
      return;
    }

    setSaving(true);

    try {
      const selectedProgram = programs.find((program) => program.id === newTask.programId);

      await api.tasksPage.create({
        title: newTask.title,
        description: newTask.description,
        assigned_to: toApiId(newTask.assignedTo),
        program_id: newTask.programId === "none" ? null : newTask.programId,
        training_program_id: selectedProgram?.backendId ?? null,
        priority: newTask.priority,
        status: mapTaskStatusForApi("New"),
        due_date: newTask.dueDate,
        created_by: user?.portalId || user?.id || "system",
      });

      await loadTasks();
      setShowAddDialog(false);
      setNewTask(emptyTask);
      toast.success("Task created");
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    setSaving(true);

    try {
      await api.tasksPage.update(task.backendId, {
        title: task.title,
        description: task.description,
        assigned_to: toApiId(task.assignedTo),
        program_id: task.programId || null,
        training_program_id: task.trainingProgramId,
        priority: task.priority,
        status: mapTaskStatusForApi(newStatus),
        due_date: task.dueDate,
      });

      await loadTasks();
    } catch (error) {
      toast.error("Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    const selectedTask = tasks.find((task) => task.id === showCommentDialog);
    if (!selectedTask || !commentText.trim()) {
      return;
    }

    setSaving(true);

    try {
      await api.tasksPage.addComment(selectedTask.backendId, {
        text: commentText,
        author_name: user?.name || "User",
        author_portalid: user?.portalId || user?.id || "system",
      });

      await loadTasks();
      setCommentText("");
      setShowCommentDialog(null);
      toast.success("Comment added");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setSaving(false);
    }
  };

  const isOverdue = (task) => task.status !== "Done" && task.dueDate && new Date(task.dueDate) < new Date();

  const TaskCard = ({ task }) => (
    <Card className={cn("mb-3 border-l-4 transition-shadow hover:shadow-md", statusColors[task.status], isOverdue(task) && "ring-1 ring-destructive/30")}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground leading-tight">{task.title}</h4>
          <Badge className={cn("text-[10px] shrink-0", priorityColors[task.priority])}>{task.priority}</Badge>
        </div>
        {task.description ? <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p> : null}
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5"><User className="h-3 w-3" />{trainers.find((trainer) => trainer.id === task.assignedTo)?.name || "Unassigned"}</span>
          {task.dueDate ? <span className={cn("flex items-center gap-0.5", isOverdue(task) && "text-destructive font-medium")}><Calendar className="h-3 w-3" />{task.dueDate}</span> : null}
          {task.comments?.length > 0 ? <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{task.comments.length}</span> : null}
        </div>
        <div className="flex gap-1 pt-1">
          <Select value={task.status} onValueChange={(value) => handleStatusChange(task, value)}>
            <SelectTrigger className="h-6 text-[10px] w-auto flex-1" disabled={saving}><SelectValue /></SelectTrigger>
            <SelectContent>{taskStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
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
        <Input placeholder="Search tasks..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {taskStatuses.map((status) => {
          const count = filteredTasks.filter((task) => task.status === status).length;
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

      {loading ? (
        <Card><CardContent className="p-8 text-sm text-center text-muted-foreground">Loading tasks...</CardContent></Card>
      ) : view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {taskStatuses.map((status) => (
            <div key={status}>
              <h3 className={cn("text-sm font-bold mb-3 px-2", statusHeaderColors[status])}>{status} ({filteredTasks.filter((task) => task.status === status).length})</h3>
              <div className="space-y-0">
                {filteredTasks.filter((task) => task.status === status).map((task) => <TaskCard key={task.id} task={task} />)}
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
                    <td className="p-3 text-sm text-muted-foreground">{trainers.find((trainer) => trainer.id === task.assignedTo)?.name}</td>
                    <td className="p-3"><Badge className={cn("text-[10px]", priorityColors[task.priority])}>{task.priority}</Badge></td>
                    <td className="p-3">
                      <Select value={task.status} onValueChange={(value) => handleStatusChange(task, value)}>
                        <SelectTrigger className="h-7 text-xs w-[120px]" disabled={saving}><SelectValue /></SelectTrigger>
                        <SelectContent>{taskStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={newTask.title} onChange={(event) => setNewTask({ ...newTask, title: event.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={newTask.description} onChange={(event) => setNewTask({ ...newTask, description: event.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assign To</Label>
                <Select value={newTask.assignedTo} onValueChange={(value) => setNewTask({ ...newTask, assignedTo: value })}>
                  <SelectTrigger><SelectValue placeholder="Select trainer" /></SelectTrigger>
                  <SelectContent>{trainers.map((trainer) => <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{taskPriorities.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={newTask.dueDate} onChange={(event) => setNewTask({ ...newTask, dueDate: event.target.value })} />
              </div>
              <div>
                <Label>Program (optional)</Label>
                <Select value={newTask.programId} onValueChange={(value) => setNewTask({ ...newTask, programId: value })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {programs.map((program) => <SelectItem key={program.id} value={program.id}>{program.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={saving}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showCommentDialog} onOpenChange={() => setShowCommentDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Task Comments</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {tasks.find((task) => task.id === showCommentDialog)?.comments?.map((comment) => (
              <div key={comment.id} className="p-2 bg-muted rounded-lg">
                <p className="text-xs font-medium">{comment.author} <span className="text-muted-foreground font-normal">• {comment.date}</span></p>
                <p className="text-sm mt-1">{comment.text}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Add comment..." className="flex-1" />
            <Button onClick={handleAddComment} className="self-end" disabled={saving}>Post</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
