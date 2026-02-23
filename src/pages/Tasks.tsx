import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

const columns = [
  { key: "todo", label: "To Do", color: "bg-muted-foreground" },
  { key: "in_progress", label: "In Progress", color: "bg-[hsl(38,92%,50%)]" },
  { key: "awaiting_client", label: "Awaiting Client", color: "bg-[hsl(217,91%,60%)]" },
  { key: "awaiting_hmrc", label: "Awaiting HMRC", color: "bg-[hsl(280,65%,60%)]" },
  { key: "done", label: "Done", color: "bg-[hsl(142,71%,45%)]" },
];

const priorityColors: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-[hsl(38,92%,50%)] text-white",
  medium: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
};

const emptyForm = { title: "", description: "", priority: "medium", due_date: "", client_id: "" };

export default function Tasks() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*, clients(legal_name)").order("due_date");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, legal_name").order("legal_name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const addTask = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const { error } = await supabase.from("tasks").insert({
        tenant_id: profile.tenant_id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority as any,
        due_date: form.due_date || null,
        client_id: form.client_id || null,
        assigned_to_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowAdd(false);
      setForm(emptyForm);
      toast.success("Task created");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTask = useMutation({
    mutationFn: async () => {
      if (!editTask) return;
      const { error } = await supabase.from("tasks").update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority as any,
        due_date: form.due_date || null,
        client_id: form.client_id || null,
      }).eq("id", editTask.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditTask(null);
      setForm(emptyForm);
      toast.success("Task updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditTask(null);
      toast.success("Task deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === "done") updateData.completed_at = new Date().toISOString();
      else updateData.completed_at = null;
      const { error } = await supabase.from("tasks").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e) => toast.error(e.message),
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const taskId = result.draggableId;
    const task = tasks.find((t: any) => t.id === taskId);
    if (task && task.status !== newStatus) {
      updateStatus.mutate({ id: taskId, status: newStatus });
    }
  };

  const openEdit = (task: any) => {
    setForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      due_date: task.due_date || "",
      client_id: task.client_id || "",
    });
    setEditTask(task);
  };

  const tasksByStatus = columns.reduce((acc, col) => {
    acc[col.key] = tasks.filter((t: any) => t.status === col.key);
    return acc;
  }, {} as Record<string, any[]>);

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toDateString());
  };

  const TaskForm = ({ onSubmit, submitLabel, isPending }: { onSubmit: () => void; submitLabel: string; isPending: boolean }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Prepare Q4 VAT return" />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Additional details..." rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>
              {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Due Date</Label>
        <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { setShowAdd(false); setEditTask(null); setForm(emptyForm); }}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!form.title.trim() || isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Drag cards between columns to update status</p>
        </div>
        <Button className="gap-2" onClick={() => { setForm(emptyForm); setShowAdd(true); }}>
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading tasks...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {columns.map((col) => (
              <div key={col.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", col.color)} />
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <span className="text-xs text-muted-foreground ml-auto">{tasksByStatus[col.key]?.length || 0}</span>
                </div>
                <Droppable droppableId={col.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "space-y-2 min-h-[120px] rounded-lg p-1 transition-colors",
                        snapshot.isDraggingOver && "bg-accent/50"
                      )}
                    >
                      {tasksByStatus[col.key]?.map((task: any, index: number) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "p-3 cursor-grab hover:shadow-md transition-shadow group",
                                snapshot.isDragging && "shadow-lg rotate-2"
                              )}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <p className="text-sm font-medium mb-1 flex-1">{task.title}</p>
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEdit(task); }}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
                                >
                                  <Pencil className="w-3 h-3 text-muted-foreground" />
                                </button>
                              </div>
                              {task.clients && <p className="text-xs text-muted-foreground mb-1">{task.clients.legal_name}</p>}
                              <div className="flex items-center justify-between">
                                {task.due_date && (
                                  <span className={cn("text-xs", isOverdue(task.due_date) && task.status !== "done" ? "text-destructive font-medium" : "text-muted-foreground")}>
                                    {isOverdue(task.due_date) && task.status !== "done" ? "⚠ " : ""}
                                    Due: {new Date(task.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                  </span>
                                )}
                                <Badge className={cn("text-[10px] px-1.5 py-0", priorityColors[task.priority])}>{task.priority}</Badge>
                              </div>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Add Task Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
          <TaskForm onSubmit={() => addTask.mutate()} submitLabel="Create Task" isPending={addTask.isPending} />
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onOpenChange={(open) => { if (!open) { setEditTask(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Edit Task</DialogTitle>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteTask.mutate(editTask?.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          <TaskForm onSubmit={() => updateTask.mutate()} submitLabel="Save Changes" isPending={updateTask.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
