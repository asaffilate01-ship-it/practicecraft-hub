import { cn } from "@/lib/utils";
import { differenceInDays, parseISO, isValid } from "date-fns";

interface DueDatePillProps {
  dueDate: string | Date;
  className?: string;
  showCountdown?: boolean;
}

export function DueDatePill({ dueDate, className, showCountdown = true }: DueDatePillProps) {
  const date = typeof dueDate === "string" ? parseISO(dueDate) : dueDate;
  if (!isValid(date)) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInDays(date, today);

  let colorClass: string;
  let label: string;

  if (days < 0) {
    colorClass = "bg-destructive/10 text-destructive border-destructive/30";
    label = `${Math.abs(days)}d overdue`;
  } else if (days <= 7) {
    colorClass = "bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]";
    label = days === 0 ? "Due today" : `${days}d left`;
  } else if (days <= 30) {
    colorClass = "bg-[hsl(38_92%_50%/0.12)] text-[hsl(38_92%_40%)] border-[hsl(38_92%_50%/0.3)]";
    label = `${days}d left`;
  } else {
    colorClass = "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]";
    label = `${days}d left`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        colorClass,
        className
      )}
    >
      {showCountdown ? label : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
    </span>
  );
}
