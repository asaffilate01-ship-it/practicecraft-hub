import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBranding } from "@/portal/branding/BrandingProvider";

// Mock data
const MOCK_SUMMARY = {
  clientName: "Kitchen313 Group Ltd",
  practiceName: "IQ Advisory",
  nextDeadline: { title: "VAT Return Q4", dueDate: "2026-03-31" },
  alerts: [
    { id: "a1", text: "Receipts needed for February expenses", severity: "warning" },
    { id: "a2", text: "Corporation Tax payment due in 14 days", severity: "urgent" },
  ],
};

const MOCK_DEADLINES = [
  { id: "d1", title: "VAT Return Q4 2025/26", module: "VAT", dueDate: "2026-03-31", status: "pending" },
  { id: "d2", title: "Corporation Tax CT600", module: "CT", dueDate: "2026-04-01", status: "pending" },
  { id: "d3", title: "Confirmation Statement", module: "Secretarial", dueDate: "2026-05-15", status: "upcoming" },
  { id: "d4", title: "Annual Accounts", module: "Accounts", dueDate: "2026-06-30", status: "upcoming" },
  { id: "d5", title: "Self Assessment 2025/26", module: "SA", dueDate: "2027-01-31", status: "upcoming" },
];

export default function PortalHomePage() {
  const branding = useBranding();
  const s = MOCK_SUMMARY;
  const deadlines = MOCK_DEADLINES;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Home</h1>
          <p className="text-sm text-muted-foreground">Overview of deadlines, messages, and payments.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/portal/documents">Upload documents</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/portal/messages">Message practice</Link>
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Client</div>
            <div className="text-sm font-semibold">{s.clientName}</div>
            <div className="text-xs text-muted-foreground">Practice: {s.practiceName}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Next deadline</div>
            <div className="text-sm font-semibold">{s.nextDeadline.title}</div>
            <div className="text-xs text-muted-foreground">Due: {s.nextDeadline.dueDate}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Open deadlines</div>
            <div className="text-2xl font-semibold">{deadlines.filter((d) => d.status !== "completed").length}</div>
            <div className="text-xs text-muted-foreground">Keep these green to avoid penalties.</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Alerts</div>
            <div className="text-2xl font-semibold">{s.alerts.length}</div>
            <div className="text-xs text-muted-foreground">Uploads / approvals / reminders</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-3">Alerts</div>
          <div className="space-y-2">
            {s.alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                <span className="text-sm">{a.text}</span>
                <Badge variant={a.severity === "urgent" ? "destructive" : "secondary"}>{a.severity}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deadlines table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <span className="text-sm font-semibold">Upcoming deadlines</span>
            <Link to="/portal/deadlines" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium text-muted-foreground px-4 py-2">
            <div className="col-span-5">Title</div>
            <div className="col-span-2">Module</div>
            <div className="col-span-3">Due</div>
            <div className="col-span-2">Status</div>
          </div>
          {deadlines.slice(0, 6).map((d) => (
            <div key={d.id} className="grid grid-cols-12 px-4 py-3 border-t text-sm items-center">
              <div className="col-span-5 font-medium">{d.title}</div>
              <div className="col-span-2 text-muted-foreground">{d.module}</div>
              <div className="col-span-3 text-muted-foreground">{d.dueDate}</div>
              <div className="col-span-2">
                <Badge variant="outline">{d.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
