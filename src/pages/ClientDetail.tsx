import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Phone, Hash, FileText, Pencil, KeyRound } from "lucide-react";
import { SecretarialTab } from "@/components/client/SecretarialTab";
import { TasksTab } from "@/components/client/TasksTab";
import { DocumentsTab } from "@/components/client/DocumentsTab";
import { BookkeepingTab } from "@/components/client/BookkeepingTab";
import { VatTab } from "@/components/client/VatTab";
import { PayrollTab } from "@/components/client/PayrollTab";
import { CredentialsTab } from "@/components/client/CredentialsTab";

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

  const { data: taskCount = 0 } = useQuery({
    queryKey: ["client-tasks-count", id],
    queryFn: async () => {
      const { count, error } = await supabase.from("tasks").select("*", { count: "exact", head: true }).eq("client_id", id!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!id,
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
          <TabsTrigger value="tasks">Tasks ({taskCount})</TabsTrigger>
          <TabsTrigger value="secretarial">Secretarial</TabsTrigger>
          <TabsTrigger value="bookkeeping">Bookkeeping</TabsTrigger>
          <TabsTrigger value="vat">VAT</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="credentials" className="gap-1"><KeyRound className="w-3 h-3" /> Credentials</TabsTrigger>
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

        <TabsContent value="tasks" className="mt-4">
          <TasksTab clientId={id!} clientName={client.legal_name} />
        </TabsContent>

        <TabsContent value="secretarial" className="mt-4">
          <SecretarialTab clientId={id!} companyNumber={client.company_number} />
        </TabsContent>

        <TabsContent value="bookkeeping" className="mt-4">
          <BookkeepingTab clientId={id!} />
        </TabsContent>

        <TabsContent value="vat" className="mt-4">
          <VatTab clientId={id!} />
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <PayrollTab clientId={id!} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab clientId={id!} />
        </TabsContent>

        <TabsContent value="credentials" className="mt-4">
          <CredentialsTab clientId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
