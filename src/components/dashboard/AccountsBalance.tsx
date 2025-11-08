import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { cn } from "@/lib/utils";

export function AccountsBalance() {
  const { accounts, totalBalance, isLoading } = useBankAccounts();

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card className="md:col-span-2 lg:col-span-1 border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Saldo Total em Contas</CardTitle>
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

      {accounts?.slice(0, 3).map((account) => (
        <Card key={account.id} className="border-l-4 border-l-accent">
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
  );
}
