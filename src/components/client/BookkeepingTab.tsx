import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BookkeepingTabProps {
  clientId: string;
}

export function BookkeepingTab({ clientId }: BookkeepingTabProps) {
  const { data: journals = [], isLoading } = useQuery({
    queryKey: ["client-journals", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("client_id", clientId)
        .order("entry_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <Card className="py-12 text-center"><p className="text-sm text-muted-foreground">Loading journals…</p></Card>;
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Journal Entries</CardTitle></CardHeader>
      <CardContent>
        {journals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No journal entries for this client.</p>
        ) : (
          <div className="space-y-2">
            {journals.map((j: any) => (
              <div key={j.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{j.narration || j.reference || "Untitled entry"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(j.entry_date).toLocaleDateString("en-GB")}
                    {j.reference && ` · Ref: ${j.reference}`}
                  </p>
                </div>
                <Badge variant={j.is_posted ? "default" : "secondary"} className="text-xs">
                  {j.is_posted ? "Posted" : "Draft"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
