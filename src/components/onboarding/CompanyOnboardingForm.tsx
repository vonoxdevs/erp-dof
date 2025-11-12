import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { buscarCNPJ, CNPJData } from '@/services/externalApiService';
import { validateCNPJ } from '@/lib/brazilian-validations';
import { z } from 'zod';

const companySchema = z.object({
  cnpj: z.string()
    .min(14, 'CNPJ deve ter 14 dígitos')
    .refine((val) => validateCNPJ(val.replace(/\D/g, '')), 'CNPJ inválido'),
  legalName: z.string()
    .trim()
    .min(3, 'Razão social deve ter no mínimo 3 caracteres')
    .max(200, 'Razão social deve ter no máximo 200 caracteres'),
  tradeName: z.string()
    .trim()
    .min(3, 'Nome fantasia deve ter no mínimo 3 caracteres')
    .max(200, 'Nome fantasia deve ter no máximo 200 caracteres'),
  email: z.string()
    .trim()
    .email('Email inválido')
    .max(255, 'Email deve ter no máximo 255 caracteres'),
  phone: z.string()
    .min(10, 'Telefone deve ter no mínimo 10 dígitos')
    .optional()
    .or(z.literal('')),
  cep: z.string()
    .min(8, 'CEP deve ter 8 dígitos')
    .max(9, 'CEP inválido'),
  street: z.string()
    .trim()
    .min(3, 'Logradouro é obrigatório')
    .max(200, 'Logradouro deve ter no máximo 200 caracteres'),
  number: z.string()
    .trim()
    .min(1, 'Número é obrigatório')
    .max(10, 'Número deve ter no máximo 10 caracteres'),
  neighborhood: z.string()
    .trim()
    .min(3, 'Bairro é obrigatório')
    .max(100, 'Bairro deve ter no máximo 100 caracteres'),
  city: z.string()
    .trim()
    .min(3, 'Cidade é obrigatória')
    .max(100, 'Cidade deve ter no máximo 100 caracteres'),
  state: z.string()
    .length(2, 'UF deve ter 2 caracteres')
    .toUpperCase(),
  complement: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
});

