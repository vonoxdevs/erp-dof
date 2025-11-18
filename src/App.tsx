import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, AuthGuard } from "@/hooks/useAuth";

// Páginas públicas
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";

import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import OnboardingPage from "./pages/OnboardingPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ForcedPasswordChangePage from "./pages/ForcedPasswordChangePage";
import AcceptInvitePage from "./pages/AcceptInvitePage";

// Páginas protegidas
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import BankAccounts from "./pages/BankAccounts";
import Contracts from "./pages/Contracts";
import FinancialCategories from "./pages/FinancialCategories";
import Contacts from "./pages/Contacts";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import AIAssistant from "./pages/AIAssistant";
import UsersPage from "./pages/UsersPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import PlansPage from "./pages/PlansPage";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";
import OverduePage from "./pages/OverduePage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Homepage pública */}
              <Route path="/" element={<HomePage />} />
              
              {/* Rotas públicas */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/accept-invite" element={<AcceptInvitePage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              {/* Mudança forçada de senha (requer autenticação mas não empresa) */}
              <Route 
                path="/forced-password-change" 
                element={
                  <AuthGuard requireCompany={false}>
                    <ForcedPasswordChangePage />
                  </AuthGuard>
                } 
              />
              
              {/* Onboarding (requer autenticação mas não empresa) */}
              <Route 
                path="/onboarding" 
                element={
                  <AuthGuard requireCompany={false}>
                    <OnboardingPage />
                  </AuthGuard>
                } 
              />
              
              {/* Rotas protegidas com AppLayout */}
              <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/overdue" element={<OverduePage />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/bank-accounts" element={<BankAccounts />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/categories" element={<FinancialCategories />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route 
              path="/super-admin" 
              element={
                <ProtectedRoute roles={['super_admin']}>
                  <SuperAdminPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/users" 
              element={
                <ProtectedRoute roles={['admin', 'moderator']}>
                  <UsersPage />
                </ProtectedRoute>
              } 
            />
              </Route>
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
