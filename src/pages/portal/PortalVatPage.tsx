import { Card, CardContent } from "@/components/ui/card";

const MOCK_VAT = {
  vrn: "GB 123 4567 89",
  lastReturn: { period: "Q3 2025/26 (Oct-Dec)", status: "Submitted" },
  nextObligation: { period: "Q4 2025/26 (Jan-Mar)", dueDate: "2026-05-07" },
};

export default function PortalVatPage() {
  const s = MOCK_VAT;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">VAT</h1>
        <p className="text-sm text-muted-foreground">MTD status and obligations overview.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="text-sm font-semibold">VAT Summary</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">VRN</div>
                <div className="text-sm font-semibold">{s.vrn}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Last return</div>
                <div className="text-sm font-semibold">{s.lastReturn.period}</div>
                <div className="text-xs text-muted-foreground">{s.lastReturn.status}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Next obligation</div>
                <div className="text-sm font-semibold">{s.nextObligation.period}</div>
                <div className="text-xs text-muted-foreground">Due: {s.nextObligation.dueDate}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
