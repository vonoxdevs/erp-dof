import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/overdueHelpers";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Transaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
}

interface PendingAlertsProps {
  overdueRevenues: Transaction[];
  overdueExpenses: Transaction[];
}

export function PendingAlerts({ overdueRevenues, overdueExpenses }: PendingAlertsProps) {
  const navigate = useNavigate();
  const totalOverdueRevenue = overdueRevenues.reduce((sum, t) => sum + t.amount, 0);
  const totalOverdueExpense = overdueExpenses.reduce((sum, t) => sum + t.amount, 0);

  if (overdueRevenues.length === 0 && overdueExpenses.length === 0) {
    return (
      <Card className="glass border-l-4 border-l-accent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent">
            <Clock className="h-5 w-5" />
            Alertas de Pendências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-accent/20 bg-accent/5">
            <AlertDescription className="text-accent">
              ✓ Nenhuma pendência vencida! Suas finanças estão em dia.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-l-4 border-l-warning">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          Alertas de Pendências
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Receitas Vencidas */}
        {overdueRevenues.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="font-semibold">Receitas Vencidas</span>
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                  {overdueRevenues.length}
                </Badge>
              </div>
              <span className="text-sm font-bold text-accent">{formatCurrency(totalOverdueRevenue)}</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {overdueRevenues.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors cursor-pointer"
                  onClick={() => navigate('/transactions')}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">Venc: {formatDate(transaction.due_date)}</p>
                  </div>
                  <span className="text-sm font-semibold text-accent">{formatCurrency(transaction.amount)}</span>
                </div>
              ))}
              {overdueRevenues.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  + {overdueRevenues.length - 5} receitas vencidas
                </p>
              )}
            </div>
          </div>
        )}

        {/* Despesas Vencidas */}
        {overdueExpenses.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="font-semibold">Despesas Vencidas</span>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                  {overdueExpenses.length}
                </Badge>
              </div>
              <span className="text-sm font-bold text-destructive">{formatCurrency(totalOverdueExpense)}</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {overdueExpenses.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer"
                  onClick={() => navigate('/transactions')}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">Venc: {formatDate(transaction.due_date)}</p>
                  </div>
                  <span className="text-sm font-semibold text-destructive">{formatCurrency(transaction.amount)}</span>
                </div>
              ))}
              {overdueExpenses.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  + {overdueExpenses.length - 5} despesas vencidas
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
