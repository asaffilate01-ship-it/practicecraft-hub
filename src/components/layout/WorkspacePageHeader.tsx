import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WorkspacePageHeaderProps {
  title: string;
  description: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}

export function WorkspacePageHeader({ title, description, eyebrow, actions, className }: WorkspacePageHeaderProps) {
  return (
    <section className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="workspace-eyebrow">{eyebrow}</p>}
        <h1 className={cn("font-serif text-3xl font-semibold leading-tight tracking-tight md:text-4xl", eyebrow && "mt-1")}>{title}</h1>
        <div className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</div>
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">{actions}</div>}
    </section>
  );
}
