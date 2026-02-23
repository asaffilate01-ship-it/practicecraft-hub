import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, RotateCcw } from "lucide-react";

interface MaskedSecretInputProps {
  label: string;
  /** Raw value during entry, or "***" when masked */
  value: string;
  placeholder?: string;
  /** true when the secret is stored and should not be revealed */
  isMasked: boolean;
  onChange: (v: string) => void;
  /** Triggers reset flow — clears stored secret and unlocks input */
  onReset: () => void;
  help?: string;
}

export function MaskedSecretInput({
  label,
  value,
  placeholder,
  isMasked,
  onChange,
  onReset,
  help,
}: MaskedSecretInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          {isMasked && <Lock className="w-3 h-3 text-muted-foreground" />}
          {label}
        </Label>
        {isMasked && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-destructive hover:text-destructive gap-1"
            onClick={onReset}
          >
            <RotateCcw className="w-3 h-3" />
            Reset secret
          </Button>
        )}
      </div>
      <Input
        type={isMasked ? "text" : "password"}
        value={isMasked ? "••••••••••••" : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isMasked}
        placeholder={placeholder}
        className={isMasked ? "bg-muted text-muted-foreground font-mono" : ""}
      />
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      {isMasked && (
        <p className="text-[11px] text-muted-foreground/70 italic">
          Stored securely. Revealing is not allowed.
        </p>
      )}
    </div>
  );
}
