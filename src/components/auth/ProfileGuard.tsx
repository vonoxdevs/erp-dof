import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileGuardProps {
  children: React.ReactNode;
}

export const ProfileGuard = ({ children }: ProfileGuardProps) => {
  const { data: profile, isLoading, error } = useUserProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Perfil não encontrado. Por favor, faça logout e login novamente.");
      
      // Redirecionar para auth após 2 segundos
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    }
  }, [error, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">Perfil não encontrado</h2>
          <p className="text-muted-foreground">
            Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
