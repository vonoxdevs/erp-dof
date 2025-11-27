import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toSaoPauloTime } from '@/lib/dateUtils';

export interface ReportFilters {
  dateRange?: DateRange;
  accountId?: string;
  accountIds?: string[];
  type?: "revenue" | "expense";
  status?: "pending" | "paid" | "overdue";
  categoryId?: string;
  centroCustoId?: string;
  categoriaReceitaId?: string;
  categoriaDespesaId?: string;
}

export interface ReportData {
  period: { start: string; end: string; days: number };
  filters?: {
    dateRange?: string;
    account?: string;
    type?: string;
    status?: string;
    category?: string;
    centroCusto?: string;
    categoriaReceita?: string;
    categoriaDespesa?: string;
  };
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
    averageTicket: number;
    pendingCount: number;
    overdueCount: number;
    pendingRevenue: number;
    pendingExpenses: number;
    overdueRevenue: number;
    overdueExpenses: number;
  };
  breakdown: {
    revenueByCategory: Array<{ category: string; amount: number; percentage: number; color: string }>;
    expensesByCategory: Array<{ category: string; amount: number; percentage: number; color: string }>;
    dailyFlow: Array<{ date: string; revenue: number; expense: number; balance: number }>;
    topCategories: Array<{ category: string; revenue: number; expense: number }>;
    pendingByCategory: Array<{ category: string; revenue: number; expense: number }>;
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

export async function getReportData(periodInDays: number, filters?: ReportFilters): Promise<ReportData | null> {
  const companyId = await getUserCompanyId();
  if (!companyId) return null;

  // Usar dateRange dos filtros ou período padrão
  const endDate = filters?.dateRange?.to ? endOfDay(filters.dateRange.to) : endOfDay(new Date());
  const startDate = filters?.dateRange?.from 
    ? startOfDay(filters.dateRange.from) 
    : startOfDay(subDays(endDate, periodInDays - 1));

  // Buscar transações do período com filtros
  let query = supabase
    .from('transactions')
    .select(`
      *,
      categories (name, color),
      contacts (name)
    `)
    .eq('company_id', companyId)
    .gte('due_date', format(startDate, 'yyyy-MM-dd'))
    .lte('due_date', format(endDate, 'yyyy-MM-dd'));

  // Aplicar filtros
  if (filters?.accountIds && filters.accountIds.length > 0) {
    const accountFilters = filters.accountIds.map(accountId => 
      `bank_account_id.eq.${accountId},account_from_id.eq.${accountId},account_to_id.eq.${accountId}`
    ).join(',');
    query = query.or(accountFilters);
  } else if (filters?.accountId) {
    query = query.or(`bank_account_id.eq.${filters.accountId},account_from_id.eq.${filters.accountId},account_to_id.eq.${filters.accountId}`);
  }
  
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters?.categoryId) {
    query = query.or(`category_id.eq.${filters.categoryId},categoria_receita_id.eq.${filters.categoryId},categoria_despesa_id.eq.${filters.categoryId}`);
  }
  
  if (filters?.centroCustoId) {
    query = query.eq('centro_custo_id', filters.centroCustoId);
  }
  
  if (filters?.categoriaReceitaId) {
    query = query.eq('categoria_receita_id', filters.categoriaReceitaId);
  }
  
  if (filters?.categoriaDespesaId) {
    query = query.eq('categoria_despesa_id', filters.categoriaDespesaId);
  }

  query = query.order('due_date', { ascending: false });

  const { data: transactions, error } = await query;

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
  const paidRevenueCount = transactions.filter(t => t.type === 'revenue' && t.status === 'paid').length;
  const averageTicket = paidRevenueCount > 0 ? totalRevenue / paidRevenueCount : 0;

  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const overdueCount = transactions.filter(t => t.status === 'overdue').length;

  const pendingRevenue = transactions
    .filter(t => t.type === 'revenue' && t.status === 'pending')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const pendingExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'pending')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const overdueRevenue = transactions
    .filter(t => t.type === 'revenue' && t.status === 'overdue')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const overdueExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'overdue')
    .reduce((sum, t) => sum + Number(t.amount), 0);

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
    
    const dateKey = format(toSaoPauloTime(t.due_date), 'dd/MM');
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

  // Categorias pendentes/previstas
  const pendingByCategory = new Map<string, { revenue: number; expense: number }>();
  
  transactions.forEach(t => {
    if (t.status === 'paid') return;
    
    const categoryName = t.categories?.name || 'Sem Categoria';
    const current = pendingByCategory.get(categoryName) || { revenue: 0, expense: 0 };
    
    if (t.type === 'revenue') {
      current.revenue += Number(t.amount);
    } else if (t.type === 'expense') {
      current.expense += Number(t.amount);
    }
    
    pendingByCategory.set(categoryName, current);
  });

  const pendingByCategoryArray = Array.from(pendingByCategory.entries())
    .map(([category, data]) => ({
      category,
      revenue: data.revenue,
      expense: data.expense
    }))
    .sort((a, b) => (b.revenue + b.expense) - (a.revenue + a.expense));

  const topRevenueSource = revenueArray[0]?.category || 'N/A';
  const topExpenseCategory = expensesArray[0]?.category || 'N/A';

  // Montar informações sobre filtros aplicados
  let accountNames: string | undefined = undefined;
  if (filters?.accountIds && filters.accountIds.length > 0) {
    const { data: accounts } = await supabase
      .from('bank_accounts')
      .select('bank_name')
      .in('id', filters.accountIds);
    accountNames = accounts?.map(a => a.bank_name).join(', ');
  } else if (filters?.accountId) {
    const { data: account } = await supabase
      .from('bank_accounts')
      .select('bank_name')
      .eq('id', filters.accountId)
      .single();
    accountNames = account?.bank_name;
  }

  const filtersInfo: {
    dateRange?: string;
    account?: string;
    type?: string;
    status?: string;
    category?: string;
    centroCusto?: string;
    categoriaReceita?: string;
    categoriaDespesa?: string;
  } | undefined = filters ? {
    dateRange: filters.dateRange ? `${format(filters.dateRange.from || startDate, 'dd/MM/yyyy')} - ${format(filters.dateRange.to || endDate, 'dd/MM/yyyy')}` : undefined,
    account: accountNames,
    type: filters.type ? (filters.type === 'revenue' ? 'Receitas' : 'Despesas') : undefined,
    status: filters.status ? 
      (filters.status === 'paid' ? 'Pagos' : filters.status === 'pending' ? 'Pendentes' : 'Vencidos')
      : undefined,
    category: filters.categoryId ?
      (await supabase.from('categorias').select('nome').eq('id', filters.categoryId).single()).data?.nome
      : undefined,
    centroCusto: filters.centroCustoId ?
      (await supabase.from('categorias').select('nome').eq('id', filters.centroCustoId).single()).data?.nome
      : undefined,
    categoriaReceita: filters.categoriaReceitaId ?
      (await supabase.from('categorias').select('nome').eq('id', filters.categoriaReceitaId).single()).data?.nome
      : undefined,
    categoriaDespesa: filters.categoriaDespesaId ?
      (await supabase.from('categorias').select('nome').eq('id', filters.categoriaDespesaId).single()).data?.nome
      : undefined
  } : undefined;

  return {
    period: {
      start: format(startDate, 'dd/MM/yyyy'),
      end: format(endDate, 'dd/MM/yyyy'),
      days: periodInDays
    },
    filters: filtersInfo,
    summary: {
      totalRevenue,
      totalExpenses,
      balance,
      transactionCount,
      averageTicket,
      pendingCount,
      overdueCount,
      pendingRevenue,
      pendingExpenses,
      overdueRevenue,
      overdueExpenses
    },
    breakdown: {
      revenueByCategory: revenueArray,
      expensesByCategory: expensesArray,
      dailyFlow,
      topCategories,
      pendingByCategory: pendingByCategoryArray
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
      averageTicket: transactions.filter(t => t.type === 'revenue' && t.status === 'paid').length > 0 
        ? totalRevenue / transactions.filter(t => t.type === 'revenue' && t.status === 'paid').length 
        : 0,
      pendingCount: transactions.filter(t => t.status === 'pending').length,
      overdueCount: transactions.filter(t => t.status === 'overdue').length,
      pendingRevenue: transactions.filter(t => t.type === 'revenue' && t.status === 'pending').reduce((sum, t) => sum + Number(t.amount), 0),
      pendingExpenses: transactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((sum, t) => sum + Number(t.amount), 0),
      overdueRevenue: transactions.filter(t => t.type === 'revenue' && t.status === 'overdue').reduce((sum, t) => sum + Number(t.amount), 0),
      overdueExpenses: transactions.filter(t => t.type === 'expense' && t.status === 'overdue').reduce((sum, t) => sum + Number(t.amount), 0)
    },
    breakdown: {
      revenueByCategory: [],
      expensesByCategory: [],
      dailyFlow: [],
      topCategories: [],
      pendingByCategory: []
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
