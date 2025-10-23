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
      const errorMessage = error.message || "Perfil não encontrado";
      
      // Se o erro for sobre perfil sendo criado, não redirecionar imediatamente
      if (errorMessage.includes('está sendo criado')) {
        toast.info("Aguarde, seu perfil está sendo configurado...");
      } else {
        toast.error("Erro ao carregar perfil. Por favor, faça logout e login novamente.");
        
        // Redirecionar para auth após 3 segundos
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    }
  }, [error, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando seu perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">Perfil não encontrado</h2>
          <p className="text-muted-foreground">
            Por favor, faça logout e login novamente. Se o problema persistir, entre em contato com o suporte.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
