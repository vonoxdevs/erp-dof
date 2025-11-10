import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Users, Shield, Plus } from "lucide-react";
import {
  isSuperAdmin,
  getAllCompanies,
  getAllUsers,
  toggleUserActiveStatus,
  toggleCompanyStatus,
  type CompanyWithUsers,
  type AllUserData
} from "@/services/superAdminService";

const SuperAdminPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Verificar se é super admin
  useEffect(() => {
    const checkAccess = async () => {
      const hasAccess = await isSuperAdmin();
      if (!hasAccess) {
        toast.error("Acesso negado");
        navigate("/dashboard");
      }
      setIsCheckingAccess(false);
    };
    checkAccess();
  }, [navigate]);

  // Buscar empresas
  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ['super-admin-companies'],
    queryFn: getAllCompanies,
    enabled: !isCheckingAccess
  });

  // Buscar usuários
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['super-admin-users'],
    queryFn: getAllUsers,
    enabled: !isCheckingAccess
  });

  // Mutation para ativar/desativar usuário
  const toggleUserMutation = useMutation({
    mutationFn: ({ userId, activate }: { userId: string; activate: boolean }) =>
      toggleUserActiveStatus(userId, activate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] });
      toast.success("Status do usuário atualizado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Mutation para ativar/desativar empresa
  const toggleCompanyMutation = useMutation({
    mutationFn: ({ companyId, isActive }: { companyId: string; isActive: boolean }) =>
      toggleCompanyStatus(companyId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-companies'] });
      toast.success("Status da empresa atualizado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  if (isCheckingAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Painel Super Admin
          </h1>
          <p className="text-muted-foreground">
            Gerenciamento global de empresas e usuários
          </p>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground">
              {companies.filter(c => c.is_active).length} ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              {users.filter(u => u.is_active).length} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.roles.includes('admin')).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Administradores de empresas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de gerenciamento */}
      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies">Empresas</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>

        {/* Tab de Empresas */}
        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Empresas Cadastradas</CardTitle>
                  <CardDescription>
                    Gerencie todas as empresas do sistema
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Empresa + Admin
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCompanies ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : companies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Nenhuma empresa cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.cnpj}</TableCell>
                        <TableCell>{company.email || '-'}</TableCell>
                        <TableCell>{company.user_count}</TableCell>
                        <TableCell>
                          <Badge variant={company.is_active ? "default" : "secondary"}>
                            {company.is_active ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(company.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={company.is_active}
                            onCheckedChange={(checked) =>
                              toggleCompanyMutation.mutate({
                                companyId: company.id,
                                isActive: checked
                              })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Usuários */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Usuários</CardTitle>
              <CardDescription>
                Gerencie usuários de todas as empresas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.company_name || "Sem empresa"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {user.roles.map(role => (
                              <Badge key={role} variant="outline" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : "Nunca"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "default" : "secondary"}>
                            {user.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={(checked) =>
                              toggleUserMutation.mutate({
                                userId: user.id,
                                activate: checked
                              })
                            }
                            disabled={user.roles.includes('super_admin')}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminPage;
