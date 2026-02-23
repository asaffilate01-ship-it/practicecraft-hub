import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { FileText, Image, File, Download, Upload, MoreHorizontal, Tag } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

const iconForMime = (mime: string) => {
  if (mime?.startsWith("image/")) return Image;
  if (mime?.includes("pdf") || mime?.includes("word")) return FileText;
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
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState("other");
  const [uploadTags, setUploadTags] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

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

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!selectedFiles?.length) throw new Error("No files selected");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (!profile) throw new Error("No profile");

      const tagArray = uploadTags.split(",").map(t => t.trim()).filter(Boolean);

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const path = `${profile.tenant_id}/${clientId}/${Date.now()}_${file.name}`;

        const { error: storageError } = await supabase.storage.from("client-documents").upload(path, file);
        if (storageError) throw storageError;

        const { error: dbError } = await supabase.from("documents").insert({
          tenant_id: profile.tenant_id,
          client_id: clientId,
          uploaded_by_user_id: user.id,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          storage_path: path,
          document_type: uploadType,
          status: "pending",
          tags: tagArray,
          folder_path: "/",
        });
        if (dbError) throw dbError;
      }
    },
    onSuccess: () => {
      toast({ title: "Uploaded", description: `${selectedFiles?.length} file(s) uploaded.` });
      queryClient.invalidateQueries({ queryKey: ["client-documents", clientId] });
      setUploadOpen(false);
      setSelectedFiles(null);
      setUploadType("other");
      setUploadTags("");
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const downloadDoc = async (doc: any) => {
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(doc.storage_path, 300);
    if (error) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  if (isLoading) {
    return <Card className="py-12 text-center"><p className="text-sm text-muted-foreground">Loading documents…</p></Card>;
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4 mr-1.5" /> Upload
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No documents uploaded for this client.</p>
          ) : (
            <div className="space-y-1">
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
                      {doc.tags?.slice(0, 2).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="w-2.5 h-2.5 mr-1" />{tag}
                        </Badge>
                      ))}
                      <Badge variant="secondary" className="text-xs capitalize">{doc.document_type.replace(/_/g, " ")}</Badge>
                      <Badge variant={doc.status === "processed" ? "default" : "secondary"} className="text-xs capitalize">{doc.status}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => downloadDoc(doc)}>
                            <Download className="w-3.5 h-3.5 mr-2" /> Download
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Documents</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Files</Label>
              <Input type="file" multiple onChange={(e) => setSelectedFiles(e.target.files)} className="mt-1" />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="bank_statement">Bank Statement</SelectItem>
                  <SelectItem value="id_document">ID Document</SelectItem>
                  <SelectItem value="accounts">Accounts</SelectItem>
                  <SelectItem value="tax_return">Tax Return</SelectItem>
                  <SelectItem value="correspondence">Correspondence</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={uploadTags} onChange={(e) => setUploadTags(e.target.value)} placeholder="e.g. VAT, Q1" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={() => uploadMut.mutate()} disabled={!selectedFiles?.length || uploadMut.isPending}>
              {uploadMut.isPending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
