import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  category: Category | null;
}

export function CategoryDialog({ open, onClose, category }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "revenue",
    icon: "📁",
    color: "#3B82F6",
    description: "",
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        type: category.type,
        icon: category.icon || "📁",
        color: category.color || "#3B82F6",
        description: category.description || "",
      });
    } else {
      setFormData({
        name: "",
        type: "revenue",
        icon: "📁",
        color: "#3B82F6",
        description: "",
      });
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const categoryData = {
        company_id: profile.company_id,
        name: formData.name,
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
        description: formData.description || null,
      };

      if (category) {
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", category.id);
        if (error) throw error;
        toast.success("Categoria atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert(categoryData);
        if (error) throw error;
        toast.success("Categoria criada com sucesso!");
      }

      onClose(true);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar categoria");
    } finally {
      setLoading(false);
    }
  };

  const transactionTypes = [
    { value: "revenue", label: "Receita", description: "Entradas de dinheiro" },
    { value: "expense", label: "Despesa", description: "Saídas de dinheiro" },
    { value: "transfer", label: "Transferência", description: "Movimentações entre contas" },
  ];

  const iconsByType = {
    revenue: ["💰", "📈", "💵", "🤑", "💸", "🏦", "💳", "💴", "💶", "💷"],
    expense: ["💳", "🛒", "🏪", "🏢", "📢", "💻", "👥", "📉", "🔧", "🚗"],
    transfer: ["🔄", "↔️", "💱", "🔀", "⚡", "🔁", "➡️", "⬅️", "🔃", "💫"],
  };

  const colorsByType = {
    revenue: ["#10b981", "#22c55e", "#16a34a", "#15803d"],
    expense: ["#ef4444", "#dc2626", "#f97316", "#ea580c"],
    transfer: ["#3b82f6", "#2563eb", "#8b5cf6", "#7c3aed"],
  };

  const currentIcons = iconsByType[formData.type as keyof typeof iconsByType] || iconsByType.revenue;
  const currentColors = colorsByType[formData.type as keyof typeof colorsByType] || colorsByType.revenue;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Vendas, Salários, Marketing..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Transação *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => {
                const newType = value;
                const newIcons = iconsByType[newType as keyof typeof iconsByType];
                const newColors = colorsByType[newType as keyof typeof colorsByType];
                setFormData({ 
                  ...formData, 
                  type: newType,
                  icon: newIcons[0],
                  color: newColors[0]
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {transactionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="grid grid-cols-5 gap-2">
              {currentIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`p-3 text-2xl border-2 rounded-lg hover:bg-muted transition-all ${
                    formData.icon === icon ? "border-primary bg-muted scale-105" : "border-border"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-3">
              {currentColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    formData.color === color ? "border-primary ring-2 ring-primary/20 scale-110" : "border-border"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Descrição opcional da categoria"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {category ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
