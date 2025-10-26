import { useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, AuthGuard } from "@/hooks/useAuth";

// Páginas públicas
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import OnboardingPage from "./pages/OnboardingPage";

// Páginas protegidas
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import BankAccounts from "./pages/BankAccounts";
import AIAssistant from "./pages/AIAssistant";
import NotFound from "./pages/NotFound";

const App = () => {
  // Create QueryClient with useMemo to avoid recreation
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
    []
  );

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
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Onboarding (requer autenticação) */}
              <Route path="/onboarding" element={<OnboardingPage />} />
              
              {/* Rotas protegidas */}
              <Route
                path="/dashboard"
                element={
                  <AuthGuard>
                    <Dashboard />
                  </AuthGuard>
                }
              />
              <Route
                path="/transactions"
                element={
                  <AuthGuard>
                    <Transactions />
                  </AuthGuard>
                }
              />
              <Route
                path="/bank-accounts"
                element={
                  <AuthGuard>
                    <BankAccounts />
                  </AuthGuard>
                }
              />
              <Route
                path="/ai-assistant"
                element={
                  <AuthGuard>
                    <AIAssistant />
                  </AuthGuard>
                }
              />
              
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
