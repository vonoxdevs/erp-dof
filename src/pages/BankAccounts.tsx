import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Building2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { BankAccountDialog } from "@/components/bank-accounts/BankAccountDialog";
import { BankAccountCard } from "@/components/bank-accounts/BankAccountCard";
import { sanitizeError } from "@/lib/errorMapping";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  current_balance: number;
  account_type: string;
  is_active: boolean;
  is_default: boolean;
}

const BankAccounts = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);

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
        .order("is_default", { ascending: false });

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
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;

    try {
      const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Conta excluída com sucesso!");
      loadAccounts();
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false);
    setSelectedAccount(null);
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
    </div>
  );
};

export default BankAccounts;
