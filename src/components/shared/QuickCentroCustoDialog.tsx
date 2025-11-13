import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { ColorPicker } from "./ColorPicker";

const centroCustoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  cor: z.string().optional(),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onCentroCustoCreated: (centroCustoId: string) => void;
  contaBancariaId?: string;
}

export function QuickCentroCustoDialog({ open, onClose, onCentroCustoCreated, contaBancariaId }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    cor: "#3b82f6",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      console.log('🔄 Iniciando criação de centro de custo...');

      // Validação
      const validation = centroCustoSchema.safeParse(formData);
      if (!validation.success) {
        console.error('❌ Validação falhou:', validation.error.errors);
        toast.error(validation.error.errors[0].message);
        return;
      }

      console.log('✅ Validação passou');

      // Buscar company_id do usuário
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) {
        console.error('❌ Empresa não encontrada');
        throw new Error("Empresa não encontrada");
      }

      console.log('✅ Company ID:', profile.company_id);

      // Criar centro de custo
      const { data, error } = await supabase
        .from("categorias")
        .insert({
          company_id: profile.company_id,
          nome: formData.nome,
          descricao: formData.descricao || null,
          tipo: "centro_custo",
          cor: formData.cor,
          ativo: true,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao inserir centro de custo:', error);
        throw error;
      }

      console.log('✅ Centro de custo criado com ID:', data.id);
      toast.success("Centro de custo criado com sucesso!");

      console.log('🔄 Chamando onCentroCustoCreated...');
      onCentroCustoCreated(data.id);
      
      console.log('🔄 Fechando dialog...');
      handleClose();
    } catch (error: any) {
      console.error("❌ Erro completo ao criar centro de custo:", error);
      toast.error(error.message || "Erro ao criar centro de custo");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      nome: "",
      descricao: "",
      cor: "#3b82f6",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && !loading) {
        handleClose();
      }
    }}>
      <DialogContent 
        className="sm:max-w-[500px]" 
        onInteractOutside={(e) => {
          // Permitir interação fora apenas se não estiver carregando
          if (loading) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (loading) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Novo Centro de Custo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Nome do centro de custo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição opcional"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <ColorPicker
              value={formData.cor}
              onChange={(cor) => setFormData({ ...formData, cor })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Centro de Custo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
