import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = 'admin' | 'moderator' | 'analyst' | 'super_admin' | 'accountant' | 'manager';

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Erro ao carregar role:", error);
        setRole(null);
      } else {
        setRole(data?.role as AppRole || null);
      }
    } catch (error) {
      console.error("Erro ao verificar role do usuário:", error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isModerator = role === 'moderator' || isAdmin;

  return {
    role,
    loading,
    isAdmin,
    isModerator,
    isAnalyst: role === 'analyst',
    isSuperAdmin: role === 'super_admin',
    isAccountant: role === 'accountant',
    isManager: role === 'manager'
  };
}
