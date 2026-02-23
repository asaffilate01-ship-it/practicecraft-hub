import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Upload } from "lucide-react";

export default function PortalDocumentsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground">Upload and view your shared documents.</p>
        </div>
        <Button size="sm" onClick={() => alert("Wire file upload")}>
          <Upload className="w-4 h-4 mr-1" /> Upload
        </Button>
      </div>

      <Card>
        <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
          <FolderOpen className="w-12 h-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No documents yet. Upload receipts, bank statements, and other files here.</p>
          <Button variant="outline" size="sm" onClick={() => alert("Wire file upload")}>
            Upload your first document
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
