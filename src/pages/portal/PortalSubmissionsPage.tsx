import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MOCK_SUBMISSIONS = [
  { id: "s1", provider: "HMRC", type: "VAT Return Q3", status: "accepted", at: "2026-01-10T12:00:00Z" },
  { id: "s2", provider: "Companies House", type: "Confirmation Statement", status: "accepted", at: "2025-11-20T09:30:00Z" },
  { id: "s3", provider: "HMRC", type: "RTI FPS Month 10", status: "pending", at: "2026-02-01T08:00:00Z" },
];

export default function PortalSubmissionsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Submissions</h1>
        <p className="text-sm text-muted-foreground">Status of filings submitted on your behalf.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium text-muted-foreground px-4 py-2">
            <div className="col-span-3">Provider</div>
            <div className="col-span-4">Type</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">When</div>
          </div>
          {MOCK_SUBMISSIONS.map((r) => (
            <div key={r.id} className="grid grid-cols-12 px-4 py-3 border-t text-sm items-center">
              <div className="col-span-3 text-muted-foreground">{r.provider}</div>
              <div className="col-span-4 font-medium">{r.type}</div>
              <div className="col-span-2">
                <Badge variant={r.status === "accepted" ? "secondary" : "outline"}>{r.status}</Badge>
              </div>
              <div className="col-span-3 text-xs text-muted-foreground">{new Date(r.at).toLocaleString()}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
