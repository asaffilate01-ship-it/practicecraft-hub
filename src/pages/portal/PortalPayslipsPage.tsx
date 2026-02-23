import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const MOCK_PAYSLIPS = [
  { id: "ps-1", period: "Month 10 – Jan 2026", payDate: "2026-01-31", netPayPence: 285000 },
  { id: "ps-2", period: "Month 11 – Feb 2026", payDate: "2026-02-28", netPayPence: 285000 },
  { id: "ps-3", period: "Month 9 – Dec 2025", payDate: "2025-12-31", netPayPence: 290000 },
];

export default function PortalPayslipsPage() {
  const [selected, setSelected] = useState<typeof MOCK_PAYSLIPS[0] | null>(null);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Payslips</h1>
        <p className="text-sm text-muted-foreground">View and download your payslips.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 bg-muted/50 text-xs font-medium text-muted-foreground px-4 py-2">
            <div className="col-span-4">Period</div>
            <div className="col-span-4">Pay date</div>
            <div className="col-span-3">Net pay</div>
            <div className="col-span-1 text-right">View</div>
          </div>
          {MOCK_PAYSLIPS.map((p) => (
            <div key={p.id} className="grid grid-cols-12 px-4 py-3 border-t text-sm items-center">
              <div className="col-span-4 font-medium">{p.period}</div>
              <div className="col-span-4 text-muted-foreground">{p.payDate}</div>
              <div className="col-span-3">£{(p.netPayPence / 100).toFixed(2)}</div>
              <div className="col-span-1 text-right">
                <Button variant="outline" size="sm" onClick={() => setSelected(p)}>View</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Payslip</SheetTitle>
            <SheetDescription>{selected?.period}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Period</div>
                  <div className="text-sm font-semibold">{selected.period}</div>
                  <div className="text-xs text-muted-foreground mt-1">Pay date: {selected.payDate}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">Net pay</div>
                  <div className="text-3xl font-semibold">£{(selected.netPayPence / 100).toFixed(2)}</div>
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <Button onClick={() => alert("Wire PDF download")}>Download PDF</Button>
                <Button variant="outline" onClick={() => alert("Wire email resend")}>Email me</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
