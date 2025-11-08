import { UserManagement } from "@/components/users/UserManagement";

const UsersPage = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
        <p className="text-muted-foreground">
          Gerencie os usuários da empresa e suas permissões
        </p>
      </div>
      
      <UserManagement />
    </div>
  );
};

export default UsersPage;
