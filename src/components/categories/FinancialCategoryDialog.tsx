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

interface FinancialCategoryDialogProps {
  tipo: TipoCategoria;
  categoriaId: string | null;
  aberto: boolean;
  onClose: () => void;
}

export function FinancialCategoryDialog({ tipo, categoriaId, aberto, onClose }: FinancialCategoryDialogProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [icon, setIcon] = useState('📁');
  const [cor, setCor] = useState('#3b82f6');
  const [contasSelecionadas, setContasSelecionadas] = useState<string[]>([]);
  const [contasBancarias, setContasBancarias] = useState<any[]>([]);
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
    async function fetchContas() {
      const { data } = await supabase
        .from('bank_accounts')
        .select('id, bank_name, account_number')
        .eq('is_active', true)
        .order('bank_name');
      
      setContasBancarias(data || []);
    }
    fetchContas();
  }, []);

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
          setIcon(data.icon || '📁');
          setCor(data.cor || '#3b82f6');
          
          const contasHabilitadas = data.categoria_conta_bancaria
            ?.filter((ccc: any) => ccc.habilitado)
            .map((ccc: any) => ccc.conta_bancaria_id) || [];
          
          setContasSelecionadas(contasHabilitadas);
        }
      }
      fetchCategoria();
    } else {
      setNome('');
      setDescricao('');
      setIcon('📁');
      setCor('#3b82f6');
      setContasSelecionadas([]);
    }
  }, [categoriaId, aberto]);

  const handleToggleConta = (contaId: string, checked: boolean) => {
    if (checked) {
      setContasSelecionadas(prev => [...prev, contaId]);
    } else {
      setContasSelecionadas(prev => prev.filter(id => id !== contaId));
    }
  };

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
        const { error: updateError } = await supabase
          .from('categorias')
          .update({
            nome: nome.trim(),
            descricao: descricao.trim() || null,
            icon: icon.trim() || '📁',
            cor: cor || '#3b82f6',
            updated_at: new Date().toISOString()
          })
          .eq('id', categoriaId);

        if (updateError) throw updateError;

        await supabase
          .from('categoria_conta_bancaria')
          .delete()
          .eq('categoria_id', categoriaId);

        if (contasSelecionadas.length > 0) {
          const vinculos = contasSelecionadas.map(contaId => ({
            categoria_id: categoriaId,
            conta_bancaria_id: contaId,
            habilitado: true
          }));

          const { error: vinculoError } = await supabase
            .from('categoria_conta_bancaria')
            .insert(vinculos);

          if (vinculoError) throw vinculoError;
        }

        toast({
          title: 'Categoria atualizada',
          description: 'As alterações foram salvas com sucesso'
        });
      } else {
        const { data: novaCategoria, error: insertError } = await supabase
          .from('categorias')
          .insert({
            company_id: profile.company_id,
            nome: nome.trim(),
            descricao: descricao.trim() || null,
            icon: icon.trim() || '📁',
            cor: cor || '#3b82f6',
            tipo,
            ativo: true
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (contasSelecionadas.length > 0 && novaCategoria) {
          const vinculos = contasSelecionadas.map(contaId => ({
            categoria_id: novaCategoria.id,
            conta_bancaria_id: contaId,
            habilitado: true
          }));

          const { error: vinculoError } = await supabase
            .from('categoria_conta_bancaria')
            .insert(vinculos);

          if (vinculoError) throw vinculoError;
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
              Preencha as informações da categoria e selecione as contas bancárias
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

            <div className="grid gap-2">
              <Label htmlFor="icon">Ícone</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Ex: 📊, 💼, 🏢, etc."
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Use emojis ou ícones para identificar visualmente a categoria
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cor">Cor de Fundo</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="cor"
                  type="color"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  placeholder="#3b82f6"
                  maxLength={7}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Escolha uma cor para destacar a categoria nas visualizações
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Contas Bancárias Habilitadas</Label>
              <div className="border rounded-md p-4 space-y-3 max-h-[200px] overflow-y-auto">
                {contasBancarias.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma conta bancária cadastrada
                  </p>
                ) : (
                  contasBancarias.map(conta => (
                    <div key={conta.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`conta-${conta.id}`}
                        checked={contasSelecionadas.includes(conta.id)}
                        onCheckedChange={(checked) =>
                          handleToggleConta(conta.id, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`conta-${conta.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {conta.bank_name} - {conta.account_number}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione em quais contas bancárias esta categoria estará disponível
              </p>
            </div>
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
