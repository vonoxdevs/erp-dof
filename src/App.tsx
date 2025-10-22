import { useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProfileGuard } from "@/components/auth/ProfileGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Rotas protegidas com ProfileGuard */}
          <Route path="/dashboard" element={
            <ProfileGuard>
              <Dashboard />
            </ProfileGuard>
          } />
          <Route path="/transactions" element={
            <ProfileGuard>
              <Transactions />
            </ProfileGuard>
          } />
          <Route path="/bank-accounts" element={
            <ProfileGuard>
              <BankAccounts />
            </ProfileGuard>
          } />
          <Route path="/ai-assistant" element={
            <ProfileGuard>
              <AIAssistant />
            </ProfileGuard>
          } />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
