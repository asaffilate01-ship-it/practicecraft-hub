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
import { lazy, Suspense } from "react";



// Route-level splitting keeps the mobile shell small. A module is downloaded
// only when the user opens it.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Clients = lazy(() => import("@/pages/Clients"));
const ClientDetail = lazy(() => import("@/pages/ClientDetail"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const Bookkeeping = lazy(() => import("@/pages/Bookkeeping"));
const BankFeeds = lazy(() => import("@/pages/BankFeeds"));
const CategorisationRules = lazy(() => import("@/pages/CategorisationRules"));
const ClientOnboarding = lazy(() => import("@/pages/ClientOnboarding"));
const VatReturns = lazy(() => import("@/pages/VatReturns"));
const Billing = lazy(() => import("@/pages/Billing"));
const Settings = lazy(() => import("@/pages/Settings"));
const Secretarial = lazy(() => import("@/pages/Secretarial"));
const CompanySecretarialRecord = lazy(() => import("@/pages/CompanySecretarialRecord"));
const Incorporations = lazy(() => import("@/pages/Incorporations"));
const Submissions = lazy(() => import("@/pages/Submissions"));
const AmlWorkbench = lazy(() => import("@/pages/AmlWorkbench"));
const PayrollWorkbench = lazy(() => import("@/pages/PayrollWorkbench"));
const AccountsPage = lazy(() => import("@/pages/Accounts"));
const AccountsIntelligence = lazy(() => import("@/pages/AccountsIntelligence"));
const RegulatoryReadiness = lazy(() => import("@/pages/RegulatoryReadiness"));
const DocumentsLibrary = lazy(() => import("@/pages/DocumentsLibrary"));
const ReportsPage = lazy(() => import("@/pages/Reports"));
const PracticePage = lazy(() => import("@/pages/Practice"));
const TenantOnboarding = lazy(() => import("@/pages/TenantOnboarding"));
const BrandingSettings = lazy(() => import("@/pages/BrandingSettings"));
const NotificationSettings = lazy(() => import("@/pages/NotificationSettings"));
const GdprSettings = lazy(() => import("@/pages/GdprSettings"));
const SecuritySettings = lazy(() => import("@/pages/SecuritySettings"));
const FilingHistory = lazy(() => import("@/pages/FilingHistory"));
const WorkflowsPage = lazy(() => import("@/pages/WorkflowsPage"));
const IntegrationsHub = lazy(() => import("@/pages/IntegrationsHub"));
const SubmissionJobDetail = lazy(() => import("@/pages/SubmissionJobDetail"));
const PaymentHistory = lazy(() => import("@/pages/PaymentHistory"));
const CompaniesHouseWizard = lazy(() => import("@/pages/CompaniesHouseWizard"));
const HmrcWizard = lazy(() => import("@/pages/HmrcWizard"));
const AuditLog = lazy(() => import("@/pages/AuditLog"));
const DocumentRequests = lazy(() => import("@/pages/DocumentRequests"));
const ESignatures = lazy(() => import("@/pages/ESignatures"));
const AmlMonitoring = lazy(() => import("@/pages/AmlMonitoring"));
const TimeRecording = lazy(() => import("@/pages/TimeRecording"));
const EmailTemplates = lazy(() => import("@/pages/EmailTemplates"));
const TenantAdmin = lazy(() => import("@/pages/TenantAdmin"));
const FpsBuilderPage = lazy(() => import("@/pages/rti/FpsBuilderPage"));
const EpsBuilderPage = lazy(() => import("@/pages/rti/EpsBuilderPage"));
const SelfAssessment = lazy(() => import("@/pages/SelfAssessment"));
const CharitiesWorkbench = lazy(() => import("@/pages/CharitiesWorkbench"));
const PartnershipsWorkbench = lazy(() => import("@/pages/PartnershipsWorkbench"));
const CorporationTax = lazy(() => import("@/pages/CorporationTax"));
const CisWorkbench = lazy(() => import("@/pages/CisWorkbench"));
const ItsaWorkbench = lazy(() => import("@/pages/ItsaWorkbench"));
const IxbrlTagging = lazy(() => import("@/pages/IxbrlTagging"));
const MultiCurrency = lazy(() => import("@/pages/MultiCurrency"));
const Proposals = lazy(() => import("@/pages/Proposals"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const TrialBalanceImport = lazy(() => import("@/pages/TrialBalanceImport"));
const PensionWorkbench = lazy(() => import("@/pages/PensionWorkbench"));
const InvoiceEntry = lazy(() => import("@/pages/InvoiceEntry"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const VatReturnDetail = lazy(() => import("@/pages/VatReturnDetail"));
const VatObligations = lazy(() => import("@/pages/VatObligations"));
const PayrollEmployerDetail = lazy(() => import("@/pages/PayrollEmployerDetail"));
const PayrollRunDetail = lazy(() => import("@/pages/PayrollRunDetail"));
const SecretarialChangeDetail = lazy(() => import("@/pages/SecretarialChangeDetail"));
const IncorporationDetail = lazy(() => import("@/pages/IncorporationDetail"));
const AmlCaseDetail = lazy(() => import("@/pages/AmlCaseDetail"));
const BillingPlans = lazy(() => import("@/pages/BillingPlans"));
const RolesManagement = lazy(() => import("@/pages/RolesManagement"));
const StaffUsersTab = lazy(() => import("@/pages/practice/StaffUsersTab").then((module) => ({ default: module.StaffUsersTab })));
const Login = lazy(() => import("@/pages/auth/Login"));
const Signup = lazy(() => import("@/pages/auth/Signup"));
const PortalSignup = lazy(() => import("@/pages/auth/PortalSignup"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const HmrcCallback = lazy(() => import("@/pages/auth/HmrcCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));
const EmployeePayslips = lazy(() => import("@/pages/employee/EmployeePayslips"));

// ── Portal shell + pages ────────────────────────────────────
import { PortalShell } from "@/portal/layout/PortalShell";
import { BrandingProvider } from "@/portal/branding/BrandingProvider";
import { FeaturesProvider } from "@/portal/features/FeaturesProvider";
const PortalHomePage = lazy(() => import("@/pages/portal/PortalHomePage"));
const PortalDeadlinesPage = lazy(() => import("@/pages/portal/PortalDeadlinesPage"));
const PortalDocumentsPage = lazy(() => import("@/pages/portal/PortalDocumentsPage"));
const PortalMessagesPage = lazy(() => import("@/pages/portal/PortalMessagesPage"));
const PortalMessageThreadPage = lazy(() => import("@/pages/portal/PortalMessageThreadPage"));
const PortalInvoicesPage = lazy(() => import("@/pages/portal/PortalInvoicesPage"));
const PortalInvoiceDetailPage = lazy(() => import("@/pages/portal/PortalInvoiceDetailPage"));
const PortalVatPage = lazy(() => import("@/pages/portal/PortalVatPage"));
const PortalPayslipsPage = lazy(() => import("@/pages/portal/PortalPayslipsPage"));
const PortalSubmissionsPage = lazy(() => import("@/pages/portal/PortalSubmissionsPage"));
const PortalSettingsPage = lazy(() => import("@/pages/portal/PortalSettingsPage"));

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
  const { userKind, role, loading } = usePermissions();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  // Staff users should not access portal routes
  if (userKind === "staff") return <Navigate to="/" replace />;
  if (role === "employee") return <Navigate to="/employee" replace />;
  return <>{children}</>;
}

/** Prevent portal identities from opening the unscoped practice dashboard. */
function StaffRoute({ children }: { children: React.ReactNode }) {
  const { userKind, role, loading } = usePermissions();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (userKind === "portal") {
    return <Navigate to={role === "employee" ? "/employee" : "/portal"} replace />;
  }
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
      <StaffRoute>
        <AppLayout>
          <PermissionGuard module={module} action={action}>
            {children}
          </PermissionGuard>
        </AppLayout>
      </StaffRoute>
    </ProtectedRoute>
  );
}

/** Shortcut for pages that only need login, no specific permission */
function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <StaffRoute>
        <AppLayout>{children}</AppLayout>
      </StaffRoute>
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
    <Route path="/accounts-intelligence" element={<Guarded module="accounts" action="view"><AccountsIntelligence /></Guarded>} />
    <Route path="/review-centre" element={<Guarded module="accounts" action="view"><AccountsIntelligence /></Guarded>} />
    <Route path="/regulatory-readiness" element={<Guarded module="submissions" action="view"><RegulatoryReadiness /></Guarded>} />

    {/* ── Self Assessment ──────────────────────────────── */}
    <Route path="/self-assessment" element={<Guarded module="accounts" action="view"><SelfAssessment /></Guarded>} />
    <Route path="/charities" element={<Guarded module="accounts" action="view"><CharitiesWorkbench /></Guarded>} />
    <Route path="/partnerships" element={<Guarded module="accounts" action="view"><PartnershipsWorkbench /></Guarded>} />

    {/* ── Corporation Tax ──────────────────────────────── */}
    <Route path="/corporation-tax" element={<Guarded module="accounts" action="view"><CorporationTax /></Guarded>} />

    {/* ── CIS ───────────────────────────────────────────── */}
    <Route path="/cis" element={<Guarded module="accounts" action="view"><CisWorkbench /></Guarded>} />

    {/* ── MTD IT (ITSA) ─────────────────────────────────── */}
    <Route path="/itsa" element={<Guarded module="accounts" action="view"><ItsaWorkbench /></Guarded>} />

    {/* ── iXBRL Tagging ─────────────────────────────────── */}
    <Route path="/ixbrl" element={<Guarded module="accounts" action="view"><IxbrlTagging /></Guarded>} />

    {/* ── Pensions ──────────────────────────────────────── */}
    <Route path="/pensions" element={<Guarded module="payroll" action="view"><PensionWorkbench /></Guarded>} />

    {/* ── Multi-Currency & EC Sales ────────────────────── */}
    <Route path="/multi-currency" element={<Guarded module="ledger" action="view"><MultiCurrency /></Guarded>} />

    {/* ── Proposals ────────────────────────────────────── */}
    <Route path="/proposals" element={<Guarded module="billing" action="view"><Proposals /></Guarded>} />

    {/* ── Calendar ─────────────────────────────────────── */}
    <Route path="/calendar" element={<Protected><Calendar /></Protected>} />

    {/* ── Trial Balance Import ─────────────────────────── */}
    <Route path="/import" element={<Guarded module="ledger" action="view"><TrialBalanceImport /></Guarded>} />

    <Route path="/secretarial" element={<Guarded module="secretarial" action="view"><Secretarial /></Guarded>} />
    <Route path="/secretarial/workbench" element={<Guarded module="secretarial" action="view"><Secretarial /></Guarded>} />
    <Route path="/secretarial/companies/:clientId" element={<Guarded module="secretarial" action="view"><CompanySecretarialRecord /></Guarded>} />
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
    <Route path="/billing/plans" element={<Guarded module="billing" action="view"><BillingPlans /></Guarded>} />
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
    <Route path="/practice/roles" element={<Guarded module="settings" action="view"><RolesManagement /></Guarded>} />
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
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-label="Loading workspace" /></div>}>
              <AppRoutes />
            </Suspense>
            <CookieConsent />
          </BrowserRouter>
        </ClientContextProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
