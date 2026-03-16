import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { FolderOpen, Upload, FileText, Image, File, Download } from "lucide-react";
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

export default function PortalDocumentsPage() {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState("receipt");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["portal-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
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

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const path = `${profile.tenant_id}/portal/${Date.now()}_${file.name}`;

        const { error: storageError } = await supabase.storage.from("client-documents").upload(path, file);
        if (storageError) throw storageError;

        const { error: dbError } = await supabase.from("documents").insert({
          tenant_id: profile.tenant_id,
          uploaded_by_user_id: user.id,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          storage_path: path,
          document_type: uploadType,
          status: "pending",
          folder_path: "/portal",
        });
        if (dbError) throw dbError;
      }
    },
    onSuccess: () => {
      toast({ title: "Uploaded", description: "Your documents have been uploaded successfully." });
      queryClient.invalidateQueries({ queryKey: ["portal-documents"] });
      setUploadOpen(false);
      setSelectedFiles(null);
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground">Upload and view your shared documents.</p>
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4 mr-1" /> Upload
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
            <FolderOpen className="w-12 h-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No documents yet. Upload receipts, bank statements, and other files here.</p>
            <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              Upload your first document
            </Button>
          </CardContent>
        </Card>
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
                  <Badge variant="secondary" className="text-xs capitalize">{doc.document_type.replace(/_/g, " ")}</Badge>
                  <Badge variant={doc.status === "processed" ? "default" : "secondary"} className="text-xs capitalize">{doc.status}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={async () => {
                      const { data } = await supabase.storage.from("client-documents").createSignedUrl(doc.storage_path, 60);
                      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                  <SelectItem value="correspondence">Correspondence</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  );
}
