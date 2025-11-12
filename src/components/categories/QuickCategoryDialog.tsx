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
import { useToast } from '@/hooks/use-toast';
import { TipoCategoria } from '@/types/categoria';

interface QuickCategoryDialogProps {
  tipo: TipoCategoria;
  centroCustoId?: string | null;
  open: boolean;
  onClose: (newCategoryId?: string) => void;
}

export function QuickCategoryDialog({ tipo, centroCustoId, open, onClose }: QuickCategoryDialogProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe o nome da categoria',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const cor = tipo === 'despesa' ? '#ef4444' : tipo === 'receita' ? '#10b981' : '#3b82f6';

      const insertData = {
        company_id: profile.company_id,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
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

      if (error) throw error;

      toast({
        title: 'Categoria criada',
        description: 'A nova categoria foi cadastrada com sucesso'
      });

      setNome('');
      setDescricao('');
      onClose(novaCategoria.id);
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[400px]">
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
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Salários, Marketing..."
                required
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quick-descricao">Descrição</Label>
              <Textarea
                id="quick-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição opcional"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>
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
