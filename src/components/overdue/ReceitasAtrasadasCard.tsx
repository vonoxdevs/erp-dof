import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { OverdueTransactionItem } from './OverdueTransactionItem';
import { formatCurrency, formatDate, OVERDUE_COLORS } from '@/lib/overdueHelpers';

interface OverdueData {
  total: number;
  count: number;
  averageDaysOverdue: number;
  oldestDate: Date | null;
  transactions: any[];
  countOverdue?: number;
  countOnTime?: number;
}

interface ReceitasAtrasadasCardProps {
  data: OverdueData;
  onMarkAsPaid: (id: string) => void;
  onEdit: (id: string) => void;
  isMarkingAsPaid?: boolean;
  title?: string;
  showBreakdown?: boolean;
}

export function ReceitasAtrasadasCard({
  data,
  onMarkAsPaid,
  onEdit,
  isMarkingAsPaid = false,
  title = 'Receitas Atrasadas',
  showBreakdown = false,
}: ReceitasAtrasadasCardProps) {
  const hasTransactions = data.count > 0;

  return (
    <Card className={`${OVERDUE_COLORS.revenue.border} border-2`}>
      <CardHeader className={OVERDUE_COLORS.revenue.bg}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100">
            <TrendingUp className="h-6 w-6 text-green-700" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-green-800">{title}</CardTitle>
            <p className={`text-2xl font-bold mt-1 ${OVERDUE_COLORS.revenue.text}`}>
              {formatCurrency(data.total)}
            </p>
            <p className="text-sm text-green-600 mt-1">
              {data.count} {data.count === 1 ? 'receita' : 'receitas'}
            </p>
          </div>
        </div>

        {hasTransactions && showBreakdown && data.countOnTime !== undefined && data.countOverdue !== undefined && (
          <div className="mt-4 pt-4 border-t border-green-200">
            <div className="flex gap-4 text-sm mb-3">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-700">{data.countOnTime} no prazo</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-orange-700">{data.countOverdue} vencidas</span>
              </div>
            </div>
          </div>
        )}

        {hasTransactions && !showBreakdown && (
          <div className="mt-4 pt-4 border-t border-green-200 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-green-600">Média de atraso</p>
              <p className="font-semibold text-green-800">
                {data.averageDaysOverdue} {data.averageDaysOverdue === 1 ? 'dia' : 'dias'}
              </p>
            </div>
            <div>
              <p className="text-green-600">Mais antiga</p>
              <p className="font-semibold text-green-800">
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
            <p>Nenhuma receita atrasada! 🎉</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
