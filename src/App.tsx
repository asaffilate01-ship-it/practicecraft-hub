import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import Tasks from "@/pages/Tasks";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/bookkeeping" element={<PlaceholderPage title="Bookkeeping" description="Double-entry ledger, chart of accounts, bank reconciliation" />} />
            <Route path="/vat" element={<PlaceholderPage title="VAT (MTD)" description="Making Tax Digital VAT returns & HMRC submissions" />} />
            <Route path="/payroll" element={<PlaceholderPage title="Payroll (RTI)" description="Full HMRC Real Time Information payroll engine" />} />
            <Route path="/accounts" element={<PlaceholderPage title="Accounts Production" description="FRS 102/105, CT600, SA100, iXBRL tagging" />} />
            <Route path="/secretarial" element={<PlaceholderPage title="Company Secretarial" description="Companies House filings, confirmation statements, PSC" />} />
            <Route path="/kyc" element={<PlaceholderPage title="AML / KYC" description="Client identity verification, PEP screening, risk scoring" />} />
            <Route path="/billing" element={<PlaceholderPage title="Billing" description="Invoicing, direct debit, Stripe & GoCardless integration" />} />
            <Route path="/documents" element={<PlaceholderPage title="Documents" description="Secure document storage, versioning, OCR & e-signatures" />} />
            <Route path="/reports" element={<PlaceholderPage title="Reports" description="Practice KPIs, revenue analysis, compliance reports" />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" description="Firm settings, white-label config, roles & permissions, integrations" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
