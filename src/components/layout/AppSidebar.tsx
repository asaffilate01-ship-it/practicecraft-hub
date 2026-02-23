import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BookOpen,
  Receipt,
  Wallet,
  FileText,
  Building2,
  ShieldCheck,
  CreditCard,
  FolderOpen,
  BarChart3,
  Settings,
  ChevronLeft,
  CloudCog,
  FilePlus2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  /** Permission required: [module, action]. Omit for always-visible items. */
  permission?: [string, string];
};

const mainNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clients", url: "/clients", icon: Users, permission: ["clients", "view"] },
  { title: "Tasks", url: "/tasks", icon: CheckSquare, permission: ["tasks", "view"] },
  { title: "Bookkeeping", url: "/bookkeeping", icon: BookOpen, permission: ["ledger", "view"] },
  { title: "VAT (MTD)", url: "/vat", icon: Receipt, permission: ["vat", "view"] },
  { title: "Payroll (RTI)", url: "/payroll", icon: Wallet, permission: ["payroll", "view"] },
  { title: "Accounts", url: "/accounts", icon: FileText, permission: ["accounts", "view"] },
  { title: "Secretarial", url: "/secretarial", icon: Building2, permission: ["secretarial", "view"] },
  { title: "Incorporations", url: "/incorporations", icon: FilePlus2, permission: ["incorporations", "view"] },
  { title: "AML / KYC", url: "/kyc", icon: ShieldCheck, permission: ["aml", "view"] },
  { title: "Billing", url: "/billing", icon: CreditCard, permission: ["billing", "view"] },
  { title: "Documents", url: "/documents", icon: FolderOpen, permission: ["documents", "view"] },
  { title: "Reports", url: "/reports", icon: BarChart3, permission: ["reports", "view"] },
];

const bottomNav: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings, permission: ["settings", "view"] },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { can, loading } = usePermissions();

  const visibleMainNav = mainNav.filter(
    (item) => !item.permission || can(item.permission[0], item.permission[1])
  );

  const visibleBottomNav = bottomNav.filter(
    (item) => !item.permission || can(item.permission[0], item.permission[1])
  );

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 sticky top-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <CloudCog className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              IQ Practice Cloud
            </h1>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "ml-auto p-1 rounded-md hover:bg-sidebar-accent transition-colors shrink-0",
            collapsed && "mx-auto ml-0"
          )}
        >
          <ChevronLeft
            className={cn(
              "w-4 h-4 text-sidebar-foreground transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {loading ? (
          <div className="space-y-2 px-3 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-sidebar-accent/50 animate-pulse" />
            ))}
          </div>
        ) : (
          visibleMainNav.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          ))
        )}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        {visibleBottomNav.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
