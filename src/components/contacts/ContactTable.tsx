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
import { Pencil, Trash2 } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  document: string;
  document_type: string;
  type: string;
  email?: string;
  phone?: string;
  is_active: boolean;
}

interface Props {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
}

export function ContactTable({ contacts, onEdit, onDelete }: Props) {
  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      customer: "Cliente",
      supplier: "Fornecedor",
      both: "Ambos",
    };
    return types[type] || type;
  };

  const getTypeBadgeVariant = (type: string) => {
    if (type === "customer") return "default";
    if (type === "supplier") return "secondary";
    return "outline";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum contato encontrado
              </TableCell>
            </TableRow>
          ) : (
            contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm">{contact.document}</div>
                    <Badge variant="outline" className="text-xs">
                      {contact.document_type.toUpperCase()}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getTypeBadgeVariant(contact.type)}>
                    {getTypeLabel(contact.type)}
                  </Badge>
                </TableCell>
                <TableCell>{contact.email || "-"}</TableCell>
                <TableCell>{contact.phone || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(contact)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
