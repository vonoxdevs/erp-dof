import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, TrendingUp, TrendingDown, Wallet, CreditCard } from "lucide-react";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { usePendingTransactions } from "@/hooks/usePendingTransactions";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export function AccountsBalance() {
  const {
    accounts,
    totalBalance,
    isLoading
  } = useBankAccounts();
  
  const { getProjectedBalance, getPendingRevenue, getPendingExpense } = usePendingTransactions();

  // Separar contas normais de cartões de crédito
  const regularAccounts = accounts?.filter(acc => acc.account_type !== 'credit_card') || [];
  const creditCards = accounts?.filter(acc => acc.account_type === 'credit_card') || [];
  const totalCreditLimit = creditCards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);
  const totalAvailableCredit = creditCards.reduce((sum, card) => sum + (card.available_credit || card.credit_limit || 0), 0);
  const {
    data: pendingTransactions
  } = useQuery({
    queryKey: ['pending-transactions'],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const {
        data: profile
      } = await supabase.from("user_profiles").select("company_id").eq("id", user.id).single();
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const {
        data,
        error
      } = await supabase.from('transactions').select('type, amount, status').eq('company_id', profile.company_id).in('status', ['pending', 'overdue']);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000
  });
  const pendingReceivables = pendingTransactions?.filter(t => t.type === 'revenue').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  const pendingPayables = pendingTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  const projectedBalance = totalBalance + pendingReceivables - pendingPayables;
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  if (isLoading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg mb-8" />;
  }
  
  const totalProjectedBalance = regularAccounts.reduce((sum, acc) => {
    const projected = getProjectedBalance(acc.id);
    return sum + (projected ?? acc.current_balance);
  }, 0);
  
  const totalPendingRevenue = regularAccounts.reduce((sum, acc) => sum + getPendingRevenue(acc.id), 0);
  const totalPendingExpense = regularAccounts.reduce((sum, acc) => sum + getPendingExpense(acc.id), 0);
  
  return <div className="space-y-4 mb-8">
      {/* Resumo Geral */}
      {(totalPendingRevenue > 0 || totalPendingExpense > 0) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
                <p className="text-lg font-bold">{formatCurrency(totalBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-accent mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  A Receber
                </p>
                <p className="text-lg font-bold text-accent">
                  +{formatCurrency(totalPendingRevenue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-destructive mb-1 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  A Pagar
                </p>
                <p className="text-lg font-bold text-destructive">
                  -{formatCurrency(totalPendingExpense)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Saldo Previsto</p>
                <p className={cn(
                  "text-lg font-bold",
                  totalProjectedBalance >= 0 ? "text-primary" : "text-destructive"
                )}>
                  {formatCurrency(totalProjectedBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      

      {/* Contas Bancárias Regulares */}
      {regularAccounts.length > 0 && <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Contas Bancárias
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {regularAccounts.slice(0, 3).map(account => {
              const projectedBalance = getProjectedBalance(account.id);
              const pendingRevenue = getPendingRevenue(account.id);
              const pendingExpense = getPendingExpense(account.id);
              const hasPending = pendingRevenue > 0 || pendingExpense > 0;
              
              return (
                <Card key={account.id} className="border-l-4 border-l-muted">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {account.bank_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Saldo Atual</p>
                      <div className={cn("text-xl font-bold", account.current_balance >= 0 ? "text-foreground" : "text-destructive")}>
                        {formatCurrency(account.current_balance)}
                      </div>
                    </div>
                    {hasPending && projectedBalance !== null && (
                      <div className="pt-2 border-t space-y-1">
                        {pendingRevenue > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-accent flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              A receber
                            </span>
                            <span className="text-accent font-medium">
                              +{formatCurrency(pendingRevenue)}
                            </span>
                          </div>
                        )}
                        {pendingExpense > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-destructive flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />
                              A pagar
                            </span>
                            <span className="text-destructive font-medium">
                              -{formatCurrency(pendingExpense)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t">
                          <span className="text-xs font-semibold">Previsto</span>
                          <span className={cn(
                            "text-sm font-bold",
                            projectedBalance >= 0 ? "text-primary" : "text-destructive"
                          )}>
                            {formatCurrency(projectedBalance)}
                          </span>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Conta {account.account_number}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>}

      {/* Cartões de Crédito */}
      {creditCards.length > 0 && <div className="space-y-2 mt-4">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Cartões de Crédito
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {creditCards.slice(0, 3).map(card => <Card key={card.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {card.bank_name}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {formatCurrency(card.credit_limit || 0)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-accent">
                    {formatCurrency(card.available_credit || card.credit_limit || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Crédito disponível
                  </p>
                </CardContent>
              </Card>)}
          </div>
        </div>}
    </div>;
}