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
        bank_account:bank_accounts(*)
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
