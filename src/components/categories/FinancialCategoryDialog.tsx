import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TipoCategoria } from '@/types/categoria';
import { ColorPicker } from '@/components/shared/ColorPicker';

interface FinancialCategoryDialogProps {
  tipo: TipoCategoria;
  categoriaId: string | null;
  aberto: boolean;
  onClose: () => void;
}

export function FinancialCategoryDialog({ tipo, categoriaId, aberto, onClose }: FinancialCategoryDialogProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cor, setCor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getTipoLabel = (t: TipoCategoria) => {
    const labels = {
      centro_custo: 'Centro de Custo',
      receita: 'Receita',
      despesa: 'Despesa'
    };
    return labels[t];
  };

  useEffect(() => {
    if (categoriaId && aberto) {
      async function fetchCategoria() {
        const { data } = await supabase
          .from('categorias')
          .select(`
            *,
            categoria_conta_bancaria(
              conta_bancaria_id,
              habilitado
            )
          `)
          .eq('id', categoriaId)
          .single();

        if (data) {
          setNome(data.nome);
          setDescricao(data.descricao || '');
          setCor(data.cor || '#3b82f6');
        }
      }
      fetchCategoria();
    } else {
      setNome('');
      setDescricao('');
      setCor(tipo === 'despesa' ? '#ef4444' : tipo === 'receita' ? '#10b981' : '#3b82f6');
    }
  }, [categoriaId, aberto, tipo]);

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

      if (categoriaId) {
        const updateData: any = {
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          cor: tipo === 'centro_custo' ? cor : (tipo === 'despesa' ? '#ef4444' : '#10b981'),
          updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('categorias')
          .update(updateData)
          .eq('id', categoriaId);

        if (updateError) throw updateError;

        // Se for centro de custo, vincular automaticamente a todas as contas ativas
        if (tipo === 'centro_custo') {
          // Buscar todas as contas ativas
          const { data: allAccounts } = await supabase
            .from('bank_accounts')
            .select('id')
            .eq('is_active', true);

          if (allAccounts && allAccounts.length > 0) {
            // Remover vínculos antigos
            await supabase
              .from('categoria_conta_bancaria')
              .delete()
              .eq('categoria_id', categoriaId);

            // Criar vínculos com todas as contas
            const vinculos = allAccounts.map(conta => ({
              categoria_id: categoriaId,
              conta_bancaria_id: conta.id,
              habilitado: true
            }));

            const { error: vinculoError } = await supabase
              .from('categoria_conta_bancaria')
              .insert(vinculos);

            if (vinculoError) throw vinculoError;
          }
        }

        toast({
          title: 'Categoria atualizada',
          description: 'As alterações foram salvas com sucesso'
        });
      } else {
        const insertData: any = {
          company_id: profile.company_id,
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          cor: tipo === 'centro_custo' ? cor : (tipo === 'despesa' ? '#ef4444' : '#10b981'),
          tipo,
          ativo: true
        };

        const { data: novaCategoria, error: insertError } = await supabase
          .from('categorias')
          .insert(insertData)
          .select()
          .single();

        if (insertError) throw insertError;

        // Se for centro de custo, vincular automaticamente a todas as contas ativas
        if (tipo === 'centro_custo' && novaCategoria) {
          const { data: allAccounts } = await supabase
            .from('bank_accounts')
            .select('id')
            .eq('is_active', true);

          if (allAccounts && allAccounts.length > 0) {
            const vinculos = allAccounts.map(conta => ({
              categoria_id: novaCategoria.id,
              conta_bancaria_id: conta.id,
              habilitado: true
            }));

            const { error: vinculoError } = await supabase
              .from('categoria_conta_bancaria')
              .insert(vinculos);

            if (vinculoError) throw vinculoError;
          }
        }

        toast({
          title: 'Categoria criada',
          description: 'A nova categoria foi cadastrada com sucesso'
        });
      }

      onClose();
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
    <Dialog open={aberto} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {categoriaId ? 'Editar' : 'Nova'} Categoria de {getTipoLabel(tipo)}
            </DialogTitle>
            <DialogDescription>
              {tipo === 'centro_custo' 
                ? 'Preencha as informações da categoria e selecione as contas bancárias'
                : `As categorias de ${tipo} aparecem automaticamente em todos os centros de custo`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Marketing, Vendas, Aluguel..."
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição opcional da categoria"
                rows={3}
              />
            </div>

            {tipo === 'centro_custo' && (
              <>
                <ColorPicker
                  value={cor}
                  onChange={setCor}
                />
                <p className="text-xs text-muted-foreground">
                  Este centro de custo será automaticamente vinculado a todas as contas bancárias ativas.
                </p>
              </>
            )}

            {tipo !== 'centro_custo' && (
              <div className="rounded-md border p-4 bg-muted/50">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-md"
                    style={{ backgroundColor: tipo === 'despesa' ? '#ef4444' : '#10b981' }}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      Cor: {tipo === 'despesa' ? 'Vermelho (Fixo)' : 'Verde (Fixo)'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      As categorias de {tipo} usam sempre a mesma cor
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