export default function CompanyOnboardingForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchingCNPJ, setSearchingCNPJ] = useState(false);
  const [cnpjData, setCnpjData] = useState<CNPJData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
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

  // Máscaras de formatação
  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 8) {
      return numbers.replace(/(\d{5})(\d{0,3})/, '$1-$2');
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      if (numbers.length <= 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
      }
      return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
    return value;
  };

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === 'cnpj') {
      formattedValue = formatCNPJ(value);
    } else if (field === 'cep') {
      formattedValue = formatCEP(value);
    } else if (field === 'phone') {
      formattedValue = formatPhone(value);
    } else if (field === 'state') {
      formattedValue = value.toUpperCase();
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    
    // Limpar erro do campo ao digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCNPJSearch = async () => {
    const cleanCNPJ = formData.cnpj.replace(/\D/g, '');
    
    if (!validateCNPJ(cleanCNPJ)) {
      setErrors(prev => ({ ...prev, cnpj: 'CNPJ inválido' }));
      toast.error('CNPJ inválido');
      return;
    }

    setSearchingCNPJ(true);
    setErrors({});
    
    try {
      const data = await buscarCNPJ(cleanCNPJ);
      
      if (data) {
        setCnpjData(data);
        
        // Preencher automaticamente os campos
        setFormData(prev => ({
          ...prev,
          legalName: data.razao_social,
          tradeName: data.nome_fantasia,
          email: data.email || prev.email,
          phone: data.telefone ? formatPhone(data.telefone) : prev.phone,
          cep: formatCEP(data.cep),
          street: data.logradouro,
          number: data.numero,
          complement: data.complemento,
          neighborhood: data.bairro,
          city: data.municipio,
          state: data.uf
        }));
        
        toast.success('Dados da empresa carregados!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar dados do CNPJ');
    } finally {
      setSearchingCNPJ(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Limpar máscaras antes de validar
    const dataToValidate = {
      ...formData,
      cnpj: formData.cnpj.replace(/\D/g, ''),
      cep: formData.cep.replace(/\D/g, ''),
      phone: formData.phone.replace(/\D/g, '')
    };
    
    // Validar dados com zod
    const validation = companySchema.safeParse(dataToValidate);
    
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((error) => {
        const path = error.path[0] as string;
        if (!fieldErrors[path]) {
          fieldErrors[path] = error.message;
        }
      });
      setErrors(fieldErrors);
      
      const firstError = Object.values(fieldErrors)[0];
      toast.error(firstError);
      return;
    }

    setLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Preparar dados para a edge function
      const onboardingData = {
        company: {
          name: formData.tradeName.trim(),
          legal_name: formData.legalName.trim(),
          cnpj: dataToValidate.cnpj,
          email: formData.email.trim(),
          phone: dataToValidate.phone,
          industry: formData.industry,
          size: formData.size
        },
        address: {
          cep: dataToValidate.cep,
          street: formData.street.trim(),
          number: formData.number.trim(),
          complement: formData.complement.trim(),
          neighborhood: formData.neighborhood.trim(),
          city: formData.city.trim(),
          state: formData.state
        },
        responsible: {
          name: user.user_metadata?.full_name || user.email || '',
          cpf: user.user_metadata?.cpf || '',
          phone: user.user_metadata?.phone || '',
          email: user.email || '',
          position: 'Proprietário'
        }
      };

      console.log('📦 Enviando dados para edge function...');

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
        throw new Error(functionError.message || 'Erro ao criar empresa');
      }

      if (!result?.success) {
        throw new Error('Erro ao criar empresa');
      }
      
      toast.success('Empresa cadastrada com sucesso! Bem-vindo ao ERP Financeiro DOF!');
      
      // Recarregar sessão para atualizar dados
      await supabase.auth.refreshSession();
      
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);

    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar empresa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">Cadastrar Empresa</span>
          </div>
          <p className="text-muted-foreground">
            Complete seu cadastro informando os dados da sua empresa
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>
              Digite o CNPJ para buscar automaticamente os dados cadastrais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* CNPJ com busca */}
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <div className="flex gap-2">
                  <Input
                    id="cnpj"
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={(e) => handleInputChange('cnpj', e.target.value)}
                    disabled={loading || searchingCNPJ}
                    required
                    maxLength={18}
                    className={errors.cnpj ? 'border-destructive' : ''}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCNPJSearch}
                    disabled={loading || searchingCNPJ || !formData.cnpj}
                  >
                    {searchingCNPJ ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {errors.cnpj && (
                  <p className="text-sm text-destructive">{errors.cnpj}</p>
                )}
                {!errors.cnpj && (
                  <p className="text-xs text-muted-foreground">
                    Clique na lupa para buscar os dados automaticamente
                  </p>
                )}
              </div>

              {/* Dados da empresa */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="legalName">Razão Social *</Label>
                  <Input
                    id="legalName"
                    value={formData.legalName}
                    onChange={(e) => handleInputChange('legalName', e.target.value)}
                    disabled={loading}
                    required
                    maxLength={200}
                    className={errors.legalName ? 'border-destructive' : ''}
                  />
                  {errors.legalName && (
                    <p className="text-sm text-destructive">{errors.legalName}</p>
                  )}
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="tradeName">Nome Fantasia *</Label>
                  <Input
                    id="tradeName"
                    value={formData.tradeName}
                    onChange={(e) => handleInputChange('tradeName', e.target.value)}
                    disabled={loading}
                    required
                    maxLength={200}
                    className={errors.tradeName ? 'border-destructive' : ''}
                  />
                  {errors.tradeName && (
                    <p className="text-sm text-destructive">{errors.tradeName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={loading}
                    required
                    maxLength={255}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={loading}
                    maxLength={15}
                    className={errors.phone ? 'border-destructive' : ''}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="w-4 h-4" />
                  Endereço
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="street">Logradouro *</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      disabled={loading}
                      required
                      maxLength={200}
                      className={errors.street ? 'border-destructive' : ''}
                    />
                    {errors.street && (
                      <p className="text-sm text-destructive">{errors.street}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => handleInputChange('number', e.target.value)}
                      disabled={loading}
                      required
                      maxLength={10}
                      className={errors.number ? 'border-destructive' : ''}
                    />
                    {errors.number && (
                      <p className="text-sm text-destructive">{errors.number}</p>
                    )}
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                      disabled={loading}
                      required
                      maxLength={100}
                      className={errors.neighborhood ? 'border-destructive' : ''}
                    />
                    {errors.neighborhood && (
                      <p className="text-sm text-destructive">{errors.neighborhood}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP *</Label>
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => handleInputChange('cep', e.target.value)}
                      disabled={loading}
                      required
                      maxLength={9}
                      className={errors.cep ? 'border-destructive' : ''}
                    />
                    {errors.cep && (
                      <p className="text-sm text-destructive">{errors.cep}</p>
                    )}
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      disabled={loading}
                      required
                      maxLength={100}
                      className={errors.city ? 'border-destructive' : ''}
                    />
                    {errors.city && (
                      <p className="text-sm text-destructive">{errors.city}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">UF *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      maxLength={2}
                      disabled={loading}
                      required
                      className={errors.state ? 'border-destructive' : ''}
                    />
                    {errors.state && (
                      <p className="text-sm text-destructive">{errors.state}</p>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Cadastrando empresa...
                  </>
                ) : (
                  "Cadastrar Empresa"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
