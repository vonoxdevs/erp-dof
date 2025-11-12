import { useState, useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Building2, Home } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { TrialStatusBanner } from "@/components/trial/TrialStatusBanner";

const AppLayout = () => {
  const navigate = useNavigate();
  const { company } = useAuth();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border/50 glass-strong flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center overflow-hidden">
                  {company?.logo_url ? (
                    <img 
                      src={company.logo_url} 
                      alt={company.name || "Logo da empresa"} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-primary-foreground" />
                  )}
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold">{company?.name || "ERP Financeiro DOF"}</h1>
                  <p className="text-xs text-muted-foreground">ERP Financeiro Corporativo</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user?.user_metadata?.full_name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.user_metadata?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6">
              <TrialStatusBanner />
            </div>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
