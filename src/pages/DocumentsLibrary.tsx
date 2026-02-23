import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Image, File, Download, Upload, Search, FolderOpen,
  Filter, Tag, Trash2, Eye, Clock, MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

const DOC_TYPES = [
  { value: "all", label: "All Types" },
  { value: "receipt", label: "Receipt" },
  { value: "invoice", label: "Invoice" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "id_document", label: "ID Document" },
  { value: "engagement_letter", label: "Engagement Letter" },
  { value: "accounts", label: "Accounts" },
  { value: "tax_return", label: "Tax Return" },
  { value: "correspondence", label: "Correspondence" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "processed", label: "Processed" },
  { value: "archived", label: "Archived" },
];

export default function DocumentsLibrary() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadClientId, setUploadClientId] = useState("");
  const [uploadType, setUploadType] = useState("other");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadFolder, setUploadFolder] = useState("/");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents-library", typeFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select("*, client:clients(legal_name)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (typeFilter !== "all") query = query.eq("document_type", typeFilter);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list-brief"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, legal_name")
        .eq("status", "active")
        .order("legal_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["document-tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_tags").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!selectedFiles?.length) throw new Error("No files selected");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("No profile found");

      const tagArray = uploadTags.split(",").map(t => t.trim()).filter(Boolean);

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const path = `${profile.tenant_id}/${uploadClientId || "general"}/${Date.now()}_${file.name}`;

        const { error: storageError } = await supabase.storage
          .from("client-documents")
          .upload(path, file);

        if (storageError) throw storageError;

        const { error: dbError } = await supabase.from("documents").insert({
          tenant_id: profile.tenant_id,
          client_id: uploadClientId || null,
          uploaded_by_user_id: user.id,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          storage_path: path,
          document_type: uploadType,
          status: "pending",
          tags: tagArray,
          folder_path: uploadFolder,
        });

        if (dbError) throw dbError;
      }
    },
    onSuccess: () => {
      toast({ title: "Documents uploaded", description: `${selectedFiles?.length} file(s) uploaded successfully.` });
      queryClient.invalidateQueries({ queryKey: ["documents-library"] });
      setUploadOpen(false);
      setSelectedFiles(null);
      setUploadClientId("");
      setUploadType("other");
      setUploadTags("");
      setUploadFolder("/");
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const filtered = documents.filter((doc: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      doc.filename?.toLowerCase().includes(q) ||
      doc.client?.legal_name?.toLowerCase().includes(q) ||
      doc.tags?.some((t: string) => t.toLowerCase().includes(q))
    );
  });

  const downloadDoc = async (doc: any) => {
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(doc.storage_path, 300);
    if (error) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Documents
          </h1>
          <p className="text-sm text-muted-foreground">
            Secure document vault with tagging, versioning, and OCR.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4 mr-1.5" /> Upload
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files, clients, tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Documents</p>
          <p className="text-2xl font-bold">{documents.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pending OCR</p>
          <p className="text-2xl font-bold">{documents.filter((d: any) => d.status === "pending").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Processed</p>
          <p className="text-2xl font-bold">{documents.filter((d: any) => d.status === "processed").length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Size</p>
          <p className="text-2xl font-bold">{formatBytes(documents.reduce((s: number, d: any) => s + (d.size_bytes || 0), 0))}</p>
        </Card>
      </div>

      {/* Document list */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <FolderOpen className="w-12 h-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No documents found. Upload your first document to get started.</p>
              <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                Upload document
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((doc: any) => {
                const Icon = iconForMime(doc.mime_type);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.client?.legal_name || "General"} · {formatBytes(doc.size_bytes)} · {new Date(doc.created_at).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc.tags?.slice(0, 2).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="w-2.5 h-2.5 mr-1" />{tag}
                        </Badge>
                      ))}
                      <Badge variant="secondary" className="text-xs capitalize">
                        {doc.document_type.replace(/_/g, " ")}
                      </Badge>
                      <Badge
                        variant={doc.status === "processed" ? "default" : "secondary"}
                        className="text-xs capitalize"
                      >
                        {doc.status}
                      </Badge>
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
                          <DropdownMenuItem>
                            <Eye className="w-3.5 h-3.5 mr-2" /> Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Clock className="w-3.5 h-3.5 mr-2" /> Version history
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

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Files</Label>
              <Input
                type="file"
                multiple
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Client (optional)</Label>
              <Select value={uploadClientId} onValueChange={setUploadClientId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="General (no client)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">General</SelectItem>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Document Type</Label>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.filter(t => t.value !== "all").map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Folder</Label>
                <Input
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  placeholder="/"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="e.g. VAT, Q1, 2025"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button
              onClick={() => uploadMut.mutate()}
              disabled={!selectedFiles?.length || uploadMut.isPending}
            >
              {uploadMut.isPending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
