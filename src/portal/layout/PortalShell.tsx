import { Link, Outlet, useLocation } from "react-router-dom";
import { useBranding } from "@/portal/branding/BrandingProvider";
import { useFeatures } from "@/portal/features/FeaturesProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { buildPortalSession } from "@/portal/auth/session";
import { ClientSwitcher } from "@/portal/components/ClientSwitcher";
import {
  Home,
  CalendarClock,
  FolderOpen,
  MessageSquare,
  FileText,
  Receipt,
  Wallet,
  Send,
  Settings,
  LogOut,
  HelpCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type NavItem = { to: string; label: string; feature: string; icon: typeof Home };

const nav: NavItem[] = [
  { to: "/portal/home", label: "Home", feature: "home", icon: Home },
  { to: "/portal/deadlines", label: "Deadlines", feature: "deadlines", icon: CalendarClock },
  { to: "/portal/documents", label: "Documents", feature: "documents", icon: FolderOpen },
  { to: "/portal/messages", label: "Messages", feature: "messages", icon: MessageSquare },
  { to: "/portal/invoices", label: "Invoices", feature: "invoices", icon: FileText },
  { to: "/portal/vat", label: "VAT", feature: "vat", icon: Receipt },
  { to: "/portal/payslips", label: "Payslips", feature: "payslips", icon: Wallet },
  { to: "/portal/submissions", label: "Submissions", feature: "submissions", icon: Send },
  { to: "/portal/settings", label: "Settings", feature: "settings", icon: Settings },
];

function PortalNavLink({ to, label, icon: Icon }: { to: string; label: string; icon: typeof Home }) {
  const loc = useLocation();
  const active = loc.pathname === to || loc.pathname.startsWith(to + "/");
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-primary font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function PortalShell() {
  const location = useLocation();
  const branding = useBranding();
  const features = useFeatures();
  const { role } = usePermissions();
  const { user, signOut } = useAuth();
  const session = buildPortalSession(role, user?.user_metadata?.full_name, user?.email);

  function isEnabled(feature: string) {
    if (feature === "home" || feature === "settings") return true;
    if (session.role === "employee") return feature === "payslips";
    return features[feature] !== false;
  }

  const initials = session.userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.practiceName} className="h-8 object-contain" />
          ) : (
            <span className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">
              {branding?.practiceName ?? "Client Portal"}
            </span>
          )}
        </div>

        {/* Client Switcher */}
        <div className="py-3">
          <ClientSwitcher />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {nav.filter((n) => isEnabled(n.feature)).map((n) => (
            <PortalNavLink key={n.to} to={n.to} label={n.label} icon={n.icon} />
          ))}
        </nav>

        {/* Support footer */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Support</div>
          <div className="text-xs text-sidebar-foreground">{branding?.supportEmail ?? "support@example.com"}</div>
          {branding?.supportPhone && (
            <div className="text-xs text-sidebar-foreground">{branding.supportPhone}</div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
          <div className="text-sm text-muted-foreground hidden md:block">
            Welcome back, {session.userName}
          </div>
          <div className="md:hidden text-sm font-semibold">{branding?.practiceName ?? "Portal"}</div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <HelpCircle className="w-4 h-4 mr-1" /> Help
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm">{session.userName}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              title="Sign out"
              onClick={async () => {
                await signOut();
                window.location.assign("/login");
              }}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 max-w-6xl mx-auto w-full pb-20 md:pb-0">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center overflow-x-auto border-t bg-card px-1 py-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] md:hidden">
          {nav.filter((item) => isEnabled(item.feature)).slice(0, 5).map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className={cn("flex min-w-[72px] flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px]", active ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground")}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <footer className="border-t bg-card px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} {branding?.practiceName ?? "Practice"}</span>
            <div className="flex gap-4">
              {branding?.legalLinks?.termsUrl && (
                <a href={branding.legalLinks.termsUrl} target="_blank" rel="noreferrer" className="hover:underline">Terms</a>
              )}
              {branding?.legalLinks?.privacyUrl && (
                <a href={branding.legalLinks.privacyUrl} target="_blank" rel="noreferrer" className="hover:underline">Privacy</a>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
