import { Card } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export function PayrollTab() {
  return (
    <Card className="py-12 text-center space-y-2">
      <Briefcase className="w-8 h-8 mx-auto text-muted-foreground" />
      <p className="text-sm font-medium text-muted-foreground">Payroll module coming soon</p>
      <p className="text-xs text-muted-foreground">Pay runs, RTI submissions and payslips will appear here.</p>
    </Card>
  );
}
