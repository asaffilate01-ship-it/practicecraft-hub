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
  Send,
  Briefcase,
  Landmark,
  Zap,
  UserPlus,
  ClipboardList,
  FileQuestion,
  PenTool,
  Eye,
  Crown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { usePracticeBranding } from "@/practice/branding/PracticeBrandingProvider";
import { usePracticeFeatures } from "@/practice/features/PracticeFeaturesProvider";
import { TenantSwitcher } from "@/practice/components/TenantSwitcher";
import { buildStaffSession, canUseModule } from "@/practice/auth/staffSession";


type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  /** Permission required: [module, action]. Omit for always-visible items. */
  permission?: [string, string];
  /** Feature flag key for tenant-level gating */
  featureKey?: string;
  /** Module key for staff-role gating */
  moduleKey?: string;
};

const mainNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clients", url: "/clients", icon: Users, permission: ["clients", "view"], featureKey: "clients", moduleKey: "clients" },
  { title: "Tasks", url: "/tasks", icon: CheckSquare, permission: ["tasks", "view"], featureKey: "tasks", moduleKey: "tasks" },
  { title: "Bookkeeping", url: "/bookkeeping", icon: BookOpen, permission: ["ledger", "view"], featureKey: "bookkeeping", moduleKey: "bookkeeping" },
  { title: "Bank Feeds", url: "/bank-feeds", icon: Landmark, permission: ["ledger", "view"], featureKey: "bookkeeping", moduleKey: "bookkeeping" },
  { title: "Auto-Categorise", url: "/categorisation-rules", icon: Zap, permission: ["ledger", "view"], featureKey: "bookkeeping", moduleKey: "bookkeeping" },
  { title: "Quick Entry", url: "/invoice-entry", icon: BookOpen, permission: ["ledger", "view"], featureKey: "bookkeeping", moduleKey: "bookkeeping" },
  { title: "VAT (MTD)", url: "/vat", icon: Receipt, permission: ["vat", "view"], featureKey: "vat", moduleKey: "vat" },
  { title: "Payroll (RTI)", url: "/payroll", icon: Wallet, permission: ["payroll", "view"], featureKey: "payroll", moduleKey: "payroll" },
  { title: "Accounts", url: "/accounts", icon: FileText, permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
  { title: "Self Assessment", url: "/self-assessment", icon: FileText, permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
  { title: "Corporation Tax", url: "/corporation-tax", icon: FileText, permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
  { title: "Secretarial", url: "/secretarial", icon: Building2, permission: ["secretarial", "view"], featureKey: "secretarial", moduleKey: "secretarial" },
  { title: "Incorporations", url: "/incorporations", icon: FilePlus2, permission: ["incorporations", "view"], featureKey: "incorporations", moduleKey: "incorporations" },
  { title: "AML / KYC", url: "/aml", icon: ShieldCheck, permission: ["aml", "view"], featureKey: "kyc_aml", moduleKey: "kyc_aml" },
  { title: "AML Monitoring", url: "/aml/monitoring", icon: Eye, permission: ["aml", "view"], featureKey: "kyc_aml", moduleKey: "kyc_aml" },
  { title: "Submissions", url: "/submissions", icon: Send, permission: ["submissions", "view"], featureKey: "submissions", moduleKey: "submissions" },
  { title: "Billing", url: "/billing", icon: CreditCard, permission: ["billing", "view"], featureKey: "billing", moduleKey: "billing" },
  { title: "Documents", url: "/documents", icon: FolderOpen, permission: ["documents", "view"], featureKey: "documents", moduleKey: "documents" },
  { title: "Doc Requests", url: "/documents/requests", icon: FileQuestion, permission: ["documents", "view"], featureKey: "documents", moduleKey: "documents" },
  { title: "e-Signatures", url: "/documents/signatures", icon: PenTool, permission: ["documents", "view"], featureKey: "documents", moduleKey: "documents" },
  { title: "Time Recording", url: "/time", icon: ClipboardList, permission: ["tasks", "view"], featureKey: "tasks", moduleKey: "tasks" },
  { title: "Reports", url: "/reports", icon: BarChart3, permission: ["reports", "view"], featureKey: "reports", moduleKey: "reports" },
  { title: "Practice", url: "/practice", icon: Briefcase, permission: ["settings", "view"], featureKey: "practice_mgmt", moduleKey: "practice_mgmt" },
  { title: "CH Wizard", url: "/practice/integrations/companies-house", icon: Building2, permission: ["secretarial", "view"], featureKey: "secretarial", moduleKey: "secretarial" },
  { title: "HMRC Wizard", url: "/practice/integrations/hmrc", icon: Receipt, permission: ["vat", "view"], featureKey: "vat", moduleKey: "vat" },
  { title: "Audit Log", url: "/practice/audit-log", icon: ClipboardList, permission: ["settings", "view"], featureKey: "practice_mgmt", moduleKey: "practice_mgmt" },
  { title: "Tenant Onboarding", url: "/practice/onboarding", icon: FilePlus2, permission: ["settings", "view"], featureKey: "practice_mgmt", moduleKey: "practice_mgmt" },
  { title: "Client Onboarding", url: "/client-onboarding", icon: UserPlus, permission: ["clients", "view"], featureKey: "clients", moduleKey: "clients" },
];

const bottomNav: NavItem[] = [
  { title: "Admin", url: "/admin", icon: Crown, permission: ["settings", "view"] },
  { title: "Settings", url: "/settings", icon: Settings, permission: ["settings", "view"] },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { can, loading, role } = usePermissions();
  const { user } = useAuth();
  const branding = usePracticeBranding();
  const features = usePracticeFeatures();
  const session = buildStaffSession(role, user?.user_metadata?.full_name, user?.email);

  const isVisible = (item: NavItem) => {
    // RBAC permission check
    if (item.permission && !can(item.permission[0], item.permission[1])) return false;
    // Tenant feature flag check
    if (item.featureKey && features[item.featureKey] === false) return false;
    // Staff role module check
    if (item.moduleKey && !canUseModule(session.role, item.moduleKey)) return false;
    return true;
  };

  const visibleMainNav = mainNav.filter(isVisible);
  const visibleBottomNav = bottomNav.filter(isVisible);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 sticky top-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo / Branding */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        {branding?.logoUrl ? (
          <img src={branding.logoUrl} alt={branding.practiceName} className="h-8 object-contain shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <CloudCog className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
        )}
        {!collapsed && !branding?.logoUrl && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              {branding?.practiceName ?? "IQ Practice Cloud"}
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

      {/* Tenant Switcher */}
      {!collapsed && (
        <div className="py-3 border-b border-sidebar-border">
          <TenantSwitcher />
        </div>
      )}

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

      {/* Support footer */}
      {!collapsed && branding?.supportEmail && (
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60 font-medium">Support</div>
          <div className="text-xs text-sidebar-foreground">{branding.supportEmail}</div>
        </div>
      )}

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
