import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { inviteUser, InviteUserData } from "@/services/userManagementService";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

const inviteSchema = z.object({
  email: z.string().email("Email inválido"),
  full_name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  role: z.enum(["admin", "moderator", "manager", "accountant", "analyst", "user"]),
  department: z.string().optional(),
  permissions: z.object({
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
  }),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  onSuccess: () => void;
}

export function InviteUserDialog({ onSuccess }: InviteUserDialogProps) {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      full_name: "",
      role: "user",
      department: "",
      permissions: {
        modules: {
          dashboard: true,
          transactions: false,
          bank_accounts: false,
          categories: false,
          contacts: false,
          reports: false,
          settings: false,
        },
        actions: {
          create: false,
          read: true,
          update: false,
          delete: false,
          export: false,
          import: false,
        },
      },
    },
  });

  const watchRole = form.watch("role");

  // Auto-preencher permissões baseado no role
  const handleRoleChange = (role: string) => {
    const permissions: Record<string, any> = {
      admin: {
        modules: {
          dashboard: true,
          transactions: true,
          bank_accounts: true,
          categories: true,
          contacts: true,
          reports: true,
          settings: true,
        },
        actions: {
          create: true,
          read: true,
          update: true,
          delete: true,
          export: true,
          import: true,
        },
      },
      moderator: {
        modules: {
          dashboard: true,
          transactions: true,
          bank_accounts: true,
          categories: true,
          contacts: true,
          reports: true,
          settings: false,
        },
        actions: {
          create: true,
          read: true,
          update: true,
          delete: false,
          export: true,
          import: true,
        },
      },
      manager: {
        modules: {
          dashboard: true,
          transactions: true,
          bank_accounts: true,
          categories: true,
          contacts: true,
          reports: true,
          settings: false,
        },
        actions: {
          create: true,
          read: true,
          update: true,
          delete: false,
          export: true,
          import: false,
        },
      },
      accountant: {
        modules: {
          dashboard: true,
          transactions: true,
          bank_accounts: false,
          categories: false,
          contacts: false,
          reports: true,
          settings: false,
        },
        actions: {
          create: true,
          read: true,
          update: true,
          delete: false,
          export: true,
          import: false,
        },
      },
      analyst: {
        modules: {
          dashboard: true,
          transactions: false,
          bank_accounts: false,
          categories: false,
          contacts: false,
          reports: true,
          settings: false,
        },
        actions: {
          create: false,
          read: true,
          update: false,
          delete: false,
          export: true,
          import: false,
        },
      },
      user: {
        modules: {
          dashboard: true,
          transactions: false,
          bank_accounts: false,
          categories: false,
          contacts: false,
          reports: false,
          settings: false,
        },
        actions: {
          create: false,
          read: true,
          update: false,
          delete: false,
          export: false,
          import: false,
        },
      },
    };

    if (role in permissions) {
      form.setValue('permissions', permissions[role]);
    }
  };

  const inviteMutation = useMutation({
    mutationFn: inviteUser,
    onSuccess: (link) => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      setInviteLink(link);
      toast.success('Convite criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar convite");
    },
  });

  async function onSubmit(data: InviteFormData) {
    const inviteData: InviteUserData = {
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      department: data.department,
      permissions: data.permissions,
    };
    inviteMutation.mutate(inviteData);
  }

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (inviteLink) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Convite Criado!</CardTitle>
            <CardDescription>
              Compartilhe o link abaixo com o novo usuário. O link expira em 7 dias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly className="font-mono text-sm" />
              <Button onClick={copyToClipboard} variant="outline">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-3">
          <Button onClick={onSuccess}>Fechar</Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo</FormLabel>
                <FormControl>
                  <Input placeholder="João Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="joao@empresa.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Função</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleRoleChange(value);
                  }} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {hasRole('admin') && (
                      <>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="moderator">Moderador</SelectItem>
                      </>
                    )}
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="accountant">Contador</SelectItem>
                    <SelectItem value="analyst">Analista</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento</FormLabel>
                <FormControl>
                  <Input placeholder="Financeiro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
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
                  name={`permissions.modules.${key}` as any}
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
                  name={`permissions.actions.${key}` as any}
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
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancelar
          </Button>
          <Button type="submit" disabled={inviteMutation.isPending}>
            {inviteMutation.isPending ? 'Enviando...' : 'Enviar Convite'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
