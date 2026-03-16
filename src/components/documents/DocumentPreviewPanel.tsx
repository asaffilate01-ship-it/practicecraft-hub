import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, X, Tag, FileText, Calendar, HardDrive, User, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Props = {
  document: any;
  onClose: () => void;
};

const DOC_STATUSES = ["pending", "processed", "archived"];

export function DocumentPreviewPanel({ document: doc, onClose }: Props) {
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState("");
  const [status, setStatus] = useState(doc.status);

  const updateMut = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("documents").update(updates).eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents-library"] });
      toast.success("Document updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addTag = () => {
    if (!newTag.trim()) return;
    const tags = [...(doc.tags || []), newTag.trim()];
    updateMut.mutate({ tags });
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    const tags = (doc.tags || []).filter((t: string) => t !== tag);
    updateMut.mutate({ tags });
  };

  const download = async () => {
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(doc.storage_path, 300);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="w-80 border-l bg-background p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Document Details</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
          <FileText className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{doc.filename}</p>
          <p className="text-xs text-muted-foreground">{doc.client?.legal_name || "General"}</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Uploaded:</span>
          <span>{new Date(doc.created_at).toLocaleDateString("en-GB")}</span>
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Size:</span>
          <span>{formatBytes(doc.size_bytes || 0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Type:</span>
          <Badge variant="secondary" className="text-xs capitalize">{doc.document_type?.replace(/_/g, " ")}</Badge>
        </div>
      </div>

      <Separator />

      {/* Status */}
      <div className="space-y-2">
        <Label className="text-xs">Status</Label>
        <Select value={status} onValueChange={(v) => { setStatus(v); updateMut.mutate({ status: v }); }}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOC_STATUSES.map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className="text-xs">Tags</Label>
        <div className="flex flex-wrap gap-1">
          {(doc.tags || []).map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs gap-1">
              <Tag className="w-2.5 h-2.5" />{tag}
              <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">×</button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            placeholder="Add tag…"
            className="h-7 text-xs"
          />
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={addTag}>Add</Button>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={download}>
          <Download className="w-3.5 h-3.5" /> Download
        </Button>
      </div>
    </div>
  );
}
