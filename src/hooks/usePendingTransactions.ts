import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface PendingBalance {
  accountId: string;
  pendingRevenue: number;
  pendingExpense: number;
  projectedBalance: number;
}

export function usePendingTransactions() {
  const queryClient = useQueryClient();
  
  const { data: pendingBalances, isLoading } = useQuery({
    queryKey: ['pending-transactions-balances'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      // Buscar transações pendentes
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', profile.company_id)
        .in('status', ['pending', 'overdue'])
        .is('deleted_at', null);
      
      if (error) throw error;

      // Buscar contas para pegar saldo atual
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('id, current_balance')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .is('deleted_at', null);

      // Calcular saldos previstos por conta
      const balanceMap = new Map<string, PendingBalance>();

      // Inicializar com saldos atuais
      accounts?.forEach(account => {
        balanceMap.set(account.id, {
          accountId: account.id,
          pendingRevenue: 0,
          pendingExpense: 0,
          projectedBalance: account.current_balance || 0
        });
      });

      // Somar transações pendentes
      transactions?.forEach(transaction => {
        if (transaction.type === 'expense' && transaction.account_from_id) {
          const balance = balanceMap.get(transaction.account_from_id);
          if (balance) {
            balance.pendingExpense += transaction.amount;
            balance.projectedBalance -= transaction.amount;
          }
        } else if (transaction.type === 'revenue' && transaction.account_to_id) {
          const balance = balanceMap.get(transaction.account_to_id);
          if (balance) {
            balance.pendingRevenue += transaction.amount;
            balance.projectedBalance += transaction.amount;
          }
        } else if (transaction.type === 'transfer') {
          if (transaction.account_from_id) {
            const fromBalance = balanceMap.get(transaction.account_from_id);
            if (fromBalance) {
              fromBalance.pendingExpense += transaction.amount;
              fromBalance.projectedBalance -= transaction.amount;
            }
          }
          if (transaction.account_to_id) {
            const toBalance = balanceMap.get(transaction.account_to_id);
            if (toBalance) {
              toBalance.pendingRevenue += transaction.amount;
              toBalance.projectedBalance += transaction.amount;
            }
          }
        }
      });

      return Array.from(balanceMap.values());
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  // Configurar realtime para atualizar quando transações mudarem
  useEffect(() => {
    const channel = supabase
      .channel('pending-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending-transactions-balances'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const getProjectedBalance = (accountId: string): number | null => {
    const balance = pendingBalances?.find(b => b.accountId === accountId);
    return balance?.projectedBalance ?? null;
  };

  const getPendingRevenue = (accountId: string): number => {
    const balance = pendingBalances?.find(b => b.accountId === accountId);
    return balance?.pendingRevenue ?? 0;
  };

  const getPendingExpense = (accountId: string): number => {
    const balance = pendingBalances?.find(b => b.accountId === accountId);
    return balance?.pendingExpense ?? 0;
  };

  return {
    pendingBalances,
    isLoading,
    getProjectedBalance,
    getPendingRevenue,
    getPendingExpense
  };
}
