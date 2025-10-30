import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { ReceitasAtrasadasCard } from '@/components/overdue/ReceitasAtrasadasCard';
import { DespesasAtrasadasCard } from '@/components/overdue/DespesasAtrasadasCard';
import { getOverdueTransactions, markTransactionsAsPaid } from '@/services/transactionService';
import { toast } from 'sonner';
import { useState } from 'react';

const OverduePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [markingTransactionId, setMarkingTransactionId] = useState<string | null>(null);

  const {
    data: overdueData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['overdue-transactions'],
    queryFn: getOverdueTransactions,
    staleTime: 30000,
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      setMarkingTransactionId(transactionId);
      await markTransactionsAsPaid([transactionId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overdue-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação marcada como paga!');
      refetch();
    },
    onError: (error: Error) => {
      toast.error('Erro ao marcar como paga: ' + error.message);
    },
    onSettled: () => {
      setMarkingTransactionId(null);
    },
  });

  const handleMarkAsPaid = (transactionId: string) => {
    markAsPaidMutation.mutate(transactionId);
  };

  const handleEdit = (transactionId: string) => {
    navigate(`/transactions?edit=${transactionId}`);
  };

  const hasNoOverdueTransactions =
    !isLoading &&
    overdueData &&
    overdueData.revenues.count === 0 &&
    overdueData.expenses.count === 0;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <Skeleton className="h-64 w-full" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-64 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-6 border-destructive">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-center text-destructive">
            Erro ao carregar transações: {(error as Error).message}
          </p>
          <Button onClick={() => refetch()} className="mt-4 mx-auto block">
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  if (hasNoOverdueTransactions) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-12 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-2xl font-bold mb-2">Parabéns! 🎉</h3>
          <p className="text-muted-foreground mb-6">
            Você está em dia com todas as suas contas!
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Contas Atrasadas</h1>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {overdueData && (
          <>
            <ReceitasAtrasadasCard
              data={overdueData.revenues}
              onMarkAsPaid={handleMarkAsPaid}
              onEdit={handleEdit}
              isMarkingAsPaid={markAsPaidMutation.isPending}
            />
            <DespesasAtrasadasCard
              data={overdueData.expenses}
              onMarkAsPaid={handleMarkAsPaid}
              onEdit={handleEdit}
              isMarkingAsPaid={markAsPaidMutation.isPending}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default OverduePage;
