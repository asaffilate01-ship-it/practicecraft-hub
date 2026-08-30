import {
  LayoutDashboard, Users, CheckSquare, BookOpen, Receipt, Wallet,
  FileText, Building2, ShieldCheck, CreditCard, FolderOpen, BarChart3,
  Settings, ChevronLeft, FilePlus2, Send, Briefcase,
  Landmark, Zap, UserPlus, ClipboardList, FileQuestion, PenTool,
  Eye, Crown, ChevronDown, HardHat, TrendingUp, Code2, PiggyBank,
  Globe, CalendarDays, Upload, FileSpreadsheet,
  ScanSearch,
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
  permission?: [string, string];
  featureKey?: string;
  moduleKey?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

const navGroups: NavGroup[] = [
  {
    label: "Core",
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Clients", url: "/clients", icon: Users, permission: ["clients", "view"], featureKey: "clients", moduleKey: "clients" },
      { title: "Tasks", url: "/tasks", icon: CheckSquare, permission: ["tasks", "view"], featureKey: "tasks", moduleKey: "tasks" },
      { title: "Client Onboarding", url: "/client-onboarding", icon: UserPlus, permission: ["clients", "view"], featureKey: "clients", moduleKey: "clients" },
    ],
  },
  {
    label: "Bookkeeping",
    items: [
      { title: "Bookkeeping", url: "/bookkeeping", icon: BookOpen, permission: ["ledger", "view"], featureKey: "bookkeeping", moduleKey: "bookkeeping" },
      { title: "Bank Feeds", url: "/bank-feeds", icon: Landmark, permission: ["ledger", "view"], featureKey: "bookkeeping", moduleKey: "bookkeeping" },
      { title: "Auto-Categorise", url: "/categorisation-rules", icon: Zap, permission: ["ledger", "view"], featureKey: "bookkeeping", moduleKey: "bookkeeping" },
      { title: "Quick Entry", url: "/invoice-entry", icon: BookOpen, permission: ["ledger", "view"], featureKey: "bookkeeping", moduleKey: "bookkeeping" },
      { title: "Multi-Currency", url: "/multi-currency", icon: Globe, permission: ["ledger", "view"], featureKey: "bookkeeping", moduleKey: "bookkeeping" },
      { title: "TB Import", url: "/import", icon: Upload, permission: ["ledger", "view"], featureKey: "bookkeeping", moduleKey: "bookkeeping" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { title: "VAT (MTD)", url: "/vat", icon: Receipt, permission: ["vat", "view"], featureKey: "vat", moduleKey: "vat" },
      { title: "Payroll (RTI)", url: "/payroll", icon: Wallet, permission: ["payroll", "view"], featureKey: "payroll", moduleKey: "payroll" },
      { title: "Accounts", url: "/accounts", icon: FileText, permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
      { title: "AI Review Centre", url: "/review-centre", icon: ScanSearch, permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
      { title: "Self Assessment", url: "/self-assessment", icon: FileText, permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
      { title: "Charities & Gift Aid", url: "/charities", icon: Landmark, permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
      { title: "Partnerships & LLPs", url: "/partnerships", icon: Users, permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
      { title: "Corporation Tax", url: "/corporation-tax", icon: FileText, permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
      { title: "CIS", url: "/cis", icon: HardHat, permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
      { title: "MTD IT (ITSA)", url: "/itsa", icon: TrendingUp, permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
      { title: "iXBRL Tagging", url: "/ixbrl", icon: Code2, permission: ["accounts", "view"], featureKey: "accounts", moduleKey: "accounts" },
      { title: "Pensions", url: "/pensions", icon: PiggyBank, permission: ["payroll", "view"], featureKey: "payroll", moduleKey: "payroll" },
      { title: "Company Secretarial", url: "/secretarial", icon: Building2, permission: ["secretarial", "view"], featureKey: "secretarial", moduleKey: "secretarial" },
      { title: "Incorporations", url: "/incorporations", icon: FilePlus2, permission: ["incorporations", "view"], featureKey: "incorporations", moduleKey: "incorporations" },
    ],
  },
  {
    label: "Risk & Submissions",
    items: [
      { title: "Regulatory Readiness", url: "/regulatory-readiness", icon: ShieldCheck, permission: ["submissions", "view"], featureKey: "submissions", moduleKey: "submissions" },
      { title: "AML / KYC", url: "/aml", icon: ShieldCheck, permission: ["aml", "view"], featureKey: "kyc_aml", moduleKey: "kyc_aml" },
      { title: "AML Monitoring", url: "/aml/monitoring", icon: Eye, permission: ["aml", "view"], featureKey: "kyc_aml", moduleKey: "kyc_aml" },
      { title: "Submissions", url: "/submissions", icon: Send, permission: ["submissions", "view"], featureKey: "submissions", moduleKey: "submissions" },
    ],
  },
  {
    label: "Billing & Documents",
    items: [
      { title: "Billing", url: "/billing", icon: CreditCard, permission: ["billing", "view"], featureKey: "billing", moduleKey: "billing" },
      { title: "Proposals", url: "/proposals", icon: FileSpreadsheet, permission: ["billing", "view"], featureKey: "billing", moduleKey: "billing" },
      { title: "Documents", url: "/documents", icon: FolderOpen, permission: ["documents", "view"], featureKey: "documents", moduleKey: "documents" },
      { title: "Doc Requests", url: "/documents/requests", icon: FileQuestion, permission: ["documents", "view"], featureKey: "documents", moduleKey: "documents" },
      { title: "e-Signatures", url: "/documents/signatures", icon: PenTool, permission: ["documents", "view"], featureKey: "documents", moduleKey: "documents" },
    ],
  },
  {
    label: "Productivity",
    items: [
      { title: "Time Recording", url: "/time", icon: ClipboardList, permission: ["tasks", "view"], featureKey: "tasks", moduleKey: "tasks" },
      { title: "Calendar", url: "/calendar", icon: CalendarDays, featureKey: "practice_mgmt", moduleKey: "practice_mgmt" },
      { title: "Reports", url: "/reports", icon: BarChart3, permission: ["reports", "view"], featureKey: "reports", moduleKey: "reports" },
    ],
  },
  {
    label: "Practice",
    items: [
      { title: "Practice", url: "/practice", icon: Briefcase, permission: ["settings", "view"], featureKey: "practice_mgmt", moduleKey: "practice_mgmt" },
      { title: "CH Wizard", url: "/practice/integrations/companies-house", icon: Building2, permission: ["secretarial", "view"], featureKey: "secretarial", moduleKey: "secretarial" },
      { title: "HMRC Wizard", url: "/practice/integrations/hmrc", icon: Receipt, permission: ["vat", "view"], featureKey: "vat", moduleKey: "vat" },
      { title: "Audit Log", url: "/practice/audit-log", icon: ClipboardList, permission: ["settings", "view"], featureKey: "practice_mgmt", moduleKey: "practice_mgmt" },
      { title: "Tenant Onboarding", url: "/practice/onboarding", icon: FilePlus2, permission: ["settings", "view"], featureKey: "practice_mgmt", moduleKey: "practice_mgmt" },
    ],
  },
];

const bottomNav: NavItem[] = [
  { title: "Admin", url: "/admin", icon: Crown, permission: ["settings", "view"] },
  { title: "Settings", url: "/settings", icon: Settings, permission: ["settings", "view"] },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { can, loading, role } = usePermissions();
  const { user } = useAuth();
  const branding = usePracticeBranding();
  const features = usePracticeFeatures();
  const session = buildStaffSession(role, user?.user_metadata?.full_name, user?.email);

  // Track which groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((g) => [g.label, g.defaultOpen ?? false]))
  );

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isVisible = (item: NavItem) => {
    if (item.permission && !can(item.permission[0], item.permission[1])) return false;
    if (item.featureKey && features[item.featureKey] === false) return false;
    if (item.moduleKey && !canUseModule(session.role, item.moduleKey)) return false;
    return true;
  };

  const visibleBottomNav = bottomNav.filter(isVisible);

  const handleNavClick = () => {
    onNavigate?.();
  };

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
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0 font-bold text-lg text-sidebar-primary-foreground" style={{ fontFamily: "Georgia, serif" }}>
            P
          </div>
        )}
        {!collapsed && !branding?.logoUrl && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-sidebar-accent-foreground tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              {branding?.practiceName ?? "PracticeCraft"}
            </h1>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-sidebar-foreground/45">Practice & accounts</p>
          </div>
        )}
        {!onNavigate && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "ml-auto p-1 rounded-md hover:bg-sidebar-accent transition-colors shrink-0",
              collapsed && "mx-auto ml-0"
            )}
          >
            <ChevronLeft className={cn("w-4 h-4 text-sidebar-foreground transition-transform", collapsed && "rotate-180")} />
          </button>
        )}
      </div>

      {/* Tenant Switcher */}
      {!collapsed && (
        <div className="py-3 border-b border-sidebar-border">
          <TenantSwitcher />
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {loading ? (
          <div className="space-y-2 px-3 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-sidebar-accent/50 animate-pulse" />
            ))}
          </div>
        ) : (
          navGroups.map((group) => {
            const visibleItems = group.items.filter(isVisible);
            if (visibleItems.length === 0) return null;
            const isOpen = openGroups[group.label] ?? false;

            if (collapsed) {
              // In collapsed mode, just show icons without groups
              return visibleItems.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  end={item.url === "/"}
                  onClick={handleNavClick}
                  className="flex items-center justify-center p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                  title={item.title}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                </NavLink>
              ));
            }

            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-[11px] uppercase tracking-wider font-semibold text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="space-y-0.5 mt-0.5">
                    {visibleItems.map((item) => (
                      <NavLink
                        key={item.url}
                        to={item.url}
                        end={item.url === "/"}
                        onClick={handleNavClick}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span>{item.title}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })
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
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
              collapsed && "justify-center"
            )}
            activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
