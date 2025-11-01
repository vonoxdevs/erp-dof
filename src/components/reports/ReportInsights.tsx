import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle, Target } from "lucide-react";
import type { ReportData } from "@/services/reportService";

interface ReportInsightsProps {
  data: ReportData;
}

export function ReportInsights({ data }: ReportInsightsProps) {
  const insights = [];

  // Insight de crescimento de receitas
  if (data.trends.revenueGrowth !== 0) {
    insights.push({
      icon: data.trends.revenueGrowth > 0 ? '📈' : '📉',
      title: `Receitas ${data.trends.revenueGrowth > 0 ? 'cresceram' : 'reduziram'} ${Math.abs(data.trends.revenueGrowth).toFixed(1)}%`,
      description: `Comparado ao período anterior de ${data.period.days} dias`,
      type: data.trends.revenueGrowth > 0 ? 'positive' : 'negative'
    });
  }

  // Insight de despesas
  if (data.trends.expenseGrowth !== 0) {
    insights.push({
      icon: data.trends.expenseGrowth > 0 ? '⚠️' : '✅',
      title: `Despesas ${data.trends.expenseGrowth > 0 ? 'aumentaram' : 'reduziram'} ${Math.abs(data.trends.expenseGrowth).toFixed(1)}%`,
      description: `${data.trends.expenseGrowth > 0 ? 'Atenção ao controle de custos' : 'Ótima economia de custos'}`,
      type: data.trends.expenseGrowth > 0 ? 'warning' : 'positive'
    });
  }

  // Insight de categoria dominante
  if (data.breakdown.expensesByCategory.length > 0) {
    const topExpense = data.breakdown.expensesByCategory[0];
    if (topExpense.percentage > 40) {
      insights.push({
        icon: '💡',
        title: `Categoria "${topExpense.category}" representa ${topExpense.percentage.toFixed(0)}% das despesas`,
        description: 'Considere revisar e otimizar esta categoria',
        type: 'info'
      });
    }
  }

  // Insight de transações pendentes
  if (data.summary.pendingCount > 0) {
    insights.push({
      icon: '⏳',
      title: `${data.summary.pendingCount} transações pendentes`,
      description: 'Lembre-se de registrar os pagamentos realizados',
      type: 'info'
    });
  }

  // Insight de transações atrasadas
  if (data.summary.overdueCount > 0) {
    insights.push({
      icon: '🚨',
      title: `${data.summary.overdueCount} transações atrasadas`,
      description: 'Atenção urgente necessária para regularizar',
      type: 'warning'
    });
  }

  // Insight de saldo positivo
  if (data.summary.balance > 0) {
    insights.push({
      icon: '🎯',
      title: `Saldo positivo de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.summary.balance)}`,
      description: 'Excelente gestão financeira no período',
      type: 'positive'
    });
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-green-500/10 border-green-500/20';
      case 'negative':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 glass">
      <h3 className="text-lg font-semibold mb-4">💡 Insights do Período</h3>
      
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div 
            key={i} 
            className={`flex items-start gap-3 p-3 rounded-lg border ${getTypeColor(insight.type)}`}
          >
            <span className="text-2xl flex-shrink-0">{insight.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{insight.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
