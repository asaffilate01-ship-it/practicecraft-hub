import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const columns = [
  { key: "todo", label: "To Do", color: "bg-muted-foreground" },
  { key: "in_progress", label: "In Progress", color: "bg-[hsl(38,92%,50%)]" },
  { key: "awaiting_client", label: "Awaiting Client", color: "bg-[hsl(217,91%,60%)]" },
  { key: "done", label: "Done", color: "bg-[hsl(142,71%,45%)]" },
];

const mockTasks: Record<string, Array<{ title: string; client: string; due: string; priority: string }>> = {
  todo: [
    { title: "Prepare Q4 VAT return", client: "ACME Ltd", due: "28 Feb", priority: "urgent" },
    { title: "Bookkeeping reconciliation", client: "Smith & Co", due: "05 Mar", priority: "high" },
    { title: "Send engagement letter", client: "Apex Trading", due: "10 Mar", priority: "medium" },
  ],
  in_progress: [
    { title: "CT600 filing", client: "Bright LLP", due: "01 Mar", priority: "high" },
    { title: "Payroll March run", client: "ACME Ltd", due: "25 Mar", priority: "medium" },
  ],
  awaiting_client: [
    { title: "Missing bank statements", client: "Green Charity", due: "15 Mar", priority: "medium" },
    { title: "ID verification docs", client: "Heritage Trust", due: "20 Mar", priority: "low" },
  ],
  done: [
    { title: "January payroll", client: "ACME Ltd", due: "31 Jan", priority: "medium" },
  ],
};

const priorityColors: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-[hsl(38,92%,50%)] text-white",
  medium: "bg-secondary text-secondary-foreground",
  low: "bg-muted text-muted-foreground",
};

export default function Tasks() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Workflow & deadline management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-3.5 h-3.5" /> Filter
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => (
          <div key={col.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn("w-2.5 h-2.5 rounded-full", col.color)} />
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                {mockTasks[col.key]?.length || 0}
              </span>
            </div>
            <div className="space-y-2">
              {mockTasks[col.key]?.map((task, i) => (
                <Card key={i} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                  <p className="text-sm font-medium mb-1">{task.title}</p>
                  <p className="text-xs text-muted-foreground mb-2">{task.client}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Due: {task.due}</span>
                    <Badge className={cn("text-[10px] px-1.5 py-0", priorityColors[task.priority])}>
                      {task.priority}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
