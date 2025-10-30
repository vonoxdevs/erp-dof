import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, Tag, Check, Edit } from 'lucide-react';
import { formatCurrency, formatDate, getBadgeClasses } from '@/lib/overdueHelpers';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  type: 'revenue' | 'expense';
  daysOverdue: number;
  severity: 'warning' | 'danger' | 'critical';
  partyName: string;
  category?: {
    name: string;
    icon?: string;
    color?: string;
  } | null;
}

interface OverdueTransactionItemProps {
  transaction: Transaction;
  onMarkAsPaid: (id: string) => void;
  onEdit: (id: string) => void;
  isMarkingAsPaid?: boolean;
}

export function OverdueTransactionItem({
  transaction,
  onMarkAsPaid,
  onEdit,
  isMarkingAsPaid = false,
}: OverdueTransactionItemProps) {
  const valueColorClass = transaction.type === 'revenue' ? 'text-green-600' : 'text-red-600';

  return (
    <Card className="mb-3 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-sm">{transaction.description}</h4>
          <Badge className={getBadgeClasses(transaction.severity)}>
            {transaction.daysOverdue} {transaction.daysOverdue === 1 ? 'dia' : 'dias'}
          </Badge>
        </div>

        <p className={`text-2xl font-bold mb-3 ${valueColorClass}`}>
          {formatCurrency(transaction.amount)}
        </p>

        <div className="space-y-1 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Vencimento: {formatDate(transaction.due_date)}</span>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{transaction.partyName}</span>
          </div>

          {transaction.category && (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span>
                {transaction.category.icon && `${transaction.category.icon} `}
                {transaction.category.name}
              </span>
            </div>
          )}
        </div>

        <Separator className="my-3" />

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onMarkAsPaid(transaction.id)}
            className="flex-1"
            disabled={isMarkingAsPaid}
          >
            <Check className="h-4 w-4 mr-1" />
            Marcar como Paga
          </Button>

          <Button size="sm" variant="outline" onClick={() => onEdit(transaction.id)}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
