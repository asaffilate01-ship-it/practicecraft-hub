import { BookOpenCheck, FileSearch, LayoutDashboard, ListTodo, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const items = [
  { label: "Home", to: "/", icon: LayoutDashboard },
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Tasks", to: "/tasks", icon: ListTodo },
  { label: "Review", to: "/review-centre", icon: FileSearch },
  { label: "Accounts", to: "/accounts", icon: BookOpenCheck },
];

export function MobileBottomNav() {
  return (
    <nav className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 px-2 pt-2 shadow-[0_-12px_30px_rgba(23,34,31,0.08)] backdrop-blur-xl md:hidden" aria-label="Primary navigation">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium text-muted-foreground transition-colors",
              isActive && "bg-accent text-accent-foreground",
            )}
          >
            <item.icon className="h-[18px] w-[18px]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
