import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, Mail, Phone, Hash, FileText } from "lucide-react";

const entityLabels: Record<string, string> = {
  ltd: "Ltd Company", sole_trader: "Sole Trader", partnership: "Partnership",
  llp: "LLP", charity: "Charity", trust: "Trust",
};

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!client) {
    return <div className="py-20 text-center text-muted-foreground">Client not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
      </div>

      {/* Key Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {client.company_number && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Hash className="w-3.5 h-3.5" /> Company No.</div>
            <p className="font-semibold">{client.company_number}</p>
          </Card>
        )}
        {client.vat_number && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><FileText className="w-3.5 h-3.5" /> VAT No.</div>
            <p className="font-semibold">{client.vat_number}</p>
          </Card>
        )}
        {client.email && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Mail className="w-3.5 h-3.5" /> Email</div>
            <p className="font-semibold text-sm">{client.email}</p>
          </Card>
        )}
        {client.phone && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Phone className="w-3.5 h-3.5" /> Phone</div>
            <p className="font-semibold">{client.phone}</p>
          </Card>
        )}
      </div>

      {/* Tabs */}
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
                Created: {new Date(client.created_at).toLocaleDateString("en-GB")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
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
                      <Badge variant="secondary" className="text-xs capitalize">{t.status.replace("_", " ")}</Badge>
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
    </div>
  );
}
