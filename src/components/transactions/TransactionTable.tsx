import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ArrowUpRight, ArrowDownRight, ArrowRightLeft, Building2 } from "lucide-react";
import { formatInSaoPauloTZ } from "@/lib/dateUtils";

interface Transaction {
  id: string;
  type: "revenue" | "expense" | "transfer";
  amount: number;
  description: string;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  categories?: {
    name: string;
    icon?: string;
    color?: string;
  } | null;
  categoria_receita?: {
    id: string;
    nome: string;
    cor?: string;
    icon?: string;
  } | null;
  categoria_despesa?: {
    id: string;
    nome: string;
    cor?: string;
    icon?: string;
  } | null;
  bank_account?: {
    id: string;
    bank_name: string;
    account_number: string;
  } | null;
  account_from?: {
    id: string;
    bank_name: string;
    account_number: string;
  } | null;
  account_to?: {
    id: string;
    bank_name: string;
    account_number: string;
  } | null;
}

interface Props {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export function TransactionTable({ transactions, onEdit, onDelete }: Props) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "revenue":
        return <ArrowUpRight className="w-4 h-4 text-accent" />;
      case "expense":
        return <ArrowDownRight className="w-4 h-4 text-destructive" />;
      case "transfer":
        return <ArrowRightLeft className="w-4 h-4 text-primary" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "revenue":
        return "Receita";
      case "expense":
        return "Despesa";
      case "transfer":
        return "Transferência";
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-accent">Pago</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      case "overdue":
        return <Badge variant="destructive">Vencido</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Nenhuma transação encontrada</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Categoria</TableHead>
          <TableHead>Conta(s)</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {getTypeIcon(transaction.type)}
                <span className="text-sm">{getTypeLabel(transaction.type)}</span>
              </div>
            </TableCell>
            <TableCell className="font-medium">{transaction.description}</TableCell>
            <TableCell>
              {(transaction.categoria_despesa || transaction.categoria_receita) ? (
                <div className="flex items-center gap-2">
                  {(transaction.categoria_despesa?.icon || transaction.categoria_receita?.icon) && (
                    <span>{transaction.categoria_despesa?.icon || transaction.categoria_receita?.icon}</span>
                  )}
                  <span className="text-sm">
                    {transaction.categoria_despesa?.nome || transaction.categoria_receita?.nome}
                  </span>
                </div>
              ) : transaction.categories ? (
                <div className="flex items-center gap-2">
                  {transaction.categories.icon && <span>{transaction.categories.icon}</span>}
                  <span className="text-sm">{transaction.categories.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">-</span>
              )}
            </TableCell>
            <TableCell>
              <div className="text-xs space-y-1">
                {transaction.type === "transfer" ? (
                  <>
                    {transaction.account_from && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span className="text-destructive font-medium">De:</span>
                        <span>{transaction.account_from.bank_name}</span>
                      </div>
                    )}
                    {transaction.account_to && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span className="text-accent font-medium">Para:</span>
                        <span>{transaction.account_to.bank_name}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {transaction.bank_account && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span>{transaction.bank_account.bank_name}</span>
                      </div>
                    )}
                  </>
                )}
                {!transaction.bank_account && !transaction.account_from && !transaction.account_to && (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <span
                className={
                  transaction.type === "revenue"
                    ? "text-accent font-semibold"
                    : transaction.type === "expense"
                    ? "text-destructive font-semibold"
                    : ""
                }
              >
                R$ {Number(transaction.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </TableCell>
            <TableCell>
              {formatInSaoPauloTZ(transaction.due_date, "dd/MM/yyyy")}
            </TableCell>
            <TableCell>{getStatusBadge(transaction.status)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(transaction)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(transaction.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
