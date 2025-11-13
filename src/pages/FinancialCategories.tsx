import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { FinancialCategoryTable } from '@/components/categories/FinancialCategoryTable';
import { FinancialCategoryDialog } from '@/components/categories/FinancialCategoryDialog';
import { TipoCategoria } from '@/types/categoria';

export default function FinancialCategories() {
  const [tipoAtivo, setTipoAtivo] = useState<TipoCategoria>('centro_custo');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<string | null>(null);

  const handleNovaCategoriaClick = () => {
    setCategoriaEditando(null);
    setDialogAberto(true);
  };

  const handleEditarCategoria = (id: string) => {
    setCategoriaEditando(id);
    setDialogAberto(true);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie centros de custo, categorias de receita e despesa
          </p>
        </div>
        <Button onClick={handleNovaCategoriaClick}>
          <Plus className="mr-2 h-4 w-4" />
          {tipoAtivo === 'centro_custo' ? 'Novo Centro de Custo' : 
           tipoAtivo === 'receita' ? 'Nova Categoria de Receita' : 
           'Nova Categoria de Despesa'}
        </Button>
      </div>

      <Tabs value={tipoAtivo} onValueChange={(v) => setTipoAtivo(v as TipoCategoria)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="centro_custo">
            🎯 Centro de Custo
          </TabsTrigger>
          <TabsTrigger value="receita">
            💰 Categorias de Receita
          </TabsTrigger>
          <TabsTrigger value="despesa">
            💸 Categorias de Despesa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="centro_custo" className="mt-6">
          <FinancialCategoryTable 
            tipo="centro_custo" 
            onEditar={handleEditarCategoria}
          />
        </TabsContent>

        <TabsContent value="receita" className="mt-6">
          <FinancialCategoryTable 
            tipo="receita" 
            onEditar={handleEditarCategoria}
          />
        </TabsContent>

        <TabsContent value="despesa" className="mt-6">
          <FinancialCategoryTable 
            tipo="despesa" 
            onEditar={handleEditarCategoria}
          />
        </TabsContent>
      </Tabs>

      <FinancialCategoryDialog
        tipo={tipoAtivo}
        categoriaId={categoriaEditando}
        aberto={dialogAberto}
        onClose={() => {
          setDialogAberto(false);
          setCategoriaEditando(null);
        }}
      />
    </div>
  );
}
