import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function PortalSettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage portal preferences.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="text-sm font-semibold">Notifications</div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="notify-deadlines" defaultChecked />
              <Label htmlFor="notify-deadlines" className="text-sm">Email alerts for deadlines</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="notify-messages" defaultChecked />
              <Label htmlFor="notify-messages" className="text-sm">Email alerts for new messages</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="notify-invoices" defaultChecked />
              <Label htmlFor="notify-invoices" className="text-sm">Email alerts for new invoices</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
