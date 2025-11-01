import { Card } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ChartProps {
  dailyFlow: Array<{ date: string; revenue: number; expense: number; balance: number }>;
  revenueByCategory: Array<{ category: string; amount: number; percentage: number; color: string }>;
  expensesByCategory: Array<{ category: string; amount: number; percentage: number; color: string }>;
  topCategories: Array<{ category: string; revenue: number; expense: number }>;
}

export function ReportCharts({ dailyFlow, revenueByCategory, expensesByCategory, topCategories }: ChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Fluxo Diário */}
      <Card className="p-6 glass">
        <h3 className="text-lg font-semibold mb-4">📈 Fluxo Diário</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyFlow}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis className="text-xs" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
            />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" name="Receitas" strokeWidth={2} />
            <Line type="monotone" dataKey="expense" stroke="hsl(var(--chart-2))" name="Despesas" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Gráfico de Receitas por Categoria */}
      <Card className="p-6 glass">
        <h3 className="text-lg font-semibold mb-4">💰 Receitas por Categoria</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={revenueByCategory}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(entry) => `${entry.percentage.toFixed(0)}%`}
            >
              {revenueByCategory.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Gráfico de Despesas por Categoria */}
      <Card className="p-6 glass">
        <h3 className="text-lg font-semibold mb-4">💸 Despesas por Categoria</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={expensesByCategory}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(entry) => `${entry.percentage.toFixed(0)}%`}
            >
              {expensesByCategory.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Gráfico de Top 5 Categorias */}
      <Card className="p-6 glass">
        <h3 className="text-lg font-semibold mb-4">🏆 Top 5 Categorias</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topCategories}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="category" className="text-xs" />
            <YAxis className="text-xs" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
            />
            <Legend />
            <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Receitas" />
            <Bar dataKey="expense" fill="hsl(var(--chart-2))" name="Despesas" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
