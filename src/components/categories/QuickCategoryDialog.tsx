import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TipoCategoria } from '@/types/categoria';
import { z } from 'zod';

const categorySchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
});

interface QuickCategoryDialogProps {
  tipo: TipoCategoria;
  centroCustoId?: string | null;
  open: boolean;
  onClose: () => void;
  onCategoryCreated: (categoryId: string) => void;
}

export function QuickCategoryDialog({ tipo, centroCustoId, open, onClose, onCategoryCreated }: QuickCategoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      console.log('🔄 Iniciando criação de categoria...');

      // Validação
      const validation = categorySchema.safeParse(formData);
      if (!validation.success) {
        console.error('❌ Validação falhou:', validation.error.errors);
        toast.error(validation.error.errors[0].message);
        return;
      }

      console.log('✅ Validação passou');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ Usuário não autenticado');
        throw new Error('Usuário não autenticado');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        console.error('❌ Empresa não encontrada');
        throw new Error('Empresa não encontrada');
      }

      console.log('✅ Company ID:', profile.company_id);

      const cor = tipo === 'despesa' ? '#ef4444' : tipo === 'receita' ? '#10b981' : '#3b82f6';

      const insertData = {
        company_id: profile.company_id,
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || null,
        cor,
        tipo,
        ativo: true,
        centro_custo_id: tipo !== 'centro_custo' ? centroCustoId : null
      };

      const { data: novaCategoria, error } = await supabase
        .from('categorias')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao inserir categoria:', error);
        throw error;
      }

      console.log('✅ Categoria criada com ID:', novaCategoria.id);
      toast.success('Categoria criada com sucesso!');

      console.log('🔄 Chamando onCategoryCreated...');
      onCategoryCreated(novaCategoria.id);
      
      console.log('🔄 Fechando dialog...');
      handleClose();
    } catch (error: any) {
      console.error('❌ Erro completo ao criar categoria:', error);
      toast.error(error.message || 'Erro ao criar categoria');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      nome: '',
      descricao: '',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && !loading) {
        handleClose();
      }
    }} modal>
      <DialogContent 
        className="sm:max-w-[400px] z-[100]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (loading) e.preventDefault();
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova Categoria Rápida</DialogTitle>
            <DialogDescription>
              Crie uma categoria de {tipo === 'despesa' ? 'despesa' : 'receita'} rapidamente
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="quick-nome">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quick-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Salários, Marketing..."
                required
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quick-descricao">Descrição</Label>
              <Textarea
                id="quick-descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
