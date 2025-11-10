import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Repeat, Edit, Trash2, Play, Pause, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sanitizeError } from "@/lib/errorMapping";
import { RecurringTransactionDialog } from "@/components/transactions/RecurringTransactionDialog";
import { calculateMRR, calculateMonthlyExpenses } from "@/lib/recurringCalculations";

interface RecurringContract {
  id: string;
  name: string;
  type: "revenue" | "expense";
  amount: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  total_installments: number | null;
  is_active: boolean;
  auto_generate: boolean;
  next_generation_date: string | null;
  last_generated_date: string | null;
  categories?: {
    name: string;
    icon?: string;
    color?: string;
  } | null;
}

export default function RecurringTransactions() {
  const [contracts, setContracts] = useState<RecurringContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          categories(name, icon, color)
        `)
        .eq("company_id", profile.company_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContracts((data || []) as RecurringContract[]);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("contracts")
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success(currentStatus ? "Recorrência pausada" : "Recorrência ativada");
      loadContracts();
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const deleteContract = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta recorrência?")) return;

    try {
      const { error } = await supabase
        .from("contracts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success("Recorrência excluída com sucesso!");
      loadContracts();
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const getFrequencyLabel = (freq: string) => {
    const labels = {
      daily: "Diário",
      weekly: "Semanal",
      monthly: "Mensal",
      yearly: "Anual",
    };
    return labels[freq as keyof typeof labels] || freq;
  };

  const generateNow = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-recurring-transactions');

      if (error) throw error;

      toast.success(`${data.transactions} transações geradas de ${data.contracts} contratos`);
      loadContracts();
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transações Recorrentes</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e despesas automáticas</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateNow} variant="outline" size="lg" disabled={loading}>
            <Play className="w-4 h-4 mr-2" />
            Gerar Agora
          </Button>
          <Button onClick={() => setDialogOpen(true)} size="lg">
            <Repeat className="w-4 h-4 mr-2" />
            Nova Recorrência
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Ativas</p>
            <Repeat className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">
            {contracts.filter(c => c.is_active).length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            contratos recorrentes
          </p>
        </Card>
        <Card className="p-4 border-l-4 border-l-accent">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Receitas Recorrentes (MRR)</p>
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-bold text-accent">
            R$ {calculateMRR(contracts).toLocaleString("pt-BR", { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {contracts.filter(c => c.type === "revenue" && c.is_active).length} contratos • por mês
          </p>
        </Card>
        <Card className="p-4 border-l-4 border-l-destructive">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Despesas Recorrentes</p>
            <TrendingDown className="w-4 h-4 text-destructive" />
          </div>
          <p className="text-2xl font-bold text-destructive">
            R$ {calculateMonthlyExpenses(contracts).toLocaleString("pt-BR", { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {contracts.filter(c => c.type === "expense" && c.is_active).length} contratos • por mês
          </p>
        </Card>
        <Card className="p-4 border-l-4 border-l-primary">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Balanço Recorrente</p>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className={`text-2xl font-bold ${
            (calculateMRR(contracts) - calculateMonthlyExpenses(contracts)) >= 0 
              ? 'text-accent' 
              : 'text-destructive'
          }`}>
            R$ {(calculateMRR(contracts) - calculateMonthlyExpenses(contracts))
              .toLocaleString("pt-BR", { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
              })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Receitas - Despesas mensais
          </p>
        </Card>
      </div>

      <Card>
        {contracts.length === 0 ? (
          <div className="p-12 text-center">
            <Repeat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma transação recorrente encontrada</p>
            <Button onClick={() => setDialogOpen(true)} className="mt-4">
              Criar Primeira Recorrência
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Próxima Geração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">{contract.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {contract.type === "revenue" ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-accent" />
                          <span>Receita</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4 text-destructive" />
                          <span>Despesa</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {contract.categories ? (
                      <div className="flex items-center gap-2">
                        {contract.categories.icon && <span>{contract.categories.icon}</span>}
                        <span className="text-sm">{contract.categories.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        contract.type === "revenue"
                          ? "text-accent font-semibold"
                          : "text-destructive font-semibold"
                      }
                    >
                      R$ {Number(contract.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                  <TableCell>{getFrequencyLabel(contract.frequency)}</TableCell>
                  <TableCell>
                    {contract.next_generation_date ? (
                      format(new Date(contract.next_generation_date), "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contract.is_active ? (
                      <Badge className="bg-accent">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Pausada</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(contract.id, contract.is_active)}
                        title={contract.is_active ? "Pausar" : "Ativar"}
                      >
                        {contract.is_active ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteContract(contract.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <RecurringTransactionDialog
        open={dialogOpen}
        onClose={(refresh) => {
          setDialogOpen(false);
          if (refresh) loadContracts();
        }}
      />
    </div>
  );
}
