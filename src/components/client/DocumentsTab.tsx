import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, File, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const iconForMime = (mime: string) => {
  if (mime.startsWith("image/")) return Image;
  if (mime.includes("pdf") || mime.includes("word")) return FileText;
  return File;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

interface DocumentsTabProps {
  clientId: string;
}

export function DocumentsTab({ clientId }: DocumentsTabProps) {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["client-documents", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <Card className="py-12 text-center"><p className="text-sm text-muted-foreground">Loading documents…</p></Card>;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded for this client.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc: any) => {
              const Icon = iconForMime(doc.mime_type);
              return (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(doc.size_bytes)} · {new Date(doc.created_at).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs capitalize">{doc.document_type.replace("_", " ")}</Badge>
                    <Badge variant={doc.status === "processed" ? "default" : "secondary"} className="text-xs capitalize">{doc.status}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
