import { Link } from "react-router-dom";
import { Building2, CheckCircle2, ExternalLink, FlaskConical, LockKeyhole, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const operatorChecks = [
  "CH_API_KEY is stored only as an Edge Function secret for public company-data lookups",
  "CH_PRESENTER_ID and CH_PRESENTER_AUTH are stored only as Edge Function secrets",
  "CH_FILING_MODE remains test while XML gateway acceptance work is in progress",
  "CH_PRODUCTION_VALIDATED remains false until Companies House confirms testing is complete",
  "The presenter account, payment/credit arrangement and support contact are active",
];

export default function CompaniesHouseWizard() {
  return <div className="max-w-3xl space-y-6">
    <div><div className="flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold tracking-tight">Companies House integration</h1></div><p className="mt-1 text-sm text-muted-foreground">Gateway configuration and form-by-form test acceptance.</p></div>
    <Card className="border-info/30 bg-info/5"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">XML gateway test mode</CardTitle><CardDescription>CS01, AD01, AP01 and TM01 builders are currently available for testing.</CardDescription></div><Badge variant="outline" className="bg-info/10 text-info border-info/20"><FlaskConical className="mr-1 h-3 w-3" /> Test only</Badge></div></CardHeader><CardContent className="space-y-4 text-sm"><p>Company search/profile endpoints are separate from filing acceptance. Each marketed form must pass the Companies House test process before production mode is enabled.</p><Button asChild><Link to="/secretarial/workbench">Open secretarial workbench</Link></Button></CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><LockKeyhole className="h-4 w-4" /> Deployment-secret checklist</CardTitle><CardDescription>Presenter credentials belong in the deployment secret manager, never in a practice browser form.</CardDescription></CardHeader><CardContent><ul className="space-y-3">{operatorChecks.map(check=><li key={check} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{check}</span></li>)}</ul></CardContent></Card>
    <Card className="border-warning/30"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Filing boundary</CardTitle></CardHeader><CardContent className="space-y-4 text-sm leading-6"><p>Annual accounts iXBRL, incorporations and other secretarial forms are not covered by the four current XML builders. Test gateway responses are visibly recorded as test results and are not evidence of a live statutory filing.</p><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/regulatory-readiness">View readiness plan</Link></Button><Button asChild variant="ghost"><a href="https://www.gov.uk/government/publications/technical-interface-specifications-for-companies-house-software/important-information-for-software-developers-read-first" target="_blank" rel="noreferrer">Companies House test process <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a></Button></div></CardContent></Card>
  </div>;
}
