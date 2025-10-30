import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingDown, CheckCircle } from 'lucide-react';
import { OverdueTransactionItem } from './OverdueTransactionItem';
import { formatCurrency, formatDate, OVERDUE_COLORS } from '@/lib/overdueHelpers';

interface OverdueData {
  total: number;
  count: number;
  averageDaysOverdue: number;
  oldestDate: Date | null;
  transactions: any[];
}

interface DespesasAtrasadasCardProps {
  data: OverdueData;
  onMarkAsPaid: (id: string) => void;
  onEdit: (id: string) => void;
  isMarkingAsPaid?: boolean;
}

export function DespesasAtrasadasCard({
  data,
  onMarkAsPaid,
  onEdit,
  isMarkingAsPaid = false,
}: DespesasAtrasadasCardProps) {
  const hasTransactions = data.count > 0;

  return (
    <Card className={`${OVERDUE_COLORS.expense.border} border-2`}>
      <CardHeader className={OVERDUE_COLORS.expense.bg}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100">
            <TrendingDown className="h-6 w-6 text-red-700" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-red-800">Despesas Atrasadas</CardTitle>
            <p className={`text-2xl font-bold mt-1 ${OVERDUE_COLORS.expense.text}`}>
              {formatCurrency(data.total)}
            </p>
            <p className="text-sm text-red-600 mt-1">
              {data.count} {data.count === 1 ? 'despesa' : 'despesas'}
            </p>
          </div>
        </div>

        {hasTransactions && (
          <div className="mt-4 pt-4 border-t border-red-200 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-red-600">Média de atraso</p>
              <p className="font-semibold text-red-800">
                {data.averageDaysOverdue} {data.averageDaysOverdue === 1 ? 'dia' : 'dias'}
              </p>
            </div>
            <div>
              <p className="text-red-600">Mais antiga</p>
              <p className="font-semibold text-red-800">
                {data.oldestDate ? formatDate(data.oldestDate) : '-'}
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-6">
        {hasTransactions ? (
          <ScrollArea className="h-[500px] pr-4">
            {data.transactions.map((transaction) => (
              <OverdueTransactionItem
                key={transaction.id}
                transaction={transaction}
                onMarkAsPaid={onMarkAsPaid}
                onEdit={onEdit}
                isMarkingAsPaid={isMarkingAsPaid}
              />
            ))}
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-2" />
            <p>Nenhuma despesa atrasada! 🎉</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
