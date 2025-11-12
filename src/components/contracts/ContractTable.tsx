import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, FileText, Send } from "lucide-react";

interface Contract {
  id: string;
  contract_name: string | null;
  contact_id: string;
  amount: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  attachments: any[] | null;
  contact?: {
    name: string;
  };
  centro_custo?: {
    nome: string;
    icon?: string;
  };
}

interface Props {
  contracts: Contract[];
  onEdit: (contract: Contract) => void;
  onDelete: (id: string) => void;
  onGenerateInvoice: (contract: Contract) => void;
  onSendInvoice: (contract: Contract) => void;
}

export function ContractTable({ contracts, onEdit, onDelete, onGenerateInvoice, onSendInvoice }: Props) {
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
          <TableHead>Nome do Contrato</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Valor Mensal</TableHead>
          <TableHead>Centro de Custo</TableHead>
          <TableHead>Início</TableHead>
          <TableHead>Anexo</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts.map((contract) => (
          <TableRow key={contract.id}>
            <TableCell className="font-medium">
              {contract.contract_name || "Sem nome"}
            </TableCell>
            <TableCell>
              {contract.contact?.name || "Cliente não informado"}
            </TableCell>
            <TableCell className="font-semibold">
              R$ {Number(contract.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </TableCell>
            <TableCell>
              {contract.centro_custo ? (
                <div className="flex items-center gap-2">
                  {contract.centro_custo.icon && <span>{contract.centro_custo.icon}</span>}
                  <span>{contract.centro_custo.nome}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell>
              {new Date(contract.start_date).toLocaleDateString("pt-BR")}
            </TableCell>
            <TableCell>
              <Badge variant={contract.attachments && contract.attachments.length > 0 ? "default" : "secondary"}>
                {contract.attachments && contract.attachments.length > 0 ? "Sim" : "Não"}
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
