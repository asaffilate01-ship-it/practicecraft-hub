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
import { Plus, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

export default function Tasks() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_date: "", client_id: "" });

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
      setForm({ title: "", description: "", priority: "medium", due_date: "", client_id: "" });
      toast.success("Task created");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === "done") updateData.completed_at = new Date().toISOString();
      const { error } = await supabase.from("tasks").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e) => toast.error(e.message),
  });

  const tasksByStatus = columns.reduce((acc, col) => {
    acc[col.key] = tasks.filter((t: any) => t.status === col.key);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Workflow & deadline management</p>
        </div>
        <Button className="gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add Task
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading tasks...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {columns.map((col) => (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full", col.color)} />
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs text-muted-foreground ml-auto">{tasksByStatus[col.key]?.length || 0}</span>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {tasksByStatus[col.key]?.map((task: any) => (
                  <Card key={task.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow group">
                    <p className="text-sm font-medium mb-1">{task.title}</p>
                    {task.clients && <p className="text-xs text-muted-foreground mb-1">{task.clients.legal_name}</p>}
                    <div className="flex items-center justify-between mb-2">
                      {task.due_date && <span className="text-xs text-muted-foreground">Due: {new Date(task.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                      <Badge className={cn("text-[10px] px-1.5 py-0", priorityColors[task.priority])}>{task.priority}</Badge>
                    </div>
                    {/* Quick status change */}
                    <div className="hidden group-hover:flex gap-1 flex-wrap">
                      {columns.filter((c) => c.key !== task.status).slice(0, 3).map((c) => (
                        <button
                          key={c.key}
                          onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: task.id, status: c.key }); }}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-accent transition-colors"
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addTask.mutate()} disabled={!form.title.trim() || addTask.isPending}>
              {addTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
