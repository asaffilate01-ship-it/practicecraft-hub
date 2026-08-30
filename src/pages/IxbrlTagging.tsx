import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Code2, Database, FileCheck, FileCode, Plus, Search, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { WorkspacePageHeader } from "@/components/layout/WorkspacePageHeader";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  tagged: "bg-blue-500/10 text-blue-700 border-blue-200",
  validated: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  errors: "bg-destructive/10 text-destructive border-destructive/20",
  submitted: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
};

export default function IxbrlTagging() {
  const { tenantId } = usePermissions();
  const [tab, setTab] = useState("taxonomies");
  const [tagSearch, setTagSearch] = useState("");

  const { data: taxonomies = [] } = useQuery({
    queryKey: ["ixbrl-taxonomies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ixbrl_taxonomies")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ["ixbrl-mappings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ixbrl_tag_mappings")
        .select("*, ixbrl_taxonomies(name, version)")
        .eq("tenant_id", tenantId!)
        .order("account_code");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: instances = [] } = useQuery({
    queryKey: ["ixbrl-instances", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ixbrl_filing_instances")
        .select("*, clients(legal_name), ixbrl_taxonomies(name, version), accounts_periods(period_start, period_end)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const filteredMappings = tagSearch
    ? mappings.filter((m: any) =>
        m.account_code.includes(tagSearch) ||
        m.tag_name.toLowerCase().includes(tagSearch.toLowerCase())
      )
    : mappings;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader eyebrow="Digital filing preparation" title="iXBRL Tagging" icon={Code2} description="Map the chart of accounts to taxonomy tags for statutory accounts and CT600 filings." />

      <Card className="border-warning/30 bg-warning/5"><CardContent className="flex items-start gap-2 pt-4 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><p>Tag mappings are preparation data only. PracticeCraft does not yet generate or validate a standards-conformant accounts or computation iXBRL document.</p></CardContent></Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Taxonomies</div>
          <div className="text-2xl font-bold mt-1">{taxonomies.length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Tag Mappings</div>
          <div className="text-2xl font-bold mt-1">{mappings.length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Filing Instances</div>
          <div className="text-2xl font-bold mt-1">{instances.length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Custom Tags</div>
          <div className="text-2xl font-bold mt-1">{mappings.filter((m: any) => m.is_custom).length}</div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="taxonomies" className="gap-1"><Database className="w-3.5 h-3.5" /> Taxonomies</TabsTrigger>
          <TabsTrigger value="mappings" className="gap-1"><Tag className="w-3.5 h-3.5" /> Tag Mappings</TabsTrigger>
          <TabsTrigger value="instances" className="gap-1"><FileCode className="w-3.5 h-3.5" /> Filing Instances</TabsTrigger>
        </TabsList>

        <TabsContent value="taxonomies" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Available Taxonomies</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Schema URL</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxonomies.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.version}</TableCell>
                      <TableCell className="font-mono text-xs">{t.taxonomy_type}</TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate">{t.schema_url}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200">Active</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Account → iXBRL Tag Mappings</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search tags…"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    className="pl-8 w-48 h-9"
                  />
                </div>
                <Button size="sm" variant="outline" disabled><Plus className="w-4 h-4 mr-1" /> Add Mapping</Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMappings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No tag mappings configured</p>
                  <p className="text-sm mt-1">Map your chart of accounts codes to iXBRL taxonomy elements</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Code</TableHead>
                      <TableHead>Tag Name</TableHead>
                      <TableHead>Namespace</TableHead>
                      <TableHead>Taxonomy</TableHead>
                      <TableHead>Context</TableHead>
                      <TableHead>Custom</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMappings.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono font-medium">{m.account_code}</TableCell>
                        <TableCell className="font-mono text-xs">{m.tag_name}</TableCell>
                        <TableCell className="text-xs">{m.tag_namespace}</TableCell>
                        <TableCell className="text-sm">{(m.ixbrl_taxonomies as any)?.name} {(m.ixbrl_taxonomies as any)?.version}</TableCell>
                        <TableCell className="text-xs">{m.context_ref || "—"}</TableCell>
                        <TableCell>{m.is_custom ? <Badge variant="outline" className="bg-purple-500/10 text-purple-700">Custom</Badge> : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instances" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Filing Instances</CardTitle>
              <Button size="sm" variant="outline" disabled><Plus className="w-4 h-4 mr-1" /> Generate iXBRL</Button>
            </CardHeader>
            <CardContent>
              {instances.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileCode className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No filing instances</p>
                  <p className="text-sm mt-1">Generate iXBRL output from completed accounts periods</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Taxonomy</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Errors</TableHead>
                      <TableHead>Generated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instances.map((inst: any) => {
                      const errCount = Array.isArray(inst.validation_errors_json) ? inst.validation_errors_json.length : 0;
                      return (
                        <TableRow key={inst.id}>
                          <TableCell className="font-medium">{(inst.clients as any)?.legal_name}</TableCell>
                          <TableCell className="text-sm">
                            {(inst.accounts_periods as any)?.period_start} → {(inst.accounts_periods as any)?.period_end}
                          </TableCell>
                          <TableCell>{(inst.ixbrl_taxonomies as any)?.name} {(inst.ixbrl_taxonomies as any)?.version}</TableCell>
                          <TableCell><Badge variant="outline" className={statusColors[inst.status] || ""}>{inst.status}</Badge></TableCell>
                          <TableCell>{errCount > 0 ? <Badge variant="destructive">{errCount}</Badge> : "✓"}</TableCell>
                          <TableCell className="text-xs">{inst.generated_at ? new Date(inst.generated_at).toLocaleDateString("en-GB") : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
