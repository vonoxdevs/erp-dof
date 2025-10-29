import { useState, useEffect } from 'react';
import { 
  AlertCircle, TrendingDown, TrendingUp, Calendar, 
  DollarSign, Filter, Download, CheckCircle, Clock, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { getOverdueTransactions, markTransactionsAsPaid } from '@/services/transactionService';
import { exportToCSV, exportToPDF } from '@/utils/exportUtils';

interface OverdueTransaction {
  id: string;
  type: string;
  due_date: string;
  description: string;
  amount: number;
  daysOverdue: number;
  category?: { name: string; icon?: string; color?: string } | null;
  bank_account?: { bank_name: string; account_number: string } | null;
  contact?: { name: string } | null;
  partyName: string;
  status: string;
  severity: 'warning' | 'danger' | 'critical';
  [key: string]: any;
}

interface OverdueData {
  revenues: {
    total: number;
    count: number;
    averageDaysOverdue: number;
    oldestDate: Date | null;
    transactions: any[];
  };
  expenses: {
    total: number;
    count: number;
    averageDaysOverdue: number;
    oldestDate: Date | null;
    transactions: any[];
  };
}

interface OverdueTransactionsModalProps {
  onClose: () => void;
}

const OverdueTransactionsModal = ({ onClose }: OverdueTransactionsModalProps) => {
  const [activeTab, setActiveTab] = useState<'revenues' | 'expenses'>('revenues');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverdueData | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadOverdueTransactions();
  }, []);

  const loadOverdueTransactions = async () => {
    try {
      setLoading(true);
      const overdueData = await getOverdueTransactions();
      setData(overdueData);
    } catch (error) {
      console.error('Erro ao carregar transações vencidas:', error);
      toast.error('Erro ao carregar transações vencidas');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'danger':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'warning':
        return '⚠️ Atenção';
      case 'danger':
        return '🔴 Urgente';
      case 'critical':
        return '🚨 Crítico';
      default:
        return '';
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = (transactions: OverdueTransaction[]) => {
    const allIds = transactions.map(t => t.id);
    setSelectedItems(prev =>
      prev.length === allIds.length ? [] : allIds
    );
  };

  const handleMarkAsPaid = async () => {
    if (selectedItems.length === 0) {
      toast.error('Selecione pelo menos uma transação');
      return;
    }

    try {
      setProcessing(true);
      await markTransactionsAsPaid(selectedItems);
      toast.success(`${selectedItems.length} ${selectedItems.length === 1 ? 'transação marcada' : 'transações marcadas'} como paga${selectedItems.length === 1 ? '' : 's'} ✅`);
      setSelectedItems([]);
      await loadOverdueTransactions();
    } catch (error) {
      console.error('Erro ao marcar transações:', error);
      toast.error('Erro ao marcar transações como pagas');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    const currentData = activeTab === 'revenues' ? data.revenues : data.expenses;
    const selectedTransactions = selectedItems.length > 0
      ? currentData.transactions.filter(t => selectedItems.includes(t.id))
      : currentData.transactions;

    if (selectedTransactions.length === 0) {
      toast.error('Nenhuma transação para exportar');
      return;
    }

    exportToCSV(selectedTransactions, `transacoes_vencidas_${activeTab}`);
    toast.success(`${selectedTransactions.length} ${selectedTransactions.length === 1 ? 'transação exportada' : 'transações exportadas'} 📥`);
  };

  const handleExportPDF = () => {
    if (!data) return;
    const currentData = activeTab === 'revenues' ? data.revenues : data.expenses;
    const selectedTransactions = selectedItems.length > 0
      ? currentData.transactions.filter(t => selectedItems.includes(t.id))
      : currentData.transactions;

    if (selectedTransactions.length === 0) {
      toast.error('Nenhuma transação para exportar');
      return;
    }

    exportToPDF(selectedTransactions, activeTab);
    toast.success('Relatório gerado com sucesso 📄');
  };

  if (loading || !data) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg shadow-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-center mt-4 text-muted-foreground">Carregando transações vencidas...</p>
        </div>
      </div>
    );
  }

  const currentData = activeTab === 'revenues' ? data.revenues : data.expenses;

  // Se não há transações vencidas
  if (data.revenues.count === 0 && data.expenses.count === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-lg shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-2xl font-bold mb-2">🎉 Parabéns!</h2>
          <p className="text-muted-foreground mb-6">
            Não há transações vencidas. Todas as suas obrigações financeiras estão em dia!
          </p>
          <Button onClick={onClose} className="w-full">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-background rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Transações Vencidas</h2>
                <p className="text-red-100 text-sm">Receitas e despesas em atraso</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:bg-red-600 rounded-full p-2 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-muted/50 border-b">
          <div className="flex space-x-1 p-2">
            <button
              onClick={() => {
                setActiveTab('revenues');
                setSelectedItems([]);
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'revenues'
                  ? 'bg-background text-accent shadow-sm'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>Receitas Atrasadas</span>
              <span className="bg-accent/10 text-accent px-2 py-1 rounded-full text-xs font-bold">
                {data.revenues.count}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('expenses');
                setSelectedItems([]);
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === 'expenses'
                  ? 'bg-background text-destructive shadow-sm'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
            >
              <TrendingDown className="w-5 h-5" />
              <span>Despesas Atrasadas</span>
              <span className="bg-destructive/10 text-destructive px-2 py-1 rounded-full text-xs font-bold">
                {data.expenses.count}
              </span>
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gradient-to-br from-muted/20 to-background border-b">
          <div className="bg-background rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground font-medium">Valor Total</span>
              <DollarSign className={`w-5 h-5 ${activeTab === 'revenues' ? 'text-accent' : 'text-destructive'}`} />
            </div>
            <p className={`text-2xl font-bold ${activeTab === 'revenues' ? 'text-accent' : 'text-destructive'}`}>
              {formatCurrency(currentData.total)}
            </p>
          </div>

          <div className="bg-background rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground font-medium">Quantidade</span>
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {currentData.count} {currentData.count === 1 ? 'transação' : 'transações'}
            </p>
          </div>

          <div className="bg-background rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground font-medium">Média de Atraso</span>
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <p className="text-2xl font-bold text-warning">
              {currentData.averageDaysOverdue} dias
            </p>
          </div>
        </div>

        {/* Ações em Lote */}
        {selectedItems.length > 0 && (
          <div className="bg-primary/10 border-b border-primary/20 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-primary font-medium">
                {selectedItems.length} {selectedItems.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={handleMarkAsPaid}
                  disabled={processing}
                  className="bg-accent hover:bg-accent/90"
                  size="sm"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Marcar como Pago
                </Button>
                <Button 
                  onClick={handleExportCSV}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button 
                  onClick={handleExportPDF}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Transações */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentData.transactions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-accent mx-auto mb-4" />
              <p className="text-lg font-medium">
                Nenhuma {activeTab === 'revenues' ? 'receita' : 'despesa'} vencida
              </p>
              <p className="text-sm text-muted-foreground">
                Todas as transações estão em dia! 🎉
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentData.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`bg-background border-2 rounded-lg p-4 transition-all hover:shadow-md ${
                    selectedItems.includes(transaction.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <Checkbox
                      checked={selectedItems.includes(transaction.id)}
                      onCheckedChange={() => toggleSelection(transaction.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-lg truncate">
                            {transaction.description}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {transaction.partyName} • {transaction.category?.name || 'Sem categoria'}
                          </p>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          <p className={`text-2xl font-bold ${
                            activeTab === 'revenues' ? 'text-accent' : 'text-destructive'
                          }`}>
                            {activeTab === 'revenues' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            <strong>Vencimento:</strong> {formatDate(transaction.due_date)}
                          </span>
                          <span className={`px-3 py-1 rounded-full font-medium text-xs border ${getSeverityColor(transaction.severity)}`}>
                            {getSeverityBadge(transaction.severity)} • {transaction.daysOverdue} dias
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="bg-primary hover:bg-primary/90"
                          >
                            {activeTab === 'revenues' ? 'Cobrar' : 'Pagar Agora'}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                          >
                            Detalhes
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-muted/50 border-t p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button
            onClick={() => selectAll(currentData.transactions)}
            className="text-primary hover:text-primary/80 font-medium text-sm"
            disabled={currentData.transactions.length === 0}
          >
            {selectedItems.length === currentData.transactions.length ? 'Desmarcar' : 'Selecionar'} Todos
          </button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <Button size="sm" onClick={handleExportPDF}>
              Gerar Relatório
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverdueTransactionsModal;