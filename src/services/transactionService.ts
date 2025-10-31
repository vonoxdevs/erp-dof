import { supabase } from "@/integrations/supabase/client";
import { getUserCompanyId } from "./userService";

export interface TransactionData {
  type: 'revenue' | 'expense' | 'transfer';
  description: string;
  amount: number;
  due_date: string;
  payment_date?: string | null;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
  category_id?: string | null;
  contact_id?: string | null;
  bank_account_id?: string | null;
  notes?: string;
  tags?: string[];
  payment_method?: string;
  reference_number?: string;
}

/**
 * Cria uma nova transação
 */
export async function createTransaction(transactionData: TransactionData) {
  try {
    const company_id = await getUserCompanyId();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...transactionData,
        company_id,
        created_by: user?.id,
        status: transactionData.status || 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar transação:', error);
      throw new Error('Erro ao criar transação: ' + error.message);
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao criar transação');
  }
}

/**
 * Atualiza uma transação existente
 */
export async function updateTransaction(id: string, transactionData: Partial<TransactionData>) {
  try {
    const company_id = await getUserCompanyId();

    const { data, error } = await supabase
      .from('transactions')
      .update(transactionData)
      .eq('id', id)
      .eq('company_id', company_id) // Garantir que só atualiza da própria empresa
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar transação:', error);
      throw new Error('Erro ao atualizar transação: ' + error.message);
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao atualizar transação');
  }
}

/**
 * Busca todas as transações da empresa do usuário
 */
export async function getTransactions() {
  try {
    const company_id = await getUserCompanyId();

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(*),
        contact:contacts(*),
        bank_account:bank_accounts!transactions_bank_account_id_fkey(*)
      `)
      .eq('company_id', company_id)
      .order('due_date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar transações:', error);
      throw new Error('Erro ao buscar transações: ' + error.message);
    }

    return data || [];
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao buscar transações');
  }
}

/**
 * Deleta uma transação
 */
export async function deleteTransaction(id: string) {
  try {
    const company_id = await getUserCompanyId();

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('company_id', company_id); // Garantir que só deleta da própria empresa

    if (error) {
      console.error('Erro ao deletar transação:', error);
      throw new Error('Erro ao deletar transação: ' + error.message);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao deletar transação');
  }
}

/**
 * Busca transações vencidas (pending com due_date < hoje)
 * Retorna separado por receitas e despesas com cálculo de dias de atraso
 */
export async function getOverdueTransactions() {
  try {
    const company_id = await getUserCompanyId();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(name, icon, color),
        contact:contacts(name, document),
        bank_account:bank_accounts!transactions_bank_account_id_fkey(bank_name, account_number)
      `)
      .eq('company_id', company_id)
      .eq('status', 'pending')
      .lt('due_date', today)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Erro ao buscar transações vencidas:', error);
      throw new Error('Erro ao buscar transações vencidas: ' + error.message);
    }

    // Calcular dias de atraso e severidade
    const processedData = (data || []).map(t => {
      const dueDate = new Date(t.due_date);
      const todayDate = new Date();
      const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let severity: 'warning' | 'danger' | 'critical';
      if (daysOverdue <= 7) severity = 'warning';
      else if (daysOverdue <= 30) severity = 'danger';
      else severity = 'critical';

      return {
        ...t,
        daysOverdue,
        severity,
        partyName: t.contact?.name || 'Não informado',
      };
    });

    // Separar por tipo
    const revenues = processedData.filter(t => t.type === 'revenue');
    const expenses = processedData.filter(t => t.type === 'expense');

    return {
      revenues: {
        total: revenues.reduce((sum, t) => sum + Number(t.amount), 0),
        count: revenues.length,
        averageDaysOverdue: revenues.length > 0 
          ? Math.round(revenues.reduce((sum, t) => sum + t.daysOverdue, 0) / revenues.length)
          : 0,
        oldestDate: revenues.length > 0 ? new Date(revenues[0].due_date) : null,
        transactions: revenues,
      },
      expenses: {
        total: expenses.reduce((sum, t) => sum + Number(t.amount), 0),
        count: expenses.length,
        averageDaysOverdue: expenses.length > 0
          ? Math.round(expenses.reduce((sum, t) => sum + t.daysOverdue, 0) / expenses.length)
          : 0,
        oldestDate: expenses.length > 0 ? new Date(expenses[0].due_date) : null,
        transactions: expenses,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao buscar transações vencidas');
  }
}

/**
 * Busca todas as transações pendentes (no prazo + vencidas)
 * Retorna separado por receitas e despesas com breakdown de status
 */
export async function getPendingTransactions() {
  try {
    const company_id = await getUserCompanyId();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:categories(name, icon, color),
        contact:contacts(name, document),
        bank_account:bank_accounts!transactions_bank_account_id_fkey(bank_name, account_number)
      `)
      .eq('company_id', company_id)
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Erro ao buscar transações pendentes:', error);
      throw new Error('Erro ao buscar transações pendentes: ' + error.message);
    }

    // Calcular dias de atraso e severidade
    const processedData = (data || []).map(t => {
      const dueDate = new Date(t.due_date);
      const todayDate = new Date(today);
      const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysOverdue > 0;
      
      let severity: 'warning' | 'danger' | 'critical' | 'on-time';
      if (!isOverdue) severity = 'on-time';
      else if (daysOverdue <= 7) severity = 'warning';
      else if (daysOverdue <= 30) severity = 'danger';
      else severity = 'critical';

      return {
        ...t,
        daysOverdue: isOverdue ? daysOverdue : 0,
        isOverdue,
        severity,
        partyName: t.contact?.name || 'Não informado',
      };
    });

    // Separar por tipo
    const revenues = processedData.filter(t => t.type === 'revenue');
    const expenses = processedData.filter(t => t.type === 'expense');

    const calculateStats = (transactions: typeof processedData) => {
      const overdue = transactions.filter(t => t.isOverdue);
      const onTime = transactions.filter(t => !t.isOverdue);
      
      return {
        total: transactions.reduce((sum, t) => sum + Number(t.amount), 0),
        count: transactions.length,
        countOverdue: overdue.length,
        countOnTime: onTime.length,
        averageDaysOverdue: overdue.length > 0 
          ? Math.round(overdue.reduce((sum, t) => sum + t.daysOverdue, 0) / overdue.length)
          : 0,
        oldestDate: overdue.length > 0 ? new Date(overdue[0].due_date) : null,
        transactions,
      };
    };

    return {
      revenues: calculateStats(revenues),
      expenses: calculateStats(expenses),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao buscar transações pendentes');
  }
}

/**
 * Marca múltiplas transações como pagas
 */
export async function markTransactionsAsPaid(transactionIds: string[]) {
  try {
    const company_id = await getUserCompanyId();
    const today = new Date().toISOString();

    const { error } = await supabase
      .from('transactions')
      .update({ 
        status: 'paid', 
        payment_date: today,
        paid_date: today 
      })
      .in('id', transactionIds)
      .eq('company_id', company_id);

    if (error) {
      console.error('Erro ao marcar transações como pagas:', error);
      throw new Error('Erro ao marcar transações como pagas: ' + error.message);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao marcar transações como pagas');
  }
}
