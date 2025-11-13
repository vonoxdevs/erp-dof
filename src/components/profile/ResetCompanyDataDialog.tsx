import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResetCompanyDataDialogProps {
  open: boolean;
  onClose: () => void;
  companyName: string;
}

export function ResetCompanyDataDialog({ open, onClose, companyName }: ResetCompanyDataDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (confirmation !== companyName) {
      toast.error("Nome da empresa não coincide");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-company-data', {
        body: {},
      });

      if (error) throw error;

      toast.success("Dados da empresa resetados com sucesso!");
      setConfirmation("");
      onClose();
      
      // Recarregar a página após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao resetar dados:", error);
      toast.error(error.message || "Erro ao resetar dados da empresa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <AlertDialogTitle className="text-xl">
              Resetar Todos os Dados da Empresa
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="font-semibold text-destructive mb-2">
                ⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!
              </p>
              <p className="text-sm text-muted-foreground">
                Ao confirmar, os seguintes dados serão permanentemente deletados:
              </p>
            </div>

            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                Todas as transações (receitas, despesas e transferências)
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                Todas as contas bancárias
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                Todos os contratos
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                Todos os contatos (clientes e fornecedores)
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                Todas as categorias personalizadas
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                Histórico de importações
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                Relatórios gerados
              </li>
              <li className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                Logs de auditoria
              </li>
            </ul>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>O que será mantido:</strong> Dados da empresa, usuários e suas permissões.
              </p>
              <p className="text-sm mt-2">
                <strong>O que será recriado:</strong> Categorias padrão do sistema.
              </p>
            </div>

            <div className="space-y-2 pt-4">
              <Label htmlFor="confirmation" className="text-base">
                Para confirmar, digite o nome da empresa: <strong>{companyName}</strong>
              </Label>
              <Input
                id="confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={companyName}
                className="font-mono"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmation("")}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={confirmation !== companyName || loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? "Resetando..." : "Sim, Resetar Todos os Dados"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
