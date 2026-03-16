import { useState } from "react";
import { Bug, X, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DEV_ACCOUNTS = [
  { role: "Firm Owner (Staff)", email: "amersaleem@gmail.com", password: "Your existing password" },
  { role: "Manager (Staff)", email: "manager@taxlounge.dev", password: "Test1234!" },
  { role: "Bookkeeper (Staff)", email: "bookkeeper@taxlounge.dev", password: "Test1234!" },
  { role: "Client Admin (Portal)", email: "client@kitchen313.dev", password: "Test1234!" },
  { role: "Employee (Portal)", email: "employee@kitchen313.dev", password: "Test1234!" },
];

export function DevBanner() {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const isDev = import.meta.env.DEV || window.location.hostname.includes("lovable.app") || window.location.hostname.includes("lovableproject.com");
  if (!isDev) return null;

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopied(email);
    toast.success("Copied!");
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <>
      {/* Floating bug icon */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        title="Dev Environment"
      >
        <Bug className="w-5 h-5" />
      </button>

      {/* Thin top banner */}
      <div className="bg-destructive text-destructive-foreground text-xs text-center py-0.5 px-2 font-medium flex items-center justify-center gap-1.5 shrink-0">
        <Bug className="w-3 h-3" />
        DEV / TEST ENVIRONMENT
      </div>

      {/* Expanded credentials panel */}
      {expanded && (
        <div className="fixed bottom-16 right-4 z-50 w-80 bg-card border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-destructive text-destructive-foreground">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <Bug className="w-4 h-4" /> Test Accounts
            </span>
            <button onClick={() => setExpanded(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y max-h-72 overflow-y-auto">
            {DEV_ACCOUNTS.map((acc) => (
              <div key={acc.email} className="px-3 py-2 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-0.5">
                  <Badge variant="outline" className="text-[10px]">{acc.role}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyEmail(acc.email)}
                  >
                    {copied === acc.email ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
                <p className="text-xs font-mono text-foreground">{acc.email}</p>
                <p className="text-[10px] text-muted-foreground">{acc.password}</p>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 bg-muted/50 text-[10px] text-muted-foreground">
            These accounts only work in the test environment.
          </div>
        </div>
      )}
    </>
  );
}
