import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MessageSquare, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PortalMessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Get portal user's client_id and tenant_id
  const { data: portalUser } = useQuery({
    queryKey: ["portal-user", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_users")
        .select("client_id, tenant_id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["portal-threads", portalUser?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_threads")
        .select("*")
        .eq("client_id", portalUser!.client_id!)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!portalUser?.client_id,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!subject.trim() || !body.trim()) throw new Error("Subject and message required");
      // Create thread
      const { data: thread, error: tErr } = await supabase
        .from("message_threads")
        .insert({
          tenant_id: portalUser!.tenant_id,
          client_id: portalUser!.client_id!,
          subject: subject.trim(),
          created_by_user_id: user!.id,
          status: "open",
        })
        .select()
        .single();
      if (tErr) throw tErr;
      // Create first message
      const { error: mErr } = await supabase.from("messages").insert({
        tenant_id: portalUser!.tenant_id,
        thread_id: thread.id,
        sender_user_id: user!.id,
        sender_type: "client",
        body: body.trim(),
        is_internal: false,
      });
      if (mErr) throw mErr;
    },
    onSuccess: () => {
      toast.success("Message sent");
      queryClient.invalidateQueries({ queryKey: ["portal-threads"] });
      setCreateOpen(false);
      setSubject("");
      setBody("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground">Chat with your practice team.</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> New message
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium text-muted-foreground px-4 py-2">
            <div className="col-span-7">Subject</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Last message</div>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <MessageSquare className="w-8 h-8 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            </div>
          ) : (
            threads.map((t: any) => (
              <div key={t.id} className="grid grid-cols-12 px-4 py-3 border-t text-sm items-center">
                <div className="col-span-7 font-medium">
                  <Link className="text-primary hover:underline" to={`/portal/messages/${t.id}`}>
                    {t.subject}
                  </Link>
                </div>
                <div className="col-span-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.status === "open" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {t.status}
                  </span>
                </div>
                <div className="col-span-3 text-xs text-muted-foreground">
                  {new Date(t.last_message_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Message</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. VAT Return query" />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
