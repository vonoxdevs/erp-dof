import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authService, UserProfile, Company, CompanyData } from '@/services/authService';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  company: Company | null;
  loading: boolean;
  initialized: boolean;
  needsOnboarding: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (companyData: CompanyData) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    company: null,
    loading: true,
    initialized: false,
    needsOnboarding: false,
  });

  const loadUserProfile = useCallback(async (user: User | null, retries = 3) => {
    if (!user) {
      setState({
        user: null,
        profile: null,
        company: null,
        loading: false,
        initialized: true,
        needsOnboarding: false,
      });
      return;
    }

    try {
      // OTIMIZAÇÃO: checkUserStatus agora faz apenas 1 query com JOIN
      // Antes: 3 queries separadas (user → profile → company)
      // Agora: 1 query apenas!
      const status = await authService.checkUserStatus();
      
      setState({
        user,
        profile: status.profile,
        company: status.company,
        loading: false,
        initialized: true,
        needsOnboarding: status.needsOnboarding,
      });

      // Redirecionar conforme necessário
      const currentPath = window.location.pathname;
      const isAuthPage = ['/login', '/register', '/'].includes(currentPath);
      
      if (status.needsOnboarding && isAuthPage) {
        navigate('/onboarding');
      } else if (!status.needsOnboarding && isAuthPage) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      
      // Retry logic com exponential backoff
      if (retries > 0) {
        const delay = (4 - retries) * 1000; // 1s, 2s, 3s
        console.log(`Tentando novamente em ${delay}ms... (${retries} tentativas restantes)`);
        setTimeout(() => loadUserProfile(user, retries - 1), delay);
        return;
      }
      
      // Após todas as tentativas falharem
      toast.error('Erro ao carregar perfil. Por favor, tente fazer login novamente.');
      setState({
        user,
        profile: null,
        company: null,
        loading: false,
        initialized: true,
        needsOnboarding: true,
      });
    }
  }, [navigate]);

  useEffect(() => {
    // Buscar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserProfile(session?.user ?? null);
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        loadUserProfile(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  const login = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      await authService.signIn(email, password);
      toast.success('Login realizado com sucesso!');
      // O onAuthStateChange vai lidar com o resto e definir loading: false
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error(error.message || 'Erro ao fazer login');
      setState(prev => ({ ...prev, loading: false })); // Só define false em caso de erro
      throw error;
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      await authService.signUp(email, password, fullName);
      // Mensagem de sucesso será exibida pelo componente que chama esta função
    } catch (error: any) {
      console.error('Erro no registro:', error);
      toast.error(error.message || 'Erro ao criar conta');
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const logout = async () => {
    try {
      await authService.signOut();
      toast.success('Logout realizado com sucesso!');
      navigate('/login');
    } catch (error: any) {
      console.error('Erro no logout:', error);
      toast.error('Erro ao fazer logout');
    }
  };

  const completeOnboarding = async (companyData: CompanyData) => {
    if (!state.user) throw new Error('Usuário não autenticado');
    
    try {
      setState(prev => ({ ...prev, loading: true }));
      await authService.completeOnboarding(state.user.id, companyData);
      toast.success('Onboarding concluído! Bem-vindo ao LSFIN ERP!');
      
      // Recarregar perfil
      await loadUserProfile(state.user);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Erro no onboarding:', error);
      toast.error(error.message || 'Erro ao concluir onboarding');
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const refreshProfile = async () => {
    if (state.user) {
      await loadUserProfile(state.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        completeOnboarding,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// AuthGuard para proteger rotas
interface AuthGuardProps {
  children: ReactNode;
  requireCompany?: boolean; // Se true, redireciona para onboarding se não tiver empresa
}

export function AuthGuard({ children, requireCompany = true }: AuthGuardProps) {
  const { user, loading, initialized, needsOnboarding, profile } = useAuth();
  const navigate = useNavigate();
  const currentPath = window.location.pathname;

  useEffect(() => {
    if (initialized && !loading) {
      // Se não está autenticado, vai para login
      if (!user) {
        navigate('/login');
        return;
      }
      
      // Se requer empresa e precisa de onboarding, vai para onboarding
      if (requireCompany && needsOnboarding && currentPath !== '/onboarding') {
        console.log('🔄 Redirecionando para onboarding: usuário sem empresa');
        navigate('/onboarding');
        return;
      }
      
      // Se está no onboarding mas já tem empresa, vai para dashboard
      if (currentPath === '/onboarding' && !needsOnboarding && profile?.company_id) {
        console.log('✅ Usuário já tem empresa, redirecionando para dashboard');
        navigate('/dashboard');
        return;
      }
    }
  }, [initialized, loading, user, needsOnboarding, requireCompany, navigate, currentPath, profile]);

  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, não renderiza nada (vai redirecionar)
  if (!user) {
    return null;
  }
  
  // Se requer empresa mas não tem, não renderiza (vai redirecionar para onboarding)
  if (requireCompany && needsOnboarding && currentPath !== '/onboarding') {
    return null;
  }

  return <>{children}</>;
}
