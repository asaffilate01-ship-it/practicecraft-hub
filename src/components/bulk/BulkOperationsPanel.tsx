import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ListChecks, Send, Trash2, Loader2, CheckSquare, FileText, Users } from "lucide-react";

export function BulkOperationsPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bulkAction, setBulkAction] = useState<"tasks" | "comms" | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [commSubject, setCommSubject] = useState("");
  const [commBody, setCommBody] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("tenant_id").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-bulk"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, legal_name, entity_type, email").eq("status", "active").order("legal_name");
      if (error) throw error;
      return data;
    },
  });

  const toggleClient = (id: string) => {
    setSelectedClients(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map(c => c.id));
    }
  };

  const bulkTaskMut = useMutation({
    mutationFn: async () => {
      if (!taskTitle.trim() || selectedClients.length === 0) throw new Error("Title and clients required");
      const rows = selectedClients.map(clientId => ({
        tenant_id: profile!.tenant_id,
        client_id: clientId,
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        priority: taskPriority as "low" | "medium" | "high" | "urgent",
        due_date: taskDueDate || null,
        status: "todo" as const,
      }));
      const { error } = await supabase.from("tasks").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Created ${selectedClients.length} tasks`);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setBulkAction(null);
      setTaskTitle("");
      setTaskDescription("");
      setSelectedClients([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkCommMut = useMutation({
    mutationFn: async () => {
      if (!commSubject.trim() || !commBody.trim() || selectedClients.length === 0) {
        throw new Error("Subject, message, and clients required");
      }
      // Create a message thread for each client
      for (const clientId of selectedClients) {
        const { data: thread, error: tErr } = await supabase.from("message_threads").insert({
          tenant_id: profile!.tenant_id,
          client_id: clientId,
          subject: commSubject.trim(),
          created_by_user_id: user!.id,
          status: "open",
        }).select().single();
        if (tErr) throw tErr;

        const { error: mErr } = await supabase.from("messages").insert({
          tenant_id: profile!.tenant_id,
          thread_id: thread.id,
          sender_user_id: user!.id,
          sender_type: "staff",
          body: commBody.trim(),
          is_internal: false,
        });
        if (mErr) throw mErr;
      }
    },
    onSuccess: () => {
      toast.success(`Sent to ${selectedClients.length} clients`);
      setBulkAction(null);
      setCommSubject("");
      setCommBody("");
      setSelectedClients([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setBulkAction("tasks")} className="gap-1.5">
          <ListChecks className="w-4 h-4" /> Bulk Create Tasks
        </Button>
        <Button variant="outline" size="sm" onClick={() => setBulkAction("comms")} className="gap-1.5">
          <Send className="w-4 h-4" /> Bulk Message Clients
        </Button>
      </div>

      <Dialog open={bulkAction !== null} onOpenChange={() => setBulkAction(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{bulkAction === "tasks" ? "Bulk Create Tasks" : "Bulk Message Clients"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Client selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Clients ({selectedClients.length} selected)</Label>
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">
                  {selectedClients.length === clients.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="border rounded-lg max-h-40 overflow-y-auto p-2 space-y-1">
                {clients.map(c => (
                  <label key={c.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted cursor-pointer text-sm">
                    <Checkbox checked={selectedClients.includes(c.id)} onCheckedChange={() => toggleClient(c.id)} />
                    <span>{c.legal_name}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">{c.entity_type}</Badge>
                  </label>
                ))}
              </div>
            </div>

            {bulkAction === "tasks" && (
              <>
                <div className="space-y-1.5">
                  <Label>Task Title</Label>
                  <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Q4 VAT Review" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description (optional)</Label>
                  <Textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select value={taskPriority} onValueChange={setTaskPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due Date</Label>
                    <Input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {bulkAction === "comms" && (
              <>
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Input value={commSubject} onChange={e => setCommSubject(e.target.value)} placeholder="e.g. Year-end reminder" />
                </div>
                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <Textarea value={commBody} onChange={e => setCommBody(e.target.value)} rows={4} placeholder="Type your message…" />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAction(null)}>Cancel</Button>
            {bulkAction === "tasks" ? (
              <Button onClick={() => bulkTaskMut.mutate()} disabled={bulkTaskMut.isPending || !taskTitle.trim() || selectedClients.length === 0} className="gap-1.5">
                {bulkTaskMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                Create {selectedClients.length} Tasks
              </Button>
            ) : (
              <Button onClick={() => bulkCommMut.mutate()} disabled={bulkCommMut.isPending || !commSubject.trim() || !commBody.trim() || selectedClients.length === 0} className="gap-1.5">
                {bulkCommMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send to {selectedClients.length} Clients
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
