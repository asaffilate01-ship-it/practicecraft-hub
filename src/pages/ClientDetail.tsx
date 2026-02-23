import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Phone, Hash, FileText, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const entityLabels: Record<string, string> = {
  ltd: "Ltd Company", sole_trader: "Sole Trader", partnership: "Partnership",
  llp: "LLP", charity: "Charity", trust: "Trust",
};

const priorityColors: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-[hsl(38,92%,50%)] text-white",
  medium: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
};

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium", due_date: "" });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["client-tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("client_id", id!).order("due_date");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const addTask = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const { error } = await supabase.from("tasks").insert({
        tenant_id: profile.tenant_id,
        client_id: id,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        priority: taskForm.priority as any,
        due_date: taskForm.due_date || null,
        assigned_to_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tasks", id] });
      setShowAddTask(false);
      setTaskForm({ title: "", description: "", priority: "medium", due_date: "" });
      toast.success("Task created");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!client) {
    return <div className="py-20 text-center text-muted-foreground">Client not found</div>;
  }

  const infoItems = [
    { label: "Company No.", value: client.company_number, icon: Hash },
    { label: "VAT No.", value: client.vat_number, icon: FileText },
    { label: "Email", value: client.email, icon: Mail },
    { label: "Phone", value: client.phone, icon: Phone },
  ].filter(item => item.value);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{client.legal_name}</h1>
            <Badge variant="secondary" className="text-xs">{entityLabels[client.entity_type] || client.entity_type}</Badge>
            <Badge variant="default" className="text-xs capitalize">{client.status}</Badge>
          </div>
          {client.trading_name && <p className="text-sm text-muted-foreground mt-0.5">t/a {client.trading_name}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/clients`)}>
          <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
        </Button>
      </div>

      {infoItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {infoItems.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Icon className="w-3.5 h-3.5" /> {label}</div>
              <p className="font-semibold text-sm">{value}</p>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="bookkeeping">Bookkeeping</TabsTrigger>
          <TabsTrigger value="vat">VAT</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Client Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Entity Type:</span> <span className="font-medium ml-2">{entityLabels[client.entity_type]}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="font-medium ml-2 capitalize">{client.status}</span></div>
                {client.utr && <div><span className="text-muted-foreground">UTR:</span> <span className="font-medium ml-2">{client.utr}</span></div>}
                {client.nino && <div><span className="text-muted-foreground">NINO:</span> <span className="font-medium ml-2">{client.nino}</span></div>}
                {client.paye_reference && <div><span className="text-muted-foreground">PAYE Ref:</span> <span className="font-medium ml-2">{client.paye_reference}</span></div>}
                {client.charity_number && <div><span className="text-muted-foreground">Charity No:</span> <span className="font-medium ml-2">{client.charity_number}</span></div>}
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Created: {new Date(client.created_at).toLocaleDateString("en-GB")} · Updated: {new Date(client.updated_at).toLocaleDateString("en-GB")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setShowAddTask(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Task
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No tasks for this client yet.</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.due_date ? `Due: ${new Date(t.due_date).toLocaleDateString("en-GB")}` : "No due date"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-[10px] px-1.5 py-0", priorityColors[t.priority])}>{t.priority}</Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{t.status.replace("_", " ")}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {["bookkeeping", "vat", "payroll", "documents"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <Card className="py-12 text-center">
              <p className="text-sm text-muted-foreground">This module will be connected in a future update.</p>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task for {client.legal_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Prepare VAT return" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Details..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
            <Button onClick={() => addTask.mutate()} disabled={!taskForm.title.trim() || addTask.isPending}>
              {addTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
