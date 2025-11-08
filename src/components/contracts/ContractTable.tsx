import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, FileText, Send } from "lucide-react";

interface Contract {
  id: string;
  name: string;
  type: string;
  amount: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

interface Props {
  contracts: Contract[];
  onEdit: (contract: Contract) => void;
  onDelete: (id: string) => void;
  onGenerateInvoice: (contract: Contract) => void;
  onSendInvoice: (contract: Contract) => void;
}

export function ContractTable({ contracts, onEdit, onDelete, onGenerateInvoice, onSendInvoice }: Props) {
  const getTypeLabel = (type: string) => {
    const types = {
      income: "Receita",
      expense: "Despesa",
    };
    return types[type as keyof typeof types] || type;
  };

  const getFrequencyLabel = (frequency: string) => {
    const frequencies = {
      monthly: "Mensal",
      quarterly: "Trimestral",
      semiannual: "Semestral",
      annual: "Anual",
    };
    return frequencies[frequency as keyof typeof frequencies] || frequency;
  };

  if (contracts.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Nenhum contrato encontrado. Crie seu primeiro contrato!
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Valor Mensal</TableHead>
          <TableHead>Frequência</TableHead>
          <TableHead>Início</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts.map((contract) => (
          <TableRow key={contract.id}>
            <TableCell className="font-medium">{contract.name}</TableCell>
            <TableCell>
              <Badge variant={contract.type === "revenue" ? "default" : "destructive"}>
                {getTypeLabel(contract.type)}
              </Badge>
            </TableCell>
            <TableCell className="font-semibold">
              R$ {Number(contract.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </TableCell>
            <TableCell>{getFrequencyLabel(contract.frequency)}</TableCell>
            <TableCell>{new Date(contract.start_date).toLocaleDateString("pt-BR")}</TableCell>
            <TableCell>
              <Badge variant={contract.is_active ? "default" : "secondary"}>
                {contract.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onGenerateInvoice(contract)}
                  title="Gerar Recibo"
                >
                  <FileText className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSendInvoice(contract)}
                  title="Enviar Cobrança"
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(contract)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(contract.id)}
                  className="text-destructive"
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
