import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter } from "lucide-react";

const mockClients = [
  { name: "ACME Ltd", entity: "Ltd", status: "active", vat: "GB123456789", manager: "Sarah J.", tasks: 3 },
  { name: "Smith & Co", entity: "Partnership", status: "active", vat: "GB987654321", manager: "James W.", tasks: 5 },
  { name: "Green Charity", entity: "Charity", status: "active", vat: "—", manager: "Sarah J.", tasks: 2 },
  { name: "Bright LLP", entity: "LLP", status: "active", vat: "GB111222333", manager: "Mark T.", tasks: 1 },
  { name: "Apex Trading", entity: "Sole Trader", status: "prospect", vat: "—", manager: "Lisa K.", tasks: 0 },
  { name: "Heritage Trust", entity: "Trust", status: "dormant", vat: "—", manager: "James W.", tasks: 0 },
];

const statusColor: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  prospect: "secondary",
  dormant: "outline",
};

export default function Clients() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Manage your client portfolio</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search clients..." className="pl-9" />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>VAT No.</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="text-right">Open Tasks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockClients.map((c, i) => (
                <TableRow key={i} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{c.entity}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColor[c.status]} className="text-xs capitalize">{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.vat}</TableCell>
                  <TableCell className="text-sm">{c.manager}</TableCell>
                  <TableCell className="text-right text-sm">{c.tasks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
