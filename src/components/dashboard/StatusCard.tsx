import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  label: string;
  count: number;
  color: "green" | "yellow" | "red" | "blue";
}

const colorMap = {
  green: "bg-[hsl(142,71%,45%)] text-white",
  yellow: "bg-[hsl(38,92%,50%)] text-white",
  red: "bg-[hsl(0,72%,51%)] text-white",
  blue: "bg-[hsl(217,91%,60%)] text-white",
};

const dotMap = {
  green: "bg-[hsl(142,71%,45%)]",
  yellow: "bg-[hsl(38,92%,50%)]",
  red: "bg-[hsl(0,72%,51%)]",
  blue: "bg-[hsl(217,91%,60%)]",
};

export function StatusCard({ label, count, color }: StatusCardProps) {
  return (
    <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer">
      <div className={cn("w-3 h-3 rounded-full shrink-0", dotMap[color])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
      </div>
      <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", colorMap[color])}>
        {count}
      </span>
    </Card>
  );
}
