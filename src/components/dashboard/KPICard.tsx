import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export function KPICard({ title, value, change, changeType = "neutral", icon: Icon, iconColor }: KPICardProps) {
  return (
    <Card className="workspace-panel min-h-36 p-4 sm:min-h-40 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
          <p className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
            {value}
          </p>
          {change && (
            <p className={cn(
              "text-xs font-medium",
              changeType === "positive" && "text-[hsl(var(--success))]",
              changeType === "negative" && "text-destructive",
              changeType === "neutral" && "text-muted-foreground"
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", iconColor || "bg-accent")}>
          <Icon className="h-4 w-4 text-accent-foreground" />
        </div>
      </div>
    </Card>
  );
}
