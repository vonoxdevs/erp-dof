import { AlertTriangle, Crown, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTrialStatus } from '@/hooks/useTrialStatus';

export const TrialStatusBanner = () => {
  const { trialStatus, loading } = useTrialStatus();
  const navigate = useNavigate();

  if (loading || !trialStatus) return null;

  // Não mostrar nada se não for trial
  if (!trialStatus.isTrial) return null;

  // Trial expirado e usuário é o owner - bloquear acesso
  if (trialStatus.hasExpired && trialStatus.isTrialOwner) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Teste Grátis Expirado</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Seu período de teste de 3 dias expirou. Assine um plano para continuar usando o sistema.
          </span>
          <Button 
            variant="outline" 
            size="sm"
            className="ml-4"
            onClick={() => navigate('/plans')}
          >
            <Crown className="w-4 h-4 mr-2" />
            Ver Planos
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial expirado mas usuário NÃO é owner - pode continuar usando
  if (trialStatus.hasExpired && !trialStatus.isTrialOwner) {
    return null; // Não mostrar nada, usuário tem acesso normal
  }

  // Trial ativo - mostrar aviso se faltam 1 dia ou menos
  if (trialStatus.isActive && trialStatus.daysRemaining <= 1) {
    return (
      <Alert className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900 dark:text-amber-100">
          Teste Grátis - {trialStatus.daysRemaining} dia{trialStatus.daysRemaining !== 1 ? 's' : ''} restante{trialStatus.daysRemaining !== 1 ? 's' : ''}
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between text-amber-800 dark:text-amber-200">
          <span>
            Seu período de teste termina em breve. Assine para continuar aproveitando todos os recursos!
          </span>
          <Button 
            variant="outline" 
            size="sm"
            className="ml-4 border-amber-600 text-amber-600 hover:bg-amber-100"
            onClick={() => navigate('/plans')}
          >
            <Crown className="w-4 h-4 mr-2" />
            Assinar Agora
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
