import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, format } from "date-fns";

export interface ReportData {
  period: { start: string; end: string; days: number };
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
    averageTicket: number;
    pendingCount: number;
    overdueCount: number;
  };
  breakdown: {
    revenueByCategory: Array<{ category: string; amount: number; percentage: number; color: string }>;
    expensesByCategory: Array<{ category: string; amount: number; percentage: number; color: string }>;
    dailyFlow: Array<{ date: string; revenue: number; expense: number; balance: number }>;
    topCategories: Array<{ category: string; revenue: number; expense: number }>;
  };
  transactions: Array<any>;
  trends: {
    revenueGrowth: number;
    expenseGrowth: number;
    topRevenueSource: string;
    topExpenseCategory: string;
  };
}

async function getUserCompanyId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  return profile?.company_id || null;
}

export async function getReportData(periodInDays: number): Promise<ReportData | null> {
  const companyId = await getUserCompanyId();
  if (!companyId) return null;

  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, periodInDays - 1));

  // Buscar transações do período
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      *,
      categories (name, color),
      contacts (name)
    `)
    .eq('company_id', companyId)
    .gte('due_date', format(startDate, 'yyyy-MM-dd'))
    .lte('due_date', format(endDate, 'yyyy-MM-dd'))
    .order('due_date', { ascending: false });

  if (error || !transactions) {
    console.error('❌ Error fetching transactions:', {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint
    });
    return null;
  }

  // Calcular período anterior para comparação
  const previousStartDate = startOfDay(subDays(startDate, periodInDays));
  const previousEndDate = endOfDay(subDays(startDate, 1));

  const { data: previousTransactions } = await supabase
    .from('transactions')
    .select('type, amount, status')
    .eq('company_id', companyId)
    .gte('due_date', format(previousStartDate, 'yyyy-MM-dd'))
    .lte('due_date', format(previousEndDate, 'yyyy-MM-dd'));

  // Calcular métricas
  const totalRevenue = transactions
    .filter(t => t.type === 'revenue' && t.status === 'paid')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = totalRevenue - totalExpenses;

  const transactionCount = transactions.length;
  const averageTicket = transactionCount > 0 ? (totalRevenue + totalExpenses) / transactionCount : 0;

  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const overdueCount = transactions.filter(t => t.status === 'overdue').length;

  // Calcular crescimento comparado ao período anterior
  const prevRevenue = (previousTransactions || [])
    .filter(t => t.type === 'revenue' && t.status === 'paid')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const prevExpense = (previousTransactions || [])
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const expenseGrowth = prevExpense > 0 ? ((totalExpenses - prevExpense) / prevExpense) * 100 : 0;

  // Agrupamento por categoria
  const revenueByCategory = new Map<string, { amount: number; color: string }>();
  const expensesByCategory = new Map<string, { amount: number; color: string }>();

  transactions.forEach(t => {
    if (t.status !== 'paid') return;
    
    const categoryName = t.categories?.name || 'Sem Categoria';
    const categoryColor = t.categories?.color || '#94a3b8';
    const amount = Number(t.amount);

    if (t.type === 'revenue') {
      const current = revenueByCategory.get(categoryName) || { amount: 0, color: categoryColor };
      revenueByCategory.set(categoryName, { 
        amount: current.amount + amount, 
        color: categoryColor 
      });
    } else if (t.type === 'expense') {
      const current = expensesByCategory.get(categoryName) || { amount: 0, color: categoryColor };
      expensesByCategory.set(categoryName, { 
        amount: current.amount + amount, 
        color: categoryColor 
      });
    }
  });

  const revenueArray = Array.from(revenueByCategory.entries()).map(([category, data]) => ({
    category,
    amount: data.amount,
    percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
    color: data.color
  })).sort((a, b) => b.amount - a.amount);

  const expensesArray = Array.from(expensesByCategory.entries()).map(([category, data]) => ({
    category,
    amount: data.amount,
    percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
    color: data.color
  })).sort((a, b) => b.amount - a.amount);

  // Fluxo diário
  const dailyFlowMap = new Map<string, { revenue: number; expense: number }>();
  
  transactions.forEach(t => {
    if (t.status !== 'paid') return;
    
    const dateKey = format(new Date(t.due_date), 'dd/MM');
    const current = dailyFlowMap.get(dateKey) || { revenue: 0, expense: 0 };
    
    if (t.type === 'revenue') {
      current.revenue += Number(t.amount);
    } else if (t.type === 'expense') {
      current.expense += Number(t.amount);
    }
    
    dailyFlowMap.set(dateKey, current);
  });

  const dailyFlow = Array.from(dailyFlowMap.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      expense: data.expense,
      balance: data.revenue - data.expense
    }))
    .sort((a, b) => {
      const [dayA, monthA] = a.date.split('/').map(Number);
      const [dayB, monthB] = b.date.split('/').map(Number);
      return monthA !== monthB ? monthA - monthB : dayA - dayB;
    });

  // Top categorias (combinadas)
  const categoryTotals = new Map<string, { revenue: number; expense: number }>();
  
  transactions.forEach(t => {
    if (t.status !== 'paid') return;
    
    const categoryName = t.categories?.name || 'Sem Categoria';
    const current = categoryTotals.get(categoryName) || { revenue: 0, expense: 0 };
    
    if (t.type === 'revenue') {
      current.revenue += Number(t.amount);
    } else if (t.type === 'expense') {
      current.expense += Number(t.amount);
    }
    
    categoryTotals.set(categoryName, current);
  });

  const topCategories = Array.from(categoryTotals.entries())
    .map(([category, data]) => ({
      category,
      revenue: data.revenue,
      expense: data.expense
    }))
    .sort((a, b) => (b.revenue + b.expense) - (a.revenue + a.expense))
    .slice(0, 5);

  const topRevenueSource = revenueArray[0]?.category || 'N/A';
  const topExpenseCategory = expensesArray[0]?.category || 'N/A';

  return {
    period: {
      start: format(startDate, 'dd/MM/yyyy'),
      end: format(endDate, 'dd/MM/yyyy'),
      days: periodInDays
    },
    summary: {
      totalRevenue,
      totalExpenses,
      balance,
      transactionCount,
      averageTicket,
      pendingCount,
      overdueCount
    },
    breakdown: {
      revenueByCategory: revenueArray,
      expensesByCategory: expensesArray,
      dailyFlow,
      topCategories
    },
    transactions,
    trends: {
      revenueGrowth,
      expenseGrowth,
      topRevenueSource,
      topExpenseCategory
    }
  };
}

export async function getMonthlyReportData(year: number, month: number): Promise<ReportData | null> {
  const companyId = await getUserCompanyId();
  if (!companyId) return null;

  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(new Date(year, month - 1));

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      *,
      categories (name, color),
      contacts (name)
    `)
    .eq('company_id', companyId)
    .gte('due_date', format(startDate, 'yyyy-MM-dd'))
    .lte('due_date', format(endDate, 'yyyy-MM-dd'))
    .order('due_date', { ascending: false });

  if (error || !transactions) {
    console.error('❌ Error fetching monthly transactions:', {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint
    });
    return null;
  }

  // Calcular métricas (similar ao getReportData, mas simplificado)
  const totalRevenue = transactions
    .filter(t => t.type === 'revenue' && t.status === 'paid')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    period: {
      start: format(startDate, 'dd/MM/yyyy'),
      end: format(endDate, 'dd/MM/yyyy'),
      days: endDate.getDate()
    },
    summary: {
      totalRevenue,
      totalExpenses,
      balance: totalRevenue - totalExpenses,
      transactionCount: transactions.length,
      averageTicket: transactions.length > 0 ? (totalRevenue + totalExpenses) / transactions.length : 0,
      pendingCount: transactions.filter(t => t.status === 'pending').length,
      overdueCount: transactions.filter(t => t.status === 'overdue').length
    },
    breakdown: {
      revenueByCategory: [],
      expensesByCategory: [],
      dailyFlow: [],
      topCategories: []
    },
    transactions,
    trends: {
      revenueGrowth: 0,
      expenseGrowth: 0,
      topRevenueSource: 'N/A',
      topExpenseCategory: 'N/A'
    }
  };
}

export async function getHistoricalReports() {
  const companyId = await getUserCompanyId();
  if (!companyId) return [];

  const { data, error } = await supabase
    .from('generated_reports')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching historical reports:', error);
    return [];
  }

  return data || [];
}
