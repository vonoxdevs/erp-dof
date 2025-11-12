import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBankAccounts() {
  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*, credit_limit, closing_day, due_day, available_credit')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('bank_name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000, // Cache por 30s
  });

  const totalBalance = accounts?.reduce(
    (sum, acc) => sum + (acc.current_balance || 0), 
    0
  ) || 0;

  return { accounts, isLoading, error, totalBalance };
}
