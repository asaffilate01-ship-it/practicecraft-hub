import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { SecretarialTab } from "@/components/client/SecretarialTab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export default function CompanySecretarialRecord() {
  const { clientId = "" } = useParams();
  const { data: client, isLoading } = useQuery({
    queryKey: ["secretarial-company-client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,legal_name,company_number,entity_type,status")
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>;

  if (!client) {
    return (
      <div className="workspace-panel flex min-h-72 flex-col items-center justify-center p-8 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/40" />
        <h1 className="mt-4 text-xl font-semibold">Company record unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">This company is not available in your practice tenant.</p>
        <Button asChild variant="outline" className="mt-5"><Link to="/secretarial">Return to portfolio</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2 text-muted-foreground"><Link to="/secretarial"><ArrowLeft className="mr-1.5 h-4 w-4" /> Company portfolio</Link></Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{client.legal_name}</h1>
            <Badge variant="outline" className="capitalize">{client.entity_type.replace(/_/g, " ")}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Single company record, statutory registers, approvals and filing evidence.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to={`/clients/${client.id}`}>Full client record</Link></Button>
          {client.company_number && <Button asChild variant="outline"><a href={`https://find-and-update.company-information.service.gov.uk/company/${client.company_number}`} target="_blank" rel="noreferrer">Companies House <ExternalLink className="ml-1.5 h-4 w-4" /></a></Button>}
        </div>
      </section>

      <SecretarialTab clientId={client.id} companyNumber={client.company_number} />
    </div>
  );
}
