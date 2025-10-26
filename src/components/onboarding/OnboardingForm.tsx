import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Máscaras
const formatCNPJ = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})$/);
  if (!match) return value;
  return !match[2] ? match[1] : `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}${match[4] ? '/' + match[4] : ''}${match[5] ? '-' + match[5] : ''}`;
};

const formatCPF = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/);
  if (!match) return value;
  return !match[2] ? match[1] : `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}${match[4] ? '-' + match[4] : ''}`;
};

const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
  if (!match) return value;
  return !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`;
};

const formatCEP = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,5})(\d{0,3})$/);
  if (!match) return value;
  return !match[2] ? match[1] : `${match[1]}-${match[2]}`;
};

const estadosBrasileiros = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const OnboardingForm = () => {
  const navigate = useNavigate();
  const { completeOnboarding, loading } = useOnboarding();
  
  const [formData, setFormData] = useState({
    // Empresa
    name: '',
    legal_name: '',
    cnpj: '',
    email: '',
    phone: '',
    industry: '',
    size: '',
    // Endereço
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    // Responsável
    responsible_name: '',
    responsible_cpf: '',
    responsible_phone: '',
    responsible_email: '',
    responsible_position: ''
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [loadingCEP, setLoadingCEP] = useState(false);

  // Verificar se email foi confirmado
  useEffect(() => {
    checkEmailConfirmation();
  }, []);

  const checkEmailConfirmation = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('⚠️ Não autenticado, redirecionando para /auth');
        toast.error('Você precisa estar autenticado.');
        navigate('/auth');
        return;
      }

      if (!session.user.email_confirmed_at) {
        console.log('⚠️ Email não confirmado, redirecionando para /auth');
        toast.error('Por favor, confirme seu email antes de continuar.');
        navigate('/auth');
        return;
      }

      console.log('✅ Email confirmado, pode continuar com onboarding');
    } catch (err) {
      console.error('❌ Erro ao verificar email:', err);
      toast.error('Erro ao verificar autenticação.');
      navigate('/auth');
    }
  };

  const handleInputChange = (field: string, value: string, formatter?: (v: string) => string) => {
    const formattedValue = formatter ? formatter(value) : value;
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    setErrors(prev => ({ ...prev, [field]: false }));
  };

  const buscarCEP = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      toast.error('CEP deve conter 8 dígitos');
      return;
    }

    setLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setFormData(prev => ({
        ...prev,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || ''
      }));

      toast.success('CEP encontrado!');
    } catch (error) {
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCEP(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};

    // Validações obrigatórias
    if (!formData.name.trim()) newErrors.name = true;
    if (!formData.legal_name.trim()) newErrors.legal_name = true;
    if (formData.cnpj.replace(/\D/g, '').length !== 14) newErrors.cnpj = true;
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.email = true;
    
    if (formData.cep.replace(/\D/g, '').length !== 8) newErrors.cep = true;
    if (!formData.street.trim()) newErrors.street = true;
    if (!formData.number.trim()) newErrors.number = true;
    if (!formData.neighborhood.trim()) newErrors.neighborhood = true;
    if (!formData.city.trim()) newErrors.city = true;
    if (!formData.state) newErrors.state = true;

    if (!formData.responsible_name.trim()) newErrors.responsible_name = true;
    if (formData.responsible_cpf.replace(/\D/g, '').length !== 11) newErrors.responsible_cpf = true;
    if (!formData.responsible_phone.trim()) newErrors.responsible_phone = true;
    if (!formData.responsible_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.responsible_email = true;
    if (!formData.responsible_position) newErrors.responsible_position = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const onboardingData = {
      company: {
        name: formData.name,
        legal_name: formData.legal_name,
        cnpj: formData.cnpj,
        email: formData.email,
        phone: formData.phone,
        industry: formData.industry,
        size: formData.size
      },
      address: {
        cep: formData.cep,
        street: formData.street,
        number: formData.number,
        complement: formData.complement,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state
      },
      responsible: {
        name: formData.responsible_name,
        cpf: formData.responsible_cpf,
        phone: formData.responsible_phone,
        email: formData.responsible_email,
        position: formData.responsible_position
      }
    };

    await completeOnboarding(onboardingData);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-3xl px-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Complete seu Cadastro</h1>
            <p className="text-gray-600 mt-2">Preencha os dados da sua empresa para começar</p>
          </div>

          {/* SEÇÃO EMPRESA */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Dados da Empresa</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Fantasia *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={errors.name ? 'border-red-500' : ''}
                  placeholder="Empresa LTDA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal_name">Razão Social *</Label>
                <Input
                  id="legal_name"
                  value={formData.legal_name}
                  onChange={(e) => handleInputChange('legal_name', e.target.value)}
                  className={errors.legal_name ? 'border-red-500' : ''}
                  placeholder="Empresa Completa LTDA"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => handleInputChange('cnpj', e.target.value, formatCNPJ)}
                  className={errors.cnpj ? 'border-red-500' : ''}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value, formatPhone)}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'border-red-500' : ''}
                placeholder="contato@empresa.com"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Setor</Label>
                <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tecnologia">Tecnologia</SelectItem>
                    <SelectItem value="varejo">Varejo</SelectItem>
                    <SelectItem value="servicos">Serviços</SelectItem>
                    <SelectItem value="industria">Indústria</SelectItem>
                    <SelectItem value="construcao">Construção</SelectItem>
                    <SelectItem value="saude">Saúde</SelectItem>
                    <SelectItem value="educacao">Educação</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Porte</Label>
                <Select value={formData.size} onValueChange={(value) => handleInputChange('size', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o porte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro">Micro</SelectItem>
                    <SelectItem value="small">Pequeno</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SEÇÃO ENDEREÇO */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Endereço</h2>
            
            <div className="space-y-2">
              <Label htmlFor="cep">CEP *</Label>
              <div className="flex gap-2">
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => handleInputChange('cep', e.target.value, formatCEP)}
                  onBlur={() => formData.cep && buscarCEP(formData.cep)}
                  className={errors.cep ? 'border-red-500' : ''}
                  placeholder="00000-000"
                  maxLength={9}
                />
                {loadingCEP && <Loader2 className="w-6 h-6 animate-spin text-blue-600" />}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="street">Logradouro *</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  className={errors.street ? 'border-red-500' : ''}
                  placeholder="Rua, Avenida, etc"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="number">Número *</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => handleInputChange('number', e.target.value)}
                  className={errors.number ? 'border-red-500' : ''}
                  placeholder="123"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                value={formData.complement}
                onChange={(e) => handleInputChange('complement', e.target.value)}
                placeholder="Sala, Andar, etc"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                  className={errors.neighborhood ? 'border-red-500' : ''}
                  placeholder="Centro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={errors.city ? 'border-red-500' : ''}
                  placeholder="São Paulo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado *</Label>
                <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                  <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosBrasileiros.map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SEÇÃO RESPONSÁVEL */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Responsável Financeiro</h2>
            
            <div className="space-y-2">
              <Label htmlFor="responsible_name">Nome Completo *</Label>
              <Input
                id="responsible_name"
                value={formData.responsible_name}
                onChange={(e) => handleInputChange('responsible_name', e.target.value)}
                className={errors.responsible_name ? 'border-red-500' : ''}
                placeholder="João da Silva"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responsible_cpf">CPF *</Label>
                <Input
                  id="responsible_cpf"
                  value={formData.responsible_cpf}
                  onChange={(e) => handleInputChange('responsible_cpf', e.target.value, formatCPF)}
                  className={errors.responsible_cpf ? 'border-red-500' : ''}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsible_phone">Telefone *</Label>
                <Input
                  id="responsible_phone"
                  value={formData.responsible_phone}
                  onChange={(e) => handleInputChange('responsible_phone', e.target.value, formatPhone)}
                  className={errors.responsible_phone ? 'border-red-500' : ''}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responsible_email">Email *</Label>
                <Input
                  id="responsible_email"
                  type="email"
                  value={formData.responsible_email}
                  onChange={(e) => handleInputChange('responsible_email', e.target.value)}
                  className={errors.responsible_email ? 'border-red-500' : ''}
                  placeholder="joao@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsible_position">Cargo *</Label>
                <Select value={formData.responsible_position} onValueChange={(value) => handleInputChange('responsible_position', value)}>
                  <SelectTrigger className={errors.responsible_position ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ceo">CEO</SelectItem>
                    <SelectItem value="diretor_financeiro">Diretor Financeiro</SelectItem>
                    <SelectItem value="cfo">CFO</SelectItem>
                    <SelectItem value="controller">Controller</SelectItem>
                    <SelectItem value="gerente_financeiro">Gerente Financeiro</SelectItem>
                    <SelectItem value="proprietario">Proprietário</SelectItem>
                    <SelectItem value="socio">Sócio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Completar Cadastro'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
