import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PermissionGuard } from "@/components/PermissionGuard";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import Tasks from "@/pages/Tasks";
import Bookkeeping from "@/pages/Bookkeeping";
import VatReturns from "@/pages/VatReturns";
import Billing from "@/pages/Billing";
import PlaceholderPage from "@/pages/PlaceholderPage";
import Settings from "@/pages/Settings";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import NotFound from "./pages/NotFound";

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

const AppRoutes = () => (
  <Routes>
    {/* Public auth routes */}
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />

    {/* Protected app routes */}
    <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
    <Route path="/clients" element={<ProtectedRoute><AppLayout><PermissionGuard module="clients" action="view"><Clients /></PermissionGuard></AppLayout></ProtectedRoute>} />
    <Route path="/clients/:id" element={<ProtectedRoute><AppLayout><PermissionGuard module="clients" action="view"><ClientDetail /></PermissionGuard></AppLayout></ProtectedRoute>} />
    <Route path="/tasks" element={<ProtectedRoute><AppLayout><PermissionGuard module="tasks" action="view"><Tasks /></PermissionGuard></AppLayout></ProtectedRoute>} />
    <Route path="/bookkeeping" element={<ProtectedRoute><AppLayout><PermissionGuard module="ledger" action="view"><Bookkeeping /></PermissionGuard></AppLayout></ProtectedRoute>} />
    <Route path="/vat" element={<ProtectedRoute><AppLayout><PermissionGuard module="vat" action="view"><VatReturns /></PermissionGuard></AppLayout></ProtectedRoute>} />
    <Route path="/payroll" element={<ProtectedRoute><AppLayout><PermissionGuard module="payroll" action="view"><PlaceholderPage title="Payroll (RTI)" description="Full HMRC Real Time Information payroll engine" /></PermissionGuard></AppLayout></ProtectedRoute>} />
    <Route path="/accounts" element={<ProtectedRoute><AppLayout><PermissionGuard module="accounts" action="view"><PlaceholderPage title="Accounts Production" description="FRS 102/105, CT600, SA100, iXBRL tagging" /></PermissionGuard></AppLayout></ProtectedRoute>} />
    <Route path="/secretarial" element={<ProtectedRoute><AppLayout><PermissionGuard module="secretarial" action="view"><PlaceholderPage title="Company Secretarial" description="Companies House filings, confirmation statements, PSC" /></PermissionGuard></AppLayout></ProtectedRoute>} />
    <Route path="/kyc" element={<ProtectedRoute><AppLayout><PermissionGuard module="aml" action="view"><PlaceholderPage title="AML / KYC" description="Client identity verification, PEP screening, risk scoring" /></PermissionGuard></AppLayout></ProtectedRoute>} />
    <Route path="/billing" element={<ProtectedRoute><AppLayout><PermissionGuard module="billing" action="view"><Billing /></PermissionGuard></AppLayout></ProtectedRoute>} />
    <Route path="/documents" element={<ProtectedRoute><AppLayout><PermissionGuard module="documents" action="view"><PlaceholderPage title="Documents" description="Secure document storage, versioning, OCR & e-signatures" /></PermissionGuard></AppLayout></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute><AppLayout><PermissionGuard module="reports" action="view"><PlaceholderPage title="Reports" description="Practice KPIs, revenue analysis, compliance reports" /></PermissionGuard></AppLayout></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><AppLayout><PermissionGuard module="settings" action="view"><Settings /></PermissionGuard></AppLayout></ProtectedRoute>} />
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
