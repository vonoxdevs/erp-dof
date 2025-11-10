import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function AccountsBalance() {
  const { accounts, totalBalance, isLoading } = useBankAccounts();

  const { data: pendingTransactions } = useQuery({
    queryKey: ['pending-transactions'],
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
        .from('transactions')
        .select('type, amount, status')
        .eq('company_id', profile.company_id)
        .eq('status', 'pending');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const pendingReceivables = pendingTransactions?.filter(t => t.type === 'revenue')
    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  const pendingPayables = pendingTransactions?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

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

  return (
    <div className="space-y-4 mb-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Saldo Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              totalBalance >= 0 ? "text-accent" : "text-destructive"
            )}>
              {formatCurrency(totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {accounts?.length || 0} contas ativas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Contas a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {formatCurrency(pendingReceivables)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Contas a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(pendingPayables)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Saldo Previsto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              projectedBalance >= 0 ? "text-accent" : "text-destructive"
            )}>
              {formatCurrency(projectedBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Após liquidar pendências
            </p>
          </CardContent>
        </Card>
      </div>

      {accounts && accounts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.slice(0, 3).map((account) => (
            <Card key={account.id} className="border-l-4 border-l-muted">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {account.bank_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-xl font-bold",
                  account.current_balance >= 0 ? "text-foreground" : "text-destructive"
                )}>
                  {formatCurrency(account.current_balance)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Conta {account.account_number}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
