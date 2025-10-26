import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { CategoryDialog } from "@/components/categories/CategoryDialog";
import { CategoryTable } from "@/components/categories/CategoryTable";

interface Category {
  id: string;
  company_id: string;
  name: string;
  type: "income" | "expense" | "transfer";
  icon: string | null;
  color: string | null;
  is_active: boolean;
  is_system: boolean;
  description: string | null;
  created_at: string;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    loadCategories();
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

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("type", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories((data || []) as Category[]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Categoria excluída com sucesso!");
      loadCategories();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir categoria");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Categoria ${!isActive ? "ativada" : "desativada"} com sucesso!`);
      loadCategories();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar categoria");
    }
  };

  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false);
    setSelectedCategory(null);
    if (refresh) loadCategories();
  };

  const filteredCategories = categories
    .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((c) => typeFilter === "all" || c.type === typeFilter);

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const transferCategories = categories.filter((c) => c.type === "transfer");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categorias</h1>
          <p className="text-muted-foreground">Organize suas transações por categorias</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 glass">
          <p className="text-sm text-muted-foreground">Receitas</p>
          <p className="text-2xl font-bold text-green-600">{incomeCategories.length}</p>
        </Card>
        <Card className="p-4 glass">
          <p className="text-sm text-muted-foreground">Despesas</p>
          <p className="text-2xl font-bold text-red-600">{expenseCategories.length}</p>
        </Card>
        <Card className="p-4 glass">
          <p className="text-sm text-muted-foreground">Transferências</p>
          <p className="text-2xl font-bold text-blue-600">{transferCategories.length}</p>
        </Card>
        <Card className="p-4 glass">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{categories.length}</p>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4 glass">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categorias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("all")}
            >
              Todas
            </Button>
            <Button
              variant={typeFilter === "income" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("income")}
            >
              Receitas
            </Button>
            <Button
              variant={typeFilter === "expense" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("expense")}
            >
              Despesas
            </Button>
            <Button
              variant={typeFilter === "transfer" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("transfer")}
            >
              Transferências
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="glass">
        <CategoryTable
          categories={filteredCategories}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      </Card>

      {/* Dialog */}
      <CategoryDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        category={selectedCategory}
      />
    </div>
  );
};

export default Categories;
