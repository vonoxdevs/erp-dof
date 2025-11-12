import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PersonalDataStep, PersonalData } from './steps/PersonalDataStep';
import { CompanyDataStep, CompanyData } from './steps/CompanyDataStep';
import { ReviewStep } from './steps/ReviewStep';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = ['Dados Pessoais', 'Dados da Empresa', 'Revisão'];

export const MultiStepOnboardingForm = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [personalData, setPersonalData] = useState<PersonalData>({
    fullName: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [companyData, setCompanyData] = useState<CompanyData>({
    cnpj: '',
    legalName: '',
    tradeName: '',
    email: '',
    phone: '',
    industry: '',
    size: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  const handleCreateAccount = async () => {
    setLoading(true);

    try {
      console.log('🚀 Iniciando criação de conta...');

      // Preparar dados do onboarding
      const onboardingData = {
        company: {
          name: companyData.tradeName,
          legal_name: companyData.legalName,
          cnpj: companyData.cnpj,
          email: companyData.email,
          phone: companyData.phone,
          industry: companyData.industry,
          size: companyData.size
        },
        address: {
          cep: companyData.cep,
          street: companyData.street,
          number: companyData.number,
          complement: companyData.complement,
          neighborhood: companyData.neighborhood,
          city: companyData.city,
          state: companyData.state
        },
        responsible: {
          name: personalData.fullName,
          cpf: personalData.cpf,
          phone: personalData.phone,
          email: personalData.email,
          position: 'Proprietário'
        }
      };

      // Salvar dados no localStorage (caso precise processar após confirmação de email)
      localStorage.setItem('pending_onboarding', JSON.stringify(onboardingData));
      console.log('💾 Dados salvos no localStorage');

      // 1. Criar conta do usuário no Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: personalData.email,
        password: personalData.password,
        options: {
          data: {
            full_name: personalData.fullName,
            cpf: personalData.cpf,
            phone: personalData.phone
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (signUpError) {
        localStorage.removeItem('pending_onboarding');
        
        const errorMsg = signUpError.message?.toLowerCase() || '';
        if (errorMsg.includes('already') || 
            errorMsg.includes('user already registered') ||
            errorMsg.includes('email already exists')) {
          throw new Error('Este e-mail já está cadastrado. Faça login ou use outro e-mail.');
        }
        if (errorMsg.includes('weak') || errorMsg.includes('password')) {
          throw new Error('Senha muito fraca. Use maiúsculas, minúsculas, números e símbolos.');
        }
        throw new Error(signUpError.message || 'Erro ao criar conta');
      }

      if (!authData.user) {
        localStorage.removeItem('pending_onboarding');
        throw new Error('Erro ao criar usuário');
      }

      console.log('✅ Usuário criado:', authData.user.id);

      // 2. Verificar se temos uma sessão ativa
      const session = authData.session;

      if (session) {
        // Sessão ativa - processar onboarding imediatamente
        console.log('✅ Sessão ativa, processando onboarding...');

        await new Promise(resolve => setTimeout(resolve, 1500));

        const { data: result, error: functionError } = await supabase.functions.invoke('onboarding', {
          body: onboardingData,
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (result?.error) {
          throw new Error(result.details || result.error);
        }

        if (functionError) {
          throw new Error(functionError.message || 'Erro ao processar onboarding');
        }

        if (!result?.success) {
          throw new Error('Erro ao criar empresa');
        }

        console.log('✅ Empresa criada com sucesso!');
        localStorage.removeItem('pending_onboarding');

        toast.success('Conta e empresa criadas com sucesso!');
        
        await supabase.auth.refreshSession();
        
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      } else {
        // Sem sessão - email confirmation está ativo
        console.log('📧 Confirmação de email necessária');
        toast.success(
          'Conta criada! Verifique seu e-mail para confirmar. Após confirmar, faça login para completar o cadastro.',
          { duration: 7000 }
        );
        
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }

    } catch (error: any) {
      console.error('Erro ao criar conta:', error);
      
      const errorMessage = error.message || 'Erro ao criar conta. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">ERP Financeiro DOF</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={`text-sm font-medium ${
                  index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          {currentStep === 0 && (
            <PersonalDataStep
              data={personalData}
              onChange={setPersonalData}
              onNext={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 1 && (
            <CompanyDataStep
              data={companyData}
              onChange={setCompanyData}
              onNext={() => setCurrentStep(2)}
              onBack={() => setCurrentStep(0)}
            />
          )}

          {currentStep === 2 && (
            <ReviewStep
              personalData={personalData}
              companyData={companyData}
              onBack={() => setCurrentStep(1)}
              onConfirm={handleCreateAccount}
              loading={loading}
            />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Já tem uma conta?{' '}
          <a href="/login" className="text-primary hover:underline font-medium">
            Fazer login
          </a>
        </p>
      </div>
    </div>
  );
};
