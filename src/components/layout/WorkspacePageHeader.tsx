import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspacePageHeaderProps {
  title: string;
  description: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
  icon?: LucideIcon;
}

export function WorkspacePageHeader({ title, description, eyebrow, actions, className, icon: Icon }: WorkspacePageHeaderProps) {
  return (
    <section className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="workspace-eyebrow">{eyebrow}</p>}
        <h1 className={cn("flex items-center gap-2 font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl", eyebrow && "mt-1")}>
          {Icon && <Icon className="h-6 w-6 text-primary md:h-7 md:w-7" />}{title}
        </h1>
        <div className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</div>
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">{actions}</div>}
    </section>
  );
}
