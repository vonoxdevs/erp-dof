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

  const loadUserProfile = useCallback(async (user: User | null) => {
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
      if (status.needsOnboarding) {
        navigate('/onboarding');
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar perfil');
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
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error(error.message || 'Erro ao fazer login');
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      await authService.signUp(email, password, fullName);
      toast.success('Conta criada! Complete o onboarding para começar.');
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
export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, initialized, needsOnboarding } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialized && !loading) {
      if (!user) {
        navigate('/login');
      } else if (needsOnboarding) {
        navigate('/onboarding');
      }
    }
  }, [initialized, loading, user, needsOnboarding, navigate]);

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

  if (!user || needsOnboarding) {
    return null;
  }

  return <>{children}</>;
}
