import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ClientContextProvider } from "@/contexts/ClientContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { CookieConsent } from "@/components/CookieConsent";



// ── Pages ───────────────────────────────────────────────────
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Tasks from "@/pages/Tasks";
import Bookkeeping from "@/pages/Bookkeeping";
import BankFeeds from "@/pages/BankFeeds";
import CategorisationRules from "@/pages/CategorisationRules";
import ClientOnboarding from "@/pages/ClientOnboarding";
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
import TenantOnboarding from "@/pages/TenantOnboarding";
import PlaceholderPage from "@/pages/PlaceholderPage";
import BrandingSettings from "@/pages/BrandingSettings";
import NotificationSettings from "@/pages/NotificationSettings";
import GdprSettings from "@/pages/GdprSettings";
import SecuritySettings from "@/pages/SecuritySettings";
import FilingHistory from "@/pages/FilingHistory";
import WorkflowsPage from "@/pages/WorkflowsPage";
import IntegrationsHub from "@/pages/IntegrationsHub";
import SubmissionJobDetail from "@/pages/SubmissionJobDetail";
import PaymentHistory from "@/pages/PaymentHistory";
import CompaniesHouseWizard from "@/pages/CompaniesHouseWizard";
import HmrcWizard from "@/pages/HmrcWizard";
import AuditLog from "@/pages/AuditLog";
import DocumentRequests from "@/pages/DocumentRequests";
import ESignatures from "@/pages/ESignatures";
import AmlMonitoring from "@/pages/AmlMonitoring";
import TimeRecording from "@/pages/TimeRecording";
import EmailTemplates from "@/pages/EmailTemplates";
import TenantAdmin from "@/pages/TenantAdmin";
import FpsBuilderPage from "@/pages/rti/FpsBuilderPage";
import EpsBuilderPage from "@/pages/rti/EpsBuilderPage";
import SelfAssessment from "@/pages/SelfAssessment";
import CorporationTax from "@/pages/CorporationTax";
import InvoiceEntry from "@/pages/InvoiceEntry";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import VatReturnDetail from "@/pages/VatReturnDetail";
import VatObligations from "@/pages/VatObligations";
import PayrollEmployerDetail from "@/pages/PayrollEmployerDetail";
import PayrollRunDetail from "@/pages/PayrollRunDetail";
import SecretarialChangeDetail from "@/pages/SecretarialChangeDetail";
import IncorporationDetail from "@/pages/IncorporationDetail";
import AmlCaseDetail from "@/pages/AmlCaseDetail";
import BillingPlans from "@/pages/BillingPlans";
import RolesManagement from "@/pages/RolesManagement";
import { StaffUsersTab } from "@/pages/practice/StaffUsersTab";

// ── Auth pages ──────────────────────────────────────────────
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import PortalSignup from "@/pages/auth/PortalSignup";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import HmrcCallback from "@/pages/auth/HmrcCallback";
import NotFound from "./pages/NotFound";

// ── Portal / Employee pages ─────────────────────────────────
import PortalHome from "@/pages/portal/PortalHome";
import EmployeePayslips from "@/pages/employee/EmployeePayslips";

// ── Portal shell + pages ────────────────────────────────────
import { PortalShell } from "@/portal/layout/PortalShell";
import { BrandingProvider } from "@/portal/branding/BrandingProvider";
import { FeaturesProvider } from "@/portal/features/FeaturesProvider";
import PortalHomePage from "@/pages/portal/PortalHomePage";
import PortalDeadlinesPage from "@/pages/portal/PortalDeadlinesPage";
import PortalDocumentsPage from "@/pages/portal/PortalDocumentsPage";
import PortalMessagesPage from "@/pages/portal/PortalMessagesPage";
import PortalMessageThreadPage from "@/pages/portal/PortalMessageThreadPage";
import PortalInvoicesPage from "@/pages/portal/PortalInvoicesPage";
import PortalInvoiceDetailPage from "@/pages/portal/PortalInvoiceDetailPage";
import PortalVatPage from "@/pages/portal/PortalVatPage";
import PortalPayslipsPage from "@/pages/portal/PortalPayslipsPage";
import PortalSubmissionsPage from "@/pages/portal/PortalSubmissionsPage";
import PortalSettingsPage from "@/pages/portal/PortalSettingsPage";

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

/** Wraps portal routes — redirects staff users to the practice dashboard */
function PortalRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <PortalRouteGuard>{children}</PortalRouteGuard>
    </ProtectedRoute>
  );
}

