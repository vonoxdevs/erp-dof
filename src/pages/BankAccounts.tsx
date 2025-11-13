import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Building2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { BankAccountDialog } from "@/components/bank-accounts/BankAccountDialog";
import { BankAccountCard } from "@/components/bank-accounts/BankAccountCard";
import { TransferTransactionsDialog } from "@/components/bank-accounts/TransferTransactionsDialog";
import { AdjustBalanceDialog } from "@/components/bank-accounts/AdjustBalanceDialog";
import { sanitizeError } from "@/lib/errorMapping";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  initial_balance: number;
  current_balance: number;
  account_type: string;
  is_active: boolean;
  is_default: boolean;
  credit_limit?: number;
  closing_day?: number;
  due_day?: number;
  available_credit?: number;
}

const BankAccounts = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  const [transactionCount, setTransactionCount] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [adjustBalanceDialogOpen, setAdjustBalanceDialogOpen] = useState(false);
  const [accountToAdjust, setAccountToAdjust] = useState<BankAccount | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("is_default", { ascending: false })
        .order("bank_name");

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account: BankAccount) => {
    setSelectedAccount(account);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const account = accounts.find(acc => acc.id === id);
      if (!account) return;

      // Verificar quantas transações estão vinculadas a esta conta
      const { count, error: countError } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .or(`account_from_id.eq.${id},account_to_id.eq.${id},bank_account_id.eq.${id}`)
        .is("deleted_at", null);

      if (countError) throw countError;

      setAccountToDelete(account);
      setTransactionCount(count || 0);
      setTransferDialogOpen(true);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const confirmDelete = async (targetAccountId: string | null) => {
    if (!accountToDelete) return;

    setDeleteLoading(true);
    try {
      // 1. Transferir transações se houver conta de destino
      if (targetAccountId) {
        // Atualizar account_from_id
        const { error: error1 } = await supabase
          .from("transactions")
          .update({ account_from_id: targetAccountId })
          .eq("account_from_id", accountToDelete.id)
          .is("deleted_at", null);
        
        if (error1) throw error1;

        // Atualizar account_to_id
        const { error: error2 } = await supabase
          .from("transactions")
          .update({ account_to_id: targetAccountId })
          .eq("account_to_id", accountToDelete.id)
          .is("deleted_at", null);
        
        if (error2) throw error2;

        // Atualizar bank_account_id
        const { error: error3 } = await supabase
          .from("transactions")
          .update({ bank_account_id: targetAccountId })
          .eq("bank_account_id", accountToDelete.id)
          .is("deleted_at", null);
        
        if (error3) throw error3;
      } else {
        // Remover vinculação das transações (setar como null)
        const { error: error1 } = await supabase
          .from("transactions")
          .update({ account_from_id: null })
          .eq("account_from_id", accountToDelete.id)
          .is("deleted_at", null);
        
        if (error1) throw error1;

        const { error: error2 } = await supabase
          .from("transactions")
          .update({ account_to_id: null })
          .eq("account_to_id", accountToDelete.id)
          .is("deleted_at", null);
        
        if (error2) throw error2;

        const { error: error3 } = await supabase
          .from("transactions")
          .update({ bank_account_id: null })
          .eq("bank_account_id", accountToDelete.id)
          .is("deleted_at", null);
        
        if (error3) throw error3;
      }

      // 2. Deletar contratos vinculados (soft delete)
      const { error: contractsError } = await supabase
        .from("contracts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("bank_account_id", accountToDelete.id)
        .is("deleted_at", null);
      
      if (contractsError) throw contractsError;

      // 3. Deletar credenciais de API vinculadas
      const { error: credentialsError } = await supabase
        .from("bank_api_credentials")
        .delete()
        .eq("bank_account_id", accountToDelete.id);
      
      if (credentialsError) throw credentialsError;

      // 4. Finalmente, deletar a conta bancária (soft delete)
      const { error: deleteError } = await supabase
        .from("bank_accounts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", accountToDelete.id);

      if (deleteError) throw deleteError;

      toast.success("Conta excluída com sucesso!");
      setTransferDialogOpen(false);
      setAccountToDelete(null);
      loadAccounts();
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false);
    setSelectedAccount(null);
    if (refresh) loadAccounts();
  };

  const handleAdjustBalance = (account: BankAccount) => {
    setAccountToAdjust(account);
    setAdjustBalanceDialogOpen(true);
  };

  const handleAdjustBalanceClose = (refresh?: boolean) => {
    setAdjustBalanceDialogOpen(false);
    setAccountToAdjust(null);
    if (refresh) loadAccounts();
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0);
  const activeAccounts = accounts.filter(acc => acc.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contas Bancárias</h1>
          <p className="text-muted-foreground">Gerencie suas contas e saldos</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 glass border-l-4 border-l-primary">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total em Contas</p>
              <p className="text-2xl font-bold">
                R$ {totalBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 glass border-l-4 border-l-accent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contas Ativas</p>
              <p className="text-2xl font-bold">{activeAccounts}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 glass border-l-4 border-l-info">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Contas</p>
              <p className="text-2xl font-bold">{accounts.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <BankAccountCard
            key={account.id}
            account={account}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAdjustBalance={handleAdjustBalance}
          />
        ))}
      </div>

      {accounts.length === 0 && (
        <Card className="p-12 text-center glass">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Nenhuma conta cadastrada</h3>
          <p className="text-muted-foreground mb-6">
            Comece adicionando sua primeira conta bancária
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Conta
          </Button>
        </Card>
      )}

      <BankAccountDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        account={selectedAccount}
      />

      <TransferTransactionsDialog
        open={transferDialogOpen}
        onClose={() => {
          setTransferDialogOpen(false);
          setAccountToDelete(null);
        }}
        onConfirm={confirmDelete}
        accountToDelete={accountToDelete}
        transactionCount={transactionCount}
        availableAccounts={accounts.filter(acc => acc.id !== accountToDelete?.id)}
        loading={deleteLoading}
      />

      <AdjustBalanceDialog
        open={adjustBalanceDialogOpen}
        onClose={handleAdjustBalanceClose}
        account={accountToAdjust}
      />
    </div>
  );
};

export default BankAccounts;
