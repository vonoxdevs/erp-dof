import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Send } from "lucide-react";
import { toast } from "sonner";
import { ContractDialog } from "@/components/contracts/ContractDialog";
import { ContractTable } from "@/components/contracts/ContractTable";
import { calculateMRR } from "@/lib/recurringCalculations";

interface Contract {
  id: string;
  company_id: string;
  contract_name: string | null;
  contact_id: string;
  type: string;
  amount: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  description: string | null;
  service_description: string | null;
  bank_account_id: string | null;
  centro_custo_id: string | null;
  categoria_receita_id: string | null;
  attachments: any[] | null;
  contact?: {
    name: string;
  };
  centro_custo?: {
    nome: string;
    icon?: string;
  };
}

const Contracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

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
          contact:contacts!contracts_contact_id_fkey(name),
          centro_custo:categorias!contracts_centro_custo_id_fkey(nome, icon)
        `)
        .eq("company_id", profile.company_id)
        .is("deleted_at", null)
        .order("contract_name", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setContracts((data || []) as Contract[]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar contratos");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contract: Contract) => {
    setSelectedContract(contract);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este contrato?")) return;

    try {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Contrato excluído com sucesso!");
      loadContracts();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir contrato");
    }
  };

  const handleGenerateInvoice = async (contract: Contract) => {
    toast.info("Funcionalidade de geração de recibo em desenvolvimento");
  };

  const handleSendInvoice = async (contract: Contract) => {
    toast.info("Funcionalidade de envio de cobrança em desenvolvimento");
  };

  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false);
    setSelectedContract(null);
    if (refresh) loadContracts();
  };

  const filteredContracts = contracts.filter((c) =>
    c.contract_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeContracts = filteredContracts.filter((c) => c.is_active);
  const totalMonthlyRevenue = calculateMRR(contracts);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contratos</h1>
          <p className="text-muted-foreground">Gerencie contratos recorrentes</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 glass">
          <p className="text-sm text-muted-foreground">Contratos Ativos</p>
          <p className="text-2xl font-bold text-primary">{activeContracts.length}</p>
        </Card>
        <Card className="p-4 glass">
          <p className="text-sm text-muted-foreground">Receita Mensal Recorrente</p>
          <p className="text-2xl font-bold text-accent">
            R$ {totalMonthlyRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </Card>
        <Card className="p-4 glass">
          <p className="text-sm text-muted-foreground">Total de Contratos</p>
          <p className="text-2xl font-bold">{contracts.length}</p>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4 glass">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contratos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="glass">
        <ContractTable
          contracts={filteredContracts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onGenerateInvoice={handleGenerateInvoice}
          onSendInvoice={handleSendInvoice}
        />
      </Card>

      {/* Dialog */}
      <ContractDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        contract={selectedContract}
      />
    </div>
  );
};

export default Contracts;
