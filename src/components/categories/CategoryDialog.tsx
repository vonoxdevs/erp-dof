import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  description: string | null;
}

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  category: Category | null;
}

export function CategoryDialog({ open, onClose, category }: Props) {
  const [formData, setFormData] = useState({
    name: "",
    type: "revenue",
    icon: "",
    color: "#3b82f6",
    description: ""
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        type: category.type,
        icon: category.icon || "",
        color: category.color || "#3b82f6",
        description: category.description || ""
      });
    } else {
      setFormData({
        name: "",
        type: "revenue",
        icon: "",
        color: "#3b82f6",
        description: ""
      });
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      if (category) {
        const { error } = await supabase
          .from("categories")
          .update({
            name: formData.name,
            type: formData.type,
            icon: formData.icon || null,
            color: formData.color,
            description: formData.description || null
          })
          .eq("id", category.id);

        if (error) throw error;
        toast.success("Categoria atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert({
            company_id: profile.company_id,
            name: formData.name,
            type: formData.type,
            icon: formData.icon || null,
            color: formData.color,
            description: formData.description || null,
            is_active: true
          });

        if (error) throw error;
        toast.success("Categoria criada com sucesso!");
      }

      onClose(true);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar categoria");
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Editar" : "Nova"} Categoria</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
