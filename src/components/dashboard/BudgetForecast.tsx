import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/overdueHelpers";

interface BudgetForecastProps {
  futureRevenue: number;
  futureExpenses: number;
  projectedBalance: number;
}

export function BudgetForecast({ futureRevenue, futureExpenses, projectedBalance }: BudgetForecastProps) {
  const balanceStatus = projectedBalance >= 0 ? 'positive' : 'negative';

  return (
    <Card className="glass border-l-4 border-l-info">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-info" />
          Previsão Orçamentária (Próximos 30 dias)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-accent" />
              Receitas Futuras
            </div>
            <p className="text-2xl font-bold text-accent">
              {formatCurrency(futureRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">A receber</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Despesas Futuras
            </div>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(futureExpenses)}
            </p>
            <p className="text-xs text-muted-foreground">A pagar</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Saldo Projetado
            </div>
            <p className={`text-2xl font-bold ${balanceStatus === 'positive' ? 'text-accent' : 'text-destructive'}`}>
              {formatCurrency(projectedBalance)}
            </p>
            <p className="text-xs text-muted-foreground">
              {balanceStatus === 'positive' ? 'Situação favorável' : 'Atenção necessária'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
