import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface CentroCusto {
  id: string;
  nome: string;
  cor?: string;
}

interface TransactionFiltersProps {
  typeFilter: string;
  statusFilter: string;
  categoryFilter: string;
  centroCustoFilter: string;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onCentroCustoChange: (value: string) => void;
}

export function TransactionFilters({
  typeFilter,
  statusFilter,
  categoryFilter,
  centroCustoFilter,
  onTypeChange,
  onStatusChange,
  onCategoryChange,
  onCentroCustoChange,
}: TransactionFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);

  useEffect(() => {
    loadCategories();
    loadCentrosCusto();
  }, []);

  const loadCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      const { data } = await supabase
        .from("categories")
        .select("id, name, icon, color")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name");

      if (data) setCategories(data);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const loadCentrosCusto = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      const { data } = await supabase
        .from("categorias")
        .select("id, nome, cor")
        .eq("company_id", profile.company_id)
        .eq("tipo", "centro_custo")
        .eq("ativo", true)
        .order("nome");

      if (data) setCentrosCusto(data);
    } catch (error) {
      console.error("Erro ao carregar centros de custo:", error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="revenue">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
            <SelectItem value="transfer">Transferências</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="overdue">Vencido</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon && `${cat.icon} `}
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Centro de Custo</Label>
        <Select value={centroCustoFilter} onValueChange={onCentroCustoChange}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os centros" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {centrosCusto.map((centro) => (
              <SelectItem key={centro.id} value={centro.id}>
                <div className="flex items-center gap-2">
                  {centro.cor && (
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: centro.cor }}
                    />
                  )}
                  <span>{centro.nome}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
