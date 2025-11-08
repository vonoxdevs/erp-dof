import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash, Shield, User, UserCheck, UserX, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { InviteUserDialog } from "./InviteUserDialog";
import { EditPermissionsDialog } from "./EditPermissionsDialog";
import { useAuth } from "@/hooks/useAuth";
import { getCompanyUsers, updateUserStatus, deleteUser } from "@/services/userManagementService";

export function UserManagement() {
  const queryClient = useQueryClient();
  const { user, profile, hasRole } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Buscar usuários da empresa
  const { data: users, isLoading } = useQuery({
    queryKey: ['company-users'],
    queryFn: getCompanyUsers,
    enabled: hasRole(['admin', 'moderator']),
  });

  // Alternar status ativo/inativo
  const toggleUserStatus = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) => 
      updateUserStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      toast.success('Status do usuário atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  // Deletar usuário
  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      toast.success('Usuário desativado');
    },
    onError: () => {
      toast.error('Erro ao desativar usuário');
    },
  });

  const getRoleBadge = (roles: string[]) => {
    const primaryRole = roles[0] || 'user';
    const variants: Record<string, any> = {
      admin: { variant: "default", icon: <Shield className="w-3 h-3" />, label: "Admin" },
      moderator: { variant: "secondary", icon: <Shield className="w-3 h-3" />, label: "Moderador" },
      manager: { variant: "outline", icon: <User className="w-3 h-3" />, label: "Gerente" },
      accountant: { variant: "outline", icon: <User className="w-3 h-3" />, label: "Contador" },
      analyst: { variant: "outline", icon: <User className="w-3 h-3" />, label: "Analista" },
      user: { variant: "outline", icon: <User className="w-3 h-3" />, label: "Usuário" },
    };
    
    const config = variants[primaryRole] || variants.user;
    
    return (
      <Badge variant={config.variant as any} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const canManageUser = (targetUser: any) => {
    if (!hasRole(['admin', 'moderator'])) return false;
    if (targetUser.id === user?.id) return false; // Não pode gerenciar a si mesmo
    if (targetUser.roles.includes('admin') && !hasRole('admin')) return false; // Apenas admin gerencia admin
    return true;
  };

  if (!hasRole(['admin', 'moderator'])) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Você não tem permissão para gerenciar usuários
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gerenciar Usuários</CardTitle>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Convidar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Convidar Novo Usuário</DialogTitle>
            </DialogHeader>
            <InviteUserDialog onSuccess={() => setInviteDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {user.is_active ? (
                          <UserCheck className="w-4 h-4 text-primary" />
                        ) : (
                          <UserX className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      {user.full_name}
                    </div>
                  </TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{getRoleBadge(user.roles)}</TableCell>
                  <TableCell>{user.department || '-'}</TableCell>
                  <TableCell>
                    {user.last_login_at 
                      ? new Date(user.last_login_at).toLocaleDateString('pt-BR')
                      : 'Nunca acessou'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.is_active}
                      disabled={!canManageUser(user)}
                      onCheckedChange={(checked) => 
                        toggleUserStatus.mutate({ userId: user.id, isActive: checked })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canManageUser(user) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Tem certeza que deseja desativar este usuário?')) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {editingUser && (
          <EditPermissionsDialog
            user={editingUser}
            open={!!editingUser}
            onClose={() => setEditingUser(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
