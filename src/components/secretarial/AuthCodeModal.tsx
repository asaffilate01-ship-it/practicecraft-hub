import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { callEdgePath } from "@/lib/edgeFunctions";

interface AuthCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  existingCredentialId?: string | null;
}

const AUTH_CODE_PATTERN = /^[A-Za-z0-9]{6}$/;

export function AuthCodeModal({ open, onOpenChange, clientId, existingCredentialId }: AuthCodeModalProps) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [error, setError] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!AUTH_CODE_PATTERN.test(code)) throw new Error("Auth code must be exactly 6 alphanumeric characters.");
      if (code.toUpperCase() !== confirmCode.toUpperCase()) throw new Error("Codes do not match.");
      await callEdgePath("secretarial", "auth-code", {
        method: "POST",
        body: JSON.stringify({ clientId, authCode: code.toUpperCase(), existingCredentialId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-code", clientId] });
      onOpenChange(false);
      setCode("");
      setConfirmCode("");
      setError("");
      toast.success("Companies House auth code encrypted and stored.");
    },
    onError: (e) => {
      setError(e.message);
    },
  });

  const handleSave = () => {
    setError("");
    if (!AUTH_CODE_PATTERN.test(code)) {
      setError("Auth code must be exactly 6 alphanumeric characters.");
      return;
    }
    if (code.toUpperCase() !== confirmCode.toUpperCase()) {
      setError("Auth codes do not match.");
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setCode(""); setConfirmCode(""); setError(""); } onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            {existingCredentialId ? "Update Auth Code" : "Store Auth Code"}
          </DialogTitle>
          <DialogDescription>
            The Companies House authentication code is required to file changes online. It is 6 alphanumeric characters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="authCode">Companies House authentication code</Label>
            <Input
              id="authCode"
              placeholder="e.g. A1B2C3"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono tracking-widest text-center text-lg"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">6 characters. Keep this secure.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmAuthCode">Confirm auth code</Label>
            <Input
              id="confirmAuthCode"
              placeholder="Re-enter code"
              maxLength={6}
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
              className="font-mono tracking-widest text-center text-lg"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!code || !confirmCode || saveMutation.isPending}
            className="gap-1.5"
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
