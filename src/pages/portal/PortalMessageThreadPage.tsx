import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Send } from "lucide-react";

export default function PortalMessageThreadPage() {
  const { threadId = "" } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: portalUser } = useQuery({
    queryKey: ["portal-user", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("portal_users")
        .select("client_id, tenant_id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: thread } = useQuery({
    queryKey: ["thread-detail", threadId],
    queryFn: async () => {
      const { data } = await supabase
        .from("message_threads")
        .select("*")
        .eq("id", threadId)
        .single();
      return data;
    },
    enabled: !!threadId,
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .eq("is_internal", false) // portal users don't see internal notes
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!threadId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["thread-messages", threadId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!text.trim() || !portalUser) return;
      const { error } = await supabase.from("messages").insert({
        tenant_id: portalUser.tenant_id,
        thread_id: threadId,
        sender_user_id: user!.id,
        sender_type: "client",
        body: text.trim(),
        is_internal: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["thread-messages", threadId] });
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/portal/messages">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{thread?.subject ?? "Thread"}</h1>
          <p className="text-xs text-muted-foreground capitalize">{thread?.status}</p>
        </div>
      </div>

      <Card className="min-h-[300px] max-h-[500px] overflow-y-auto">
        <CardContent className="p-4 space-y-3">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
          )}
          {messages.map((m: any) => {
            const isClient = m.sender_type === "client";
            return (
              <div key={m.id} className={cn("max-w-[75%]", isClient && "ml-auto text-right")}>
                <div className="text-[10px] text-muted-foreground mb-0.5">
                  {new Date(m.created_at).toLocaleString()} • {isClient ? "You" : "Practice"}
                </div>
                <div
                  className={cn(
                    "inline-block px-3 py-2 rounded-lg text-sm",
                    isClient
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {m.body}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </CardContent>
      </Card>

      {thread?.status !== "closed" && (
        <Card>
          <CardContent className="p-4">
            <Textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your reply…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMut.mutate();
                }
              }}
            />
            <div className="mt-2 flex justify-end">
              <Button disabled={!text.trim() || sendMut.isPending} onClick={() => sendMut.mutate()} className="gap-1.5">
                {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
