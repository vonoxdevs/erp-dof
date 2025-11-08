import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { updateUserPermissions } from "@/services/userManagementService";
import { UserWithRoles } from "@/services/userManagementService";

const permissionsSchema = z.object({
  modules: z.object({
    dashboard: z.boolean(),
    transactions: z.boolean(),
    bank_accounts: z.boolean(),
    categories: z.boolean(),
    contacts: z.boolean(),
    reports: z.boolean(),
    settings: z.boolean(),
  }),
  actions: z.object({
    create: z.boolean(),
    read: z.boolean(),
    update: z.boolean(),
    delete: z.boolean(),
    export: z.boolean(),
    import: z.boolean(),
  }),
});

type PermissionsFormData = z.infer<typeof permissionsSchema>;

interface EditPermissionsDialogProps {
  user: UserWithRoles;
  open: boolean;
  onClose: () => void;
}

export function EditPermissionsDialog({ user, open, onClose }: EditPermissionsDialogProps) {
  const queryClient = useQueryClient();

  const currentPermissions = user.permissions as any;
  
  const form = useForm<PermissionsFormData>({
    resolver: zodResolver(permissionsSchema),
    defaultValues: {
      modules: currentPermissions?.modules || {
        dashboard: true,
        transactions: false,
        bank_accounts: false,
        categories: false,
        contacts: false,
        reports: false,
        settings: false,
      },
      actions: currentPermissions?.actions || {
        create: false,
        read: true,
        update: false,
        delete: false,
        export: false,
        import: false,
      },
    },
  });

  const updateMutation = useMutation({
    mutationFn: (permissions: any) => updateUserPermissions(user.id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      toast.success('Permissões atualizadas');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar permissões");
    },
  });

  async function onSubmit(data: PermissionsFormData) {
    updateMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Permissões - {user.full_name}</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">Função:</span>
            <Badge>{user.roles[0] || 'user'}</Badge>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Módulos</CardTitle>
                <CardDescription>
                  Selecione os módulos que o usuário poderá acessar
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {Object.entries({
                  dashboard: "Dashboard",
                  transactions: "Transações",
                  bank_accounts: "Contas Bancárias",
                  categories: "Categorias",
                  contacts: "Contatos",
                  reports: "Relatórios",
                  settings: "Configurações",
                }).map(([key, label]) => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={`modules.${key}` as any}
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          {label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ações</CardTitle>
                <CardDescription>
                  Defina as ações permitidas para o usuário
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {Object.entries({
                  create: "Criar",
                  read: "Visualizar",
                  update: "Editar",
                  delete: "Excluir",
                  export: "Exportar",
                  import: "Importar",
                }).map(([key, label]) => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={`actions.${key}` as any}
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          {label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
