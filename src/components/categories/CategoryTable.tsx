import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Power } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  is_system: boolean;
  description: string | null;
}

interface Props {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function CategoryTable({ categories, onEdit, onDelete, onToggleActive }: Props) {
  const getTypeLabel = (type: string) => {
    const types = {
      income: "Receita",
      expense: "Despesa",
      transfer: "Transferência",
      revenue: "Receita"
    };
    return types[type as keyof typeof types] || type;
  };

  const getTypeBadgeVariant = (type: string) => {
    if (type === "revenue" || type === "income") return "default";
    if (type === "expense") return "destructive";
    return "secondary";
  };

  if (categories.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Nenhuma categoria encontrada. Crie sua primeira categoria!
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Categoria</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{category.icon || "📁"}</span>
                <div>
                  <div className="font-medium">{category.name}</div>
                  {category.is_system && (
                    <Badge variant="outline" className="text-xs">
                      Sistema
                    </Badge>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={getTypeBadgeVariant(category.type) as any}>
                {getTypeLabel(category.type)}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {category.description || "-"}
            </TableCell>
            <TableCell>
              <Badge variant={category.is_active ? "default" : "secondary"}>
                {category.is_active ? "Ativa" : "Inativa"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleActive(category.id, category.is_active)}
                  title={category.is_active ? "Desativar" : "Ativar"}
                >
                  <Power className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(category)}
                  disabled={category.is_system}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(category.id)}
                  className="text-destructive"
                  disabled={category.is_system}
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
