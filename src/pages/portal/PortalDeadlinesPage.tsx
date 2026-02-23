import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MOCK_DEADLINES = [
  { id: "d1", title: "VAT Return Q4 2025/26", module: "VAT", dueDate: "2026-03-31", status: "pending" },
  { id: "d2", title: "Corporation Tax CT600", module: "CT", dueDate: "2026-04-01", status: "pending" },
  { id: "d3", title: "Confirmation Statement", module: "Secretarial", dueDate: "2026-05-15", status: "upcoming" },
  { id: "d4", title: "Annual Accounts", module: "Accounts", dueDate: "2026-06-30", status: "upcoming" },
  { id: "d5", title: "Self Assessment 2025/26", module: "SA", dueDate: "2027-01-31", status: "upcoming" },
  { id: "d6", title: "Payroll RTI EPS", module: "Payroll", dueDate: "2026-04-19", status: "pending" },
];

export default function PortalDeadlinesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Deadlines</h1>
        <p className="text-sm text-muted-foreground">Your upcoming submissions and due dates.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium text-muted-foreground px-4 py-2">
            <div className="col-span-5">Title</div>
            <div className="col-span-2">Module</div>
            <div className="col-span-3">Due</div>
            <div className="col-span-2">Status</div>
          </div>
          {MOCK_DEADLINES.map((d) => (
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
