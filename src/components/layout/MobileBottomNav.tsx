import { BookOpenCheck, FileSearch, LayoutDashboard, ListTodo, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { usePracticeFeatures } from "@/practice/features/PracticeFeaturesProvider";
import { buildStaffSession } from "@/practice/auth/staffSession";
import { visibleMobileNavigation, type MobileNavId } from "@/lib/mobileNavigation";

const icons = {
  home: LayoutDashboard,
  clients: Users,
  tasks: ListTodo,
  review: FileSearch,
  accounts: BookOpenCheck,
} satisfies Record<MobileNavId, typeof LayoutDashboard>;

export function MobileBottomNav() {
  const { can, role } = usePermissions();
  const features = usePracticeFeatures();
  const staff = buildStaffSession(role, null, null);
  const items = visibleMobileNavigation({ can, features, role: staff.role });

  return (
    <nav className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 px-2 pt-2 shadow-[0_-12px_30px_rgba(23,34,31,0.08)] backdrop-blur-xl md:hidden" aria-label="Primary navigation">
      <div className="mx-auto flex max-w-lg gap-1">
        {items.map(item => {
          const Icon = icons[item.id];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => cn(
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive && "bg-accent text-accent-foreground",
              )}
            >
              <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
