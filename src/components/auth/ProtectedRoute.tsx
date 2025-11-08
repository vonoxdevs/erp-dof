import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  module?: string;
  action?: string;
  roles?: string[];
}

export function ProtectedRoute({ 
  children, 
  module, 
  action = 'read',
  roles 
}: ProtectedRouteProps) {
  const location = useLocation();
  const { user, profile, hasPermission, hasRole, isActive } = useAuth();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isActive()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Conta Desativada</h2>
          <p className="text-muted-foreground">
            Sua conta foi desativada. Entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
  }

  if (module && !hasPermission(module, action)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar este módulo.
          </p>
        </div>
      </div>
    );
  }

  if (roles && !hasRole(roles)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Apenas {roles.join(', ')} podem acessar esta área.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
