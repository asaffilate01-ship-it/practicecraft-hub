import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Send } from "lucide-react";

export default function PayrollRunDetail() {
  const { runId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/payroll")}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll Run</h1>
          <p className="text-sm text-muted-foreground">Run ID: {runId?.slice(0, 8)}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Run Details</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground text-center py-12">
          <p>Payroll run details will appear here once the run is processed.</p>
          <p className="mt-2">Navigate to the payroll workbench to create and manage runs.</p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/payroll")}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <Button><Send className="w-4 h-4 mr-2" /> Submit FPS</Button>
      </div>
    </div>
  );
}
