import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, FlaskConical, LockKeyhole, Receipt, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const operatorChecks = [
  "HMRC_CLIENT_ID and HMRC_CLIENT_SECRET are held only as Edge Function secrets",
  "HMRC_REDIRECT_URI exactly matches the Developer Hub application callback",
  "HMRC_TOKEN_ENCRYPTION_KEY is configured and backed up in the secret manager",
  "HMRC_BASE_URL and HMRC_AUTH_URL point to the sandbox until production credentials are granted",
  "HMRC vendor product, version and public-IP values are configured",
  "HMRC_PRODUCTION_VALIDATED remains false until recognition testing has passed",
];

export default function HmrcWizard() {
  return <div className="max-w-3xl space-y-6">
    <div><div className="flex items-center gap-2"><Receipt className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold tracking-tight">HMRC integration</h1></div><p className="mt-1 text-sm text-muted-foreground">Platform configuration and client authorisation without exposing application secrets.</p></div>
    <Card className="border-info/30 bg-info/5"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">VAT MTD sandbox journey</CardTitle><CardDescription>Client OAuth is available from the VAT workspace.</CardDescription></div><Badge variant="outline" className="bg-info/10 text-info border-info/20"><FlaskConical className="mr-1 h-3 w-3" /> Sandbox</Badge></div></CardHeader><CardContent className="space-y-4 text-sm"><p>Select a VAT-registered client, connect their HMRC account, sync obligations, review the nine boxes and file using the exact obligation period key.</p><Button asChild><Link to="/vat">Open VAT workspace</Link></Button></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><LockKeyhole className="h-4 w-4" /> Deployment-secret checklist</CardTitle><CardDescription>For an authorised platform operator; values are never entered in this browser.</CardDescription></CardHeader><CardContent><ul className="space-y-3">{operatorChecks.map(check=><li key={check} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{check}</span></li>)}</ul></CardContent></Card>
    <Card className="border-warning/30"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Recognition boundary</CardTitle></CardHeader><CardContent className="space-y-4 text-sm leading-6"><p>VAT remains labelled sandbox until the full HMRC scenario pack, fraud-prevention-header tests, accessibility/security evidence and production checklist pass. PAYE RTI, Corporation Tax, Self Assessment and MTD Income Tax require separate products and test journeys.</p><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/regulatory-readiness">View readiness plan</Link></Button><Button asChild variant="ghost"><a href="https://developer.service.hmrc.gov.uk/guides/vat-mtd-end-to-end-service-guide/" target="_blank" rel="noreferrer">HMRC VAT guide <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a></Button></div></CardContent></Card>
  </div>;
}
