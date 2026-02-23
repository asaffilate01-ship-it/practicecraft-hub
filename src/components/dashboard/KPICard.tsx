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
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
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
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconColor || "bg-accent")}>
          <Icon className="w-5 h-5 text-accent-foreground" />
        </div>
      </div>
    </Card>
  );
}
