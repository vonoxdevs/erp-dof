import { Card } from "@/components/ui/card";
import { BarChart3, TrendingUp, DollarSign, Calendar } from "lucide-react";

const Reports = () => {
  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Análises e relatórios financeiros detalhados</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 glass">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receitas do Mês</p>
              <p className="text-2xl font-bold">R$ 0,00</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 glass">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-destructive/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Despesas do Mês</p>
              <p className="text-2xl font-bold">R$ 0,00</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 glass">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-lg">
              <BarChart3 className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Atual</p>
              <p className="text-2xl font-bold">R$ 0,00</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 glass">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Transações</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-8 glass text-center">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold mb-2">Relatórios em Desenvolvimento</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Em breve você terá acesso a relatórios detalhados de receitas, despesas, 
          fluxo de caixa e análises comparativas por período.
        </p>
      </Card>
    </div>
  );
};

export default Reports;
