import { Bug } from "lucide-react";

export function DevBanner() {
  // Demo credentials belong in the team's password manager or local test
  // harness, never in a browser bundle.
  const isDev = import.meta.env.DEV && import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === "true";
  if (!isDev) return null;

  return (
    <div className="bg-destructive text-destructive-foreground text-xs text-center py-0.5 px-2 font-medium flex items-center justify-center gap-1.5 shrink-0">
      <Bug className="w-3 h-3" />
      DEV / TEST ENVIRONMENT
    </div>
  );
}
