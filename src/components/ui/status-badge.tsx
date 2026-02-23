import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  in_review: "bg-accent text-accent-foreground border-accent",
  queued: "bg-accent text-accent-foreground border-accent",
  sent: "bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.3)]",
  accepted: "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]",
  approved: "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
  due: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]",
  ready_to_file: "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]",
  awaiting_client: "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]",
  active: "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]",
  dissolved: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  queued: "Queued",
  sent: "Sent",
  accepted: "Accepted",
  approved: "Approved",
  rejected: "Rejected",
  overdue: "Overdue",
  due: "Due",
  ready_to_file: "Ready to File",
  awaiting_client: "Awaiting Client",
  active: "Active",
  dissolved: "Dissolved",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const styles = STATUS_STYLES[key] || STATUS_STYLES.draft;
  const displayLabel = label || STATUS_LABELS[key] || status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        styles,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
