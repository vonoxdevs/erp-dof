import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export function useBankAccounts() {
  const queryClient = useQueryClient();

  const { data: accounts, isLoading, error, refetch } = useQuery({
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
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('bank_name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 0, // Sempre buscar dados frescos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Configurar realtime para atualizações automáticas
  useEffect(() => {
    const channel = supabase
      .channel('bank-accounts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts'
        },
        () => {
          // Invalidar e refetch quando houver mudanças
          queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
          queryClient.invalidateQueries({ queryKey: ['pending-transactions-balances'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          // Invalidar contas quando transações mudarem (afetam saldos)
          queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
          queryClient.invalidateQueries({ queryKey: ['pending-transactions-balances'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const totalBalance = accounts?.reduce(
    (sum, acc) => {
      console.log('🏦 Conta:', acc.bank_name, 'Saldo:', acc.current_balance);
      return sum + (acc.current_balance || 0);
    }, 
    0
  ) || 0;

  console.log('💰 Total de contas:', accounts?.length || 0, 'Saldo total:', totalBalance);

  return { accounts, isLoading, error, totalBalance, refetch };
}
