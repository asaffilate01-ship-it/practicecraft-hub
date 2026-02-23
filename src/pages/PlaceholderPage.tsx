import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card className="flex flex-col items-center justify-center py-20 text-center">
        <Construction className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold text-muted-foreground">Coming Soon</h2>
        <p className="text-sm text-muted-foreground/70 max-w-md mt-1">
          This module is part of the IQ Practice Cloud roadmap and will be available in an upcoming release.
        </p>
      </Card>
    </div>
  );
}
