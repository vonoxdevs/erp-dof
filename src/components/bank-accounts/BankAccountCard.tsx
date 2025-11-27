import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Star, CreditCard, Calendar, Calculator, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { usePendingTransactions } from "@/hooks/usePendingTransactions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

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
  available_credit?: number;
  closing_day?: number;
  due_day?: number;
}

interface Props {
  account: BankAccount;
  onEdit: (account: BankAccount) => void;
  onDelete: (id: string) => void;
  onAdjustBalance?: (account: BankAccount) => void;
  onRecalculate?: () => void;
}

export function BankAccountCard({ account, onEdit, onDelete, onAdjustBalance, onRecalculate }: Props) {
  const { isAdmin } = useUserRole();
  const { getProjectedBalance, getPendingRevenue, getPendingExpense } = usePendingTransactions();
  const [recalculating, setRecalculating] = useState(false);
  
  const getAccountTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      checking: "Conta Corrente",
      savings: "Poupança",
      investment: "Investimento",
      credit_card: "Cartão de Crédito",
      cdb: "CDB",
    };
    return types[type] || type;
  };

  const isCreditCard = account.account_type === 'credit_card';
  const projectedBalance = getProjectedBalance(account.id);
  const pendingRevenue = getPendingRevenue(account.id);
  const pendingExpense = getPendingExpense(account.id);
  const hasPendingTransactions = pendingRevenue > 0 || pendingExpense > 0;

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const oldBalance = Number(account.current_balance ?? 0);
      
      // Chamar a função do banco de dados que recalcula o saldo
      const { error } = await supabase.rpc('recalculate_bank_account_balance', {
        account_id: account.id
      });

      if (error) throw error;

      // Buscar o novo saldo
      const { data: updatedAccount, error: fetchError } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .eq('id', account.id)
        .single();

      if (fetchError) throw fetchError;

      const newBalance = Number(updatedAccount?.current_balance ?? 0);
      const difference = newBalance - oldBalance;

      if (Math.abs(difference) < 0.01) {
        toast.success("✅ Saldo verificado - Nenhuma divergência encontrada!", {
          description: `Saldo atual: R$ ${newBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        });
      } else {
        toast.warning("⚠️ Divergência detectada e corrigida!", {
          description: `Saldo anterior: R$ ${oldBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\nSaldo correto: R$ ${newBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\nDiferença: R$ ${Math.abs(difference).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          duration: 6000,
        });
      }

      // Atualizar a interface
      if (onRecalculate) onRecalculate();
    } catch (error: any) {
      console.error('Erro ao recalcular saldo:', error);
      toast.error("Erro ao recalcular saldo: " + (error.message || "Erro desconhecido"));
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <Card className={`p-6 glass ${account.is_default ? "border-2 border-primary" : ""}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{account.bank_name}</h3>
              {account.is_default && (
                <Star className="w-4 h-4 text-primary fill-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {getAccountTypeLabel(account.account_type)}
            </p>
          </div>
          <Badge variant={account.is_active ? "default" : "secondary"}>
            {account.is_active ? "Ativa" : "Inativa"}
          </Badge>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Conta</p>
          <p className="font-mono text-lg">{account.account_number}</p>
        </div>

        {isCreditCard ? (
          <>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Limite Total</p>
              <p className="text-xl font-bold text-primary">
                R$ {Number(account.credit_limit || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Disponível</p>
              <p className="text-2xl font-bold text-accent">
                R$ {Number(account.available_credit || account.credit_limit || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>

            {(account.closing_day || account.due_day) && (
              <div className="flex items-center gap-4 text-sm">
                {account.closing_day && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Fecha: dia {account.closing_day}</span>
                  </div>
                )}
                {account.due_day && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CreditCard className="w-4 h-4" />
                    <span>Vence: dia {account.due_day}</span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Saldo Atual (Pago)</p>
              <p className="text-2xl font-bold">
                R$ {Number(account.current_balance ?? 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            
            {hasPendingTransactions && projectedBalance !== null && (
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1 text-accent">
                    <TrendingUp className="w-3 h-3" />
                    Receitas Pendentes
                  </span>
                  <span className="font-medium text-accent">
                    + R$ {pendingRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1 text-destructive">
                    <TrendingDown className="w-3 h-3" />
                    Despesas Pendentes
                  </span>
                  <span className="font-medium text-destructive">
                    - R$ {pendingExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-semibold">Saldo Previsto</span>
                  <span className={`text-lg font-bold ${
                    projectedBalance >= 0 ? "text-primary" : "text-destructive"
                  }`}>
                    R$ {projectedBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground border-t pt-2">
              <p>Saldo Inicial: R$ {Number(account.initial_balance).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(account)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          {!isCreditCard && (
            <>
              {onAdjustBalance && isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAdjustBalance(account)}
                  title="Ajustar saldo manualmente (apenas admins)"
                >
                  <Calculator className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculate}
                disabled={recalculating}
                title="Recalcular saldo verificando todas as transações"
              >
                <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(account.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
