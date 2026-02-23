import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DueDatePill } from "@/components/ui/due-date-pill";
import { useBranding } from "@/portal/branding/BrandingProvider";
import {
  CalendarClock, FileText, MessageSquare, Upload,
  AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";

export default function PortalHomePage() {
  const branding = useBranding();
  const { user } = useAuth();

  // Get portal user's client + tenant
  const { data: portalUser } = useQuery({
    queryKey: ["portal-user", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_users")
        .select("client_id, tenant_id, portal_role, clients(legal_name)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const clientId = portalUser?.client_id;
  const tenantId = portalUser?.tenant_id;

  // Upcoming deadlines from accounts_periods + tasks
  const { data: deadlines = [] } = useQuery({
    queryKey: ["portal-deadlines", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, due_date, status, service")
        .eq("client_id", clientId!)
        .in("status", ["todo", "in_progress", "awaiting_client"])
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(8);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Recent invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["portal-invoices-summary", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, total_pence, status, due_date, issued_at")
        .eq("client_id", clientId!)
        .order("issued_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Document requests awaiting client
  const { data: docRequests = [] } = useQuery({
    queryKey: ["portal-doc-requests", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_requests")
        .select("id, title, due_date, status")
        .eq("client_id", clientId!)
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  // Unread message threads
  const { data: threads = [] } = useQuery({
    queryKey: ["portal-threads-summary", tenantId, clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_threads")
        .select("id, subject, last_message_at")
        .eq("client_id", clientId!)
        .order("last_message_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const clientName = (portalUser?.clients as any)?.legal_name ?? "Your Company";
  const practiceName = branding?.practiceName ?? "Your Practice";
  const openDeadlines = deadlines.length;
  const pendingDocs = docRequests.length;
  const unpaidInvoices = invoices.filter((i: any) => i.status === "issued" || i.status === "overdue").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Home</h1>
          <p className="text-sm text-muted-foreground">Overview of deadlines, messages, and payments.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/portal/documents"><Upload className="w-3.5 h-3.5 mr-1.5" /> Upload documents</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/portal/messages"><MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Message practice</Link>
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Client</div>
            <div className="text-sm font-semibold">{clientName}</div>
            <div className="text-xs text-muted-foreground">Practice: {practiceName}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4 text-warning" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Open deadlines</div>
              <div className="text-2xl font-semibold">{openDeadlines}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Documents needed</div>
              <div className="text-2xl font-semibold">{pendingDocs}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Unpaid invoices</div>
              <div className="text-2xl font-semibold">{unpaidInvoices}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document requests (alerts) */}
      {pendingDocs > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-semibold mb-3">Documents requested by your practice</div>
            <div className="space-y-2">
              {docRequests.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                  <span className="text-sm">{r.title}</span>
                  <div className="flex items-center gap-2">
                    {r.due_date && <DueDatePill dueDate={r.due_date} />}
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/portal/documents">Upload</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deadlines table */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="text-sm font-semibold">Upcoming deadlines</span>
              <Link to="/portal/deadlines" className="text-sm text-primary hover:underline">View all</Link>
            </div>
            {deadlines.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No upcoming deadlines 🎉</p>
              </div>
            ) : (
              <>
                {deadlines.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between px-4 py-3 border-t text-sm">
                    <div>
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-muted-foreground capitalize">{d.service?.replace(/_/g, " ") || "General"}</div>
                    </div>
                    {d.due_date && <DueDatePill dueDate={d.due_date} />}
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent invoices */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="text-sm font-semibold">Recent invoices</span>
              <Link to="/portal/invoices" className="text-sm text-primary hover:underline">View all</Link>
            </div>
            {invoices.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No invoices yet.</p>
              </div>
            ) : (
              <>
                {invoices.map((inv: any) => (
                  <Link key={inv.id} to={`/portal/invoices/${inv.id}`} className="flex items-center justify-between px-4 py-3 border-t text-sm hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="font-medium">{inv.invoice_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">£{((inv.total_pence || 0) / 100).toFixed(2)}</span>
                      <Badge variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"} className="text-xs capitalize">
                        {inv.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent messages */}
      {threads.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="text-sm font-semibold">Recent messages</span>
              <Link to="/portal/messages" className="text-sm text-primary hover:underline">View all</Link>
            </div>
            {threads.map((t: any) => (
              <Link key={t.id} to={`/portal/messages/${t.id}`} className="flex items-center justify-between px-4 py-3 border-t text-sm hover:bg-muted/50 transition-colors">
                <div className="font-medium">{t.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {t.last_message_at ? new Date(t.last_message_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
