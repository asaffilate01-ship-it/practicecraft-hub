import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PermissionGuard } from "@/components/PermissionGuard";

// ── Pages ───────────────────────────────────────────────────
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Tasks from "@/pages/Tasks";
import Bookkeeping from "@/pages/Bookkeeping";
import VatReturns from "@/pages/VatReturns";
import Billing from "@/pages/Billing";
import Settings from "@/pages/Settings";
import Secretarial from "@/pages/Secretarial";
import Incorporations from "@/pages/Incorporations";
import Submissions from "@/pages/Submissions";
import AmlWorkbench from "@/pages/AmlWorkbench";
import PayrollWorkbench from "@/pages/PayrollWorkbench";
import AccountsPage from "@/pages/Accounts";
import DocumentsLibrary from "@/pages/DocumentsLibrary";
import ReportsPage from "@/pages/Reports";
import PracticePage from "@/pages/Practice";
import PlaceholderPage from "@/pages/PlaceholderPage";

// ── Auth pages ──────────────────────────────────────────────
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import HmrcCallback from "@/pages/auth/HmrcCallback";
import NotFound from "./pages/NotFound";

// ── Portal / Employee pages ─────────────────────────────────
import PortalHome from "@/pages/portal/PortalHome";
import EmployeePayslips from "@/pages/employee/EmployeePayslips";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Helper to wrap a page in AppLayout + PermissionGuard */
function Guarded({
  module,
  action,
  children,
}: {
  module: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AppLayout>
        <PermissionGuard module={module} action={action}>
          {children}
        </PermissionGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}

/** Shortcut for pages that only need login, no specific permission */
function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

const AppRoutes = () => (
  <Routes>
    {/* ── Public auth routes ───────────────────────────── */}
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/auth-redirect" element={<HmrcCallback />} />

    {/* ── Dashboard ────────────────────────────────────── */}
    <Route path="/" element={<Protected><Dashboard /></Protected>} />

    {/* ── Clients ──────────────────────────────────────── */}
    <Route path="/clients" element={<Guarded module="clients" action="view"><Clients /></Guarded>} />
    <Route path="/clients/:id" element={<Guarded module="clients" action="view"><ClientDetail /></Guarded>} />
    <Route path="/clients/:id/*" element={<Guarded module="clients" action="view"><ClientDetail /></Guarded>} />

    {/* ── Tasks ────────────────────────────────────────── */}
    <Route path="/tasks" element={<Guarded module="tasks" action="view"><Tasks /></Guarded>} />

    {/* ── Bookkeeping / Ledger ─────────────────────────── */}
    <Route path="/bookkeeping" element={<Guarded module="ledger" action="view"><Bookkeeping /></Guarded>} />

    {/* ── VAT (MTD) ────────────────────────────────────── */}
    <Route path="/vat" element={<Guarded module="vat" action="view"><VatReturns /></Guarded>} />
    <Route path="/vat/workbench" element={<Guarded module="vat" action="view"><VatReturns /></Guarded>} />
    <Route path="/vat/returns/:returnId" element={<Guarded module="vat" action="view"><PlaceholderPage title="VAT Return" description="VAT return detail and submission" /></Guarded>} />
    <Route path="/vat/obligations" element={<Guarded module="vat" action="view"><PlaceholderPage title="VAT Obligations" description="HMRC VAT obligations tracker" /></Guarded>} />

    {/* ── Payroll (RTI) ────────────────────────────────── */}
    <Route path="/payroll" element={<Guarded module="payroll" action="view"><PayrollWorkbench /></Guarded>} />
    <Route path="/payroll/workbench" element={<Guarded module="payroll" action="view"><PayrollWorkbench /></Guarded>} />
    <Route path="/payroll/employers/:employerId" element={<Guarded module="payroll" action="view"><PlaceholderPage title="Employer" description="Employer payroll setup and runs" /></Guarded>} />
    <Route path="/payroll/runs/:runId" element={<Guarded module="payroll" action="view"><PlaceholderPage title="Payroll Run" description="Payroll run detail, payslips, and RTI submission" /></Guarded>} />

    {/* ── Accounts Production ──────────────────────────── */}
    <Route path="/accounts" element={<Guarded module="accounts" action="view"><AccountsPage /></Guarded>} />

    {/* ── Secretarial ──────────────────────────────────── */}
    <Route path="/secretarial" element={<Guarded module="secretarial" action="view"><Secretarial /></Guarded>} />
    <Route path="/secretarial/workbench" element={<Guarded module="secretarial" action="view"><Secretarial /></Guarded>} />
    <Route path="/secretarial/changes/:changeId" element={<Guarded module="secretarial" action="view"><PlaceholderPage title="Change Detail" description="Secretarial change request detail, validation, and submission" /></Guarded>} />
    <Route path="/secretarial/filings" element={<Guarded module="secretarial" action="view"><PlaceholderPage title="Filing History" description="Companies House filing history" /></Guarded>} />

    {/* ── Incorporations ───────────────────────────────── */}
    <Route path="/incorporations" element={<Guarded module="incorporations" action="view"><Incorporations /></Guarded>} />
    <Route path="/incorporations/pipeline" element={<Guarded module="incorporations" action="view"><Incorporations /></Guarded>} />
    <Route path="/incorporations/applications/:applicationId" element={<Guarded module="incorporations" action="view"><PlaceholderPage title="Incorporation Application" description="Application wizard — company, people, shares, KYC, payment, submit" /></Guarded>} />

    {/* ── AML / KYC ────────────────────────────────────── */}
    <Route path="/kyc" element={<Guarded module="aml" action="view"><AmlWorkbench /></Guarded>} />
    <Route path="/aml" element={<Guarded module="aml" action="view"><AmlWorkbench /></Guarded>} />
    <Route path="/aml/workbench" element={<Guarded module="aml" action="view"><AmlWorkbench /></Guarded>} />
    <Route path="/aml/cases/:caseId" element={<Guarded module="aml" action="view"><PlaceholderPage title="AML Case" description="Client risk assessment and verification case detail" /></Guarded>} />

    {/* ── Billing ──────────────────────────────────────── */}
    <Route path="/billing" element={<Guarded module="billing" action="view"><Billing /></Guarded>} />
    <Route path="/billing/invoices" element={<Guarded module="billing" action="view"><Billing /></Guarded>} />
    <Route path="/billing/plans" element={<Guarded module="billing" action="view"><PlaceholderPage title="Billing Plans" description="Recurring fee plans and subscriptions" /></Guarded>} />
    <Route path="/billing/payments" element={<Guarded module="billing" action="view"><PlaceholderPage title="Payments" description="Payment history and reconciliation" /></Guarded>} />

    {/* ── Documents ────────────────────────────────────── */}
    <Route path="/documents" element={<Guarded module="documents" action="view"><DocumentsLibrary /></Guarded>} />
    <Route path="/documents/library" element={<Guarded module="documents" action="view"><DocumentsLibrary /></Guarded>} />
    <Route path="/documents/templates" element={<Guarded module="templates" action="view"><PlaceholderPage title="Document Templates" description="Email and document template management" /></Guarded>} />

    {/* ── Submissions ──────────────────────────────────── */}
    <Route path="/submissions" element={<Guarded module="submissions" action="view"><Submissions /></Guarded>} />
    <Route path="/submissions/jobs" element={<Guarded module="submissions" action="view"><Submissions /></Guarded>} />
    <Route path="/submissions/jobs/:jobId" element={<Guarded module="submissions" action="view"><PlaceholderPage title="Submission Job" description="Submission job detail, timeline, and retry controls" /></Guarded>} />

    {/* ── Reports ──────────────────────────────────────── */}
    <Route path="/reports" element={<Guarded module="reports" action="view"><ReportsPage /></Guarded>} />

    {/* ── Practice Management ──────────────────────────── */}
    <Route path="/practice" element={<Guarded module="settings" action="view"><PracticePage /></Guarded>} />
    <Route path="/practice/users" element={<Guarded module="settings" action="view"><PlaceholderPage title="Users" description="Staff user management" /></Guarded>} />
    <Route path="/practice/roles" element={<Guarded module="settings" action="view"><PlaceholderPage title="Roles" description="Role and permission management" /></Guarded>} />
    <Route path="/practice/workflows" element={<Guarded module="automations" action="view"><PlaceholderPage title="Workflows" description="Automation rules and workflow configuration" /></Guarded>} />
    <Route path="/practice/integrations" element={<Guarded module="integrations" action="view"><PlaceholderPage title="Integrations" description="Third-party integrations and API connections" /></Guarded>} />

    {/* ── Settings ─────────────────────────────────────── */}
    <Route path="/settings" element={<Guarded module="settings" action="view"><Settings /></Guarded>} />
    <Route path="/settings/tenant" element={<Guarded module="settings" action="view"><Settings /></Guarded>} />
    <Route path="/settings/branding" element={<Guarded module="settings" action="view"><PlaceholderPage title="Branding" description="Logo, colours, and portal branding" /></Guarded>} />
    <Route path="/settings/notifications" element={<Guarded module="notifications" action="view"><PlaceholderPage title="Notification Settings" description="Email, in-app, and webhook notification configuration" /></Guarded>} />
    <Route path="/settings/security" element={<Guarded module="settings" action="view"><PlaceholderPage title="Security" description="Authentication, MFA, and session settings" /></Guarded>} />

    {/* ── Client Portal (aud=client) ───────────────────── */}
    <Route path="/portal" element={<ProtectedRoute><PortalHome /></ProtectedRoute>} />
    <Route path="/portal/*" element={<ProtectedRoute><PortalHome /></ProtectedRoute>} />

    {/* ── Employee Portal (aud=employee) ───────────────── */}
    <Route path="/employee" element={<ProtectedRoute><EmployeePayslips /></ProtectedRoute>} />
    <Route path="/employee/*" element={<ProtectedRoute><EmployeePayslips /></ProtectedRoute>} />

    {/* ── Catch-all ────────────────────────────────────── */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
