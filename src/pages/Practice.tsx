import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Zap, Plug } from "lucide-react";
import { StaffUsersTab } from "./practice/StaffUsersTab";
import { WorkflowsTab } from "./practice/WorkflowsTab";
import { IntegrationsTab } from "./practice/IntegrationsTab";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";

export default function PracticePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <WorkspacePageHeader eyebrow="Firm operations" title="Practice Management" description="People, roles, repeatable workflows, integrations and operating controls." />

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff" className="gap-1.5">
            <Users className="w-3.5 h-3.5" /> Staff & Users
          </TabsTrigger>
          <TabsTrigger value="workflows" className="gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Workflows
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Plug className="w-3.5 h-3.5" /> Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-4">
          <StaffUsersTab />
        </TabsContent>

        <TabsContent value="workflows" className="mt-4">
          <WorkflowsTab />
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <IntegrationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