function PortalRouteGuard({ children }: { children: React.ReactNode }) {
  const { userKind, loading } = usePermissions();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  // Staff users should not access portal routes
  if (userKind === "staff") return <Navigate to="/" replace />;
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
    <Route path="/portal/signup" element={<PublicRoute><PortalSignup /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/auth-redirect" element={<HmrcCallback />} />
    <Route path="/privacy" element={<PrivacyPolicy />} />
    <Route path="/terms" element={<TermsOfService />} />

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
    <Route path="/bank-feeds" element={<Guarded module="ledger" action="view"><BankFeeds /></Guarded>} />
    <Route path="/categorisation-rules" element={<Guarded module="ledger" action="view"><CategorisationRules /></Guarded>} />
    <Route path="/invoice-entry" element={<Guarded module="ledger" action="view"><InvoiceEntry /></Guarded>} />
    <Route path="/client-onboarding" element={<Guarded module="clients" action="view"><ClientOnboarding /></Guarded>} />

    {/* ── VAT (MTD) ────────────────────────────────────── */}
    <Route path="/vat" element={<Guarded module="vat" action="view"><VatReturns /></Guarded>} />
    <Route path="/vat/workbench" element={<Guarded module="vat" action="view"><VatReturns /></Guarded>} />
    <Route path="/vat/returns/:returnId" element={<Guarded module="vat" action="view"><VatReturnDetail /></Guarded>} />
    <Route path="/vat/obligations" element={<Guarded module="vat" action="view"><VatObligations /></Guarded>} />

    {/* ── Payroll (RTI) ────────────────────────────────── */}
    <Route path="/payroll" element={<Guarded module="payroll" action="view"><PayrollWorkbench /></Guarded>} />
    <Route path="/payroll/workbench" element={<Guarded module="payroll" action="view"><PayrollWorkbench /></Guarded>} />
    <Route path="/payroll/employers/:employerId" element={<Guarded module="payroll" action="view"><PayrollEmployerDetail /></Guarded>} />
    <Route path="/payroll/runs/:runId" element={<Guarded module="payroll" action="view"><PayrollRunDetail /></Guarded>} />
    <Route path="/payroll/rti/fps/:payrunId" element={<Guarded module="payroll" action="view"><FpsBuilderPage /></Guarded>} />
    <Route path="/payroll/rti/eps/:employerId/:period" element={<Guarded module="payroll" action="view"><EpsBuilderPage /></Guarded>} />

    {/* ── Accounts Production ──────────────────────────── */}
    <Route path="/accounts" element={<Guarded module="accounts" action="view"><AccountsPage /></Guarded>} />

    {/* ── Self Assessment ──────────────────────────────── */}
    <Route path="/self-assessment" element={<Guarded module="accounts" action="view"><SelfAssessment /></Guarded>} />

    {/* ── Corporation Tax ──────────────────────────────── */}
    <Route path="/corporation-tax" element={<Guarded module="accounts" action="view"><CorporationTax /></Guarded>} />

    <Route path="/secretarial" element={<Guarded module="secretarial" action="view"><Secretarial /></Guarded>} />
    <Route path="/secretarial/workbench" element={<Guarded module="secretarial" action="view"><Secretarial /></Guarded>} />
    <Route path="/secretarial/changes/:changeId" element={<Guarded module="secretarial" action="view"><SecretarialChangeDetail /></Guarded>} />
    <Route path="/secretarial/filings" element={<Guarded module="secretarial" action="view"><FilingHistory /></Guarded>} />

    {/* ── Incorporations ───────────────────────────────── */}
    <Route path="/incorporations" element={<Guarded module="incorporations" action="view"><Incorporations /></Guarded>} />
    <Route path="/incorporations/pipeline" element={<Guarded module="incorporations" action="view"><Incorporations /></Guarded>} />
    <Route path="/incorporations/applications/:applicationId" element={<Guarded module="incorporations" action="view"><IncorporationDetail /></Guarded>} />

    {/* ── AML / KYC ────────────────────────────────────── */}
    <Route path="/kyc" element={<Guarded module="aml" action="view"><AmlWorkbench /></Guarded>} />
    <Route path="/aml" element={<Guarded module="aml" action="view"><AmlWorkbench /></Guarded>} />
    <Route path="/aml/workbench" element={<Guarded module="aml" action="view"><AmlWorkbench /></Guarded>} />
    <Route path="/aml/cases/:caseId" element={<Guarded module="aml" action="view"><AmlCaseDetail /></Guarded>} />
    <Route path="/aml/monitoring" element={<Guarded module="aml" action="view"><AmlMonitoring /></Guarded>} />

    {/* ── Billing ──────────────────────────────────────── */}
    <Route path="/billing" element={<Guarded module="billing" action="view"><Billing /></Guarded>} />
    <Route path="/billing/invoices" element={<Guarded module="billing" action="view"><Billing /></Guarded>} />
    <Route path="/billing/plans" element={<Guarded module="billing" action="view"><PlaceholderPage title="Billing Plans" description="Recurring fee plans and subscriptions" /></Guarded>} />
    <Route path="/billing/payments" element={<Guarded module="billing" action="view"><PaymentHistory /></Guarded>} />

    {/* ── Documents ────────────────────────────────────── */}
    <Route path="/documents" element={<Guarded module="documents" action="view"><DocumentsLibrary /></Guarded>} />
    <Route path="/documents/library" element={<Guarded module="documents" action="view"><DocumentsLibrary /></Guarded>} />
    <Route path="/documents/templates" element={<Guarded module="templates" action="view"><EmailTemplates /></Guarded>} />
    <Route path="/documents/requests" element={<Guarded module="documents" action="view"><DocumentRequests /></Guarded>} />
    <Route path="/documents/signatures" element={<Guarded module="documents" action="view"><ESignatures /></Guarded>} />

    {/* ── Submissions ──────────────────────────────────── */}
    <Route path="/submissions" element={<Guarded module="submissions" action="view"><Submissions /></Guarded>} />
    <Route path="/submissions/jobs" element={<Guarded module="submissions" action="view"><Submissions /></Guarded>} />
    <Route path="/submissions/jobs/:jobId" element={<Guarded module="submissions" action="view"><SubmissionJobDetail /></Guarded>} />

    {/* ── Time Recording ─────────────────────────────── */}
    <Route path="/time" element={<Guarded module="tasks" action="view"><TimeRecording /></Guarded>} />

    {/* ── Reports ──────────────────────────────────────── */}
    <Route path="/reports" element={<Guarded module="reports" action="view"><ReportsPage /></Guarded>} />

    {/* ── Practice Management ──────────────────────────── */}
    <Route path="/practice" element={<Guarded module="settings" action="view"><PracticePage /></Guarded>} />
    <Route path="/practice/users" element={<Guarded module="settings" action="view"><StaffUsersTab /></Guarded>} />
    <Route path="/practice/roles" element={<Guarded module="settings" action="view"><PlaceholderPage title="Roles" description="Role and permission management" /></Guarded>} />
    <Route path="/practice/workflows" element={<Guarded module="automations" action="view"><WorkflowsPage /></Guarded>} />
    <Route path="/practice/integrations" element={<Guarded module="integrations" action="view"><IntegrationsHub /></Guarded>} />
    <Route path="/practice/integrations/companies-house" element={<Guarded module="secretarial" action="view"><CompaniesHouseWizard /></Guarded>} />
    <Route path="/practice/integrations/hmrc" element={<Guarded module="vat" action="view"><HmrcWizard /></Guarded>} />
    <Route path="/practice/audit-log" element={<Guarded module="settings" action="view"><AuditLog /></Guarded>} />
    <Route path="/practice/onboarding" element={<Guarded module="settings" action="view"><TenantOnboarding /></Guarded>} />
    <Route path="/admin" element={<Guarded module="settings" action="view"><TenantAdmin /></Guarded>} />

    {/* ── Settings ─────────────────────────────────────── */}
    <Route path="/settings" element={<Guarded module="settings" action="view"><Settings /></Guarded>} />
    <Route path="/settings/tenant" element={<Guarded module="settings" action="view"><Settings /></Guarded>} />
    <Route path="/settings/branding" element={<Guarded module="settings" action="view"><BrandingSettings /></Guarded>} />
    <Route path="/settings/notifications" element={<Guarded module="notifications" action="view"><NotificationSettings /></Guarded>} />
    <Route path="/settings/gdpr" element={<Guarded module="settings" action="view"><GdprSettings /></Guarded>} />
    <Route path="/settings/security" element={<Guarded module="settings" action="view"><SecuritySettings /></Guarded>} />

    {/* ── Client Portal (aud=client) ───────────────────── */}
    <Route path="/portal" element={
      <PortalRoute>
        <BrandingProvider>
          <FeaturesProvider>
            <PortalShell />
          </FeaturesProvider>
        </BrandingProvider>
      </PortalRoute>
    }>
      <Route index element={<Navigate to="/portal/home" replace />} />
      <Route path="home" element={<PortalHomePage />} />
      <Route path="deadlines" element={<PortalDeadlinesPage />} />
      <Route path="documents" element={<PortalDocumentsPage />} />
      <Route path="messages" element={<PortalMessagesPage />} />
      <Route path="messages/:threadId" element={<PortalMessageThreadPage />} />
      <Route path="invoices" element={<PortalInvoicesPage />} />
      <Route path="invoices/:invoiceId" element={<PortalInvoiceDetailPage />} />
      <Route path="vat" element={<PortalVatPage />} />
      <Route path="payslips" element={<PortalPayslipsPage />} />
      <Route path="submissions" element={<PortalSubmissionsPage />} />
      <Route path="settings" element={<PortalSettingsPage />} />
    </Route>

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
        <ClientContextProvider>
          <BrowserRouter>
            <AppRoutes />
            <CookieConsent />
          </BrowserRouter>
        </ClientContextProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
