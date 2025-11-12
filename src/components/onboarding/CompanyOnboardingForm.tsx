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
  cnpj: z.string().min(14, 'CNPJ inválido'),
  legalName: z.string().min(1, 'Razão social é obrigatória').max(200),
  tradeName: z.string().min(1, 'Nome fantasia é obrigatório').max(200),
  email: z.string().email('Email inválido').max(255),
  phone: z.string().optional(),
  cep: z.string().min(8, 'CEP inválido'),
  street: z.string().min(1, 'Logradouro é obrigatório'),
  number: z.string().min(1, 'Número é obrigatório'),
  neighborhood: z.string().min(1, 'Bairro é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().length(2, 'UF inválida'),
});

export default function CompanyOnboardingForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchingCNPJ, setSearchingCNPJ] = useState(false);
  const [cnpjData, setCnpjData] = useState<CNPJData | null>(null);
  
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

  const handleCNPJSearch = async () => {
    const cleanCNPJ = formData.cnpj.replace(/\D/g, '');
    
    if (!validateCNPJ(cleanCNPJ)) {
      toast.error('CNPJ inválido');
      return;
    }

    setSearchingCNPJ(true);
    try {
      console.log('🔍 Buscando dados do CNPJ:', cleanCNPJ);
      const data = await buscarCNPJ(cleanCNPJ);
      
      if (data) {
        setCnpjData(data);
        
        // Preencher automaticamente os campos
        setFormData(prev => ({
          ...prev,
          legalName: data.razao_social,
          tradeName: data.nome_fantasia,
          email: data.email || prev.email,
          phone: data.telefone || prev.phone,
          cep: data.cep,
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
      console.error('Erro ao buscar CNPJ:', error);
      toast.error(error.message || 'Erro ao buscar dados do CNPJ');
    } finally {
      setSearchingCNPJ(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar dados
    try {
      companySchema.parse(formData);
    } catch (error: any) {
      const firstError = error.errors?.[0];
      toast.error(firstError?.message || 'Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      console.log('🏢 Criando empresa...');

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
          name: formData.tradeName,
          legal_name: formData.legalName,
          cnpj: formData.cnpj.replace(/\D/g, ''),
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

      console.log('✅ Empresa criada com sucesso!');
      
      toast.success('Empresa cadastrada com sucesso! Bem-vindo ao ERP Financeiro DOF!');
      
      // Recarregar sessão para atualizar dados
      await supabase.auth.refreshSession();
      
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);

    } catch (error: any) {
      console.error('Erro ao criar empresa:', error);
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
                    onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                    disabled={loading || searchingCNPJ}
                    required
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
                <p className="text-xs text-muted-foreground">
                  Clique na lupa para buscar os dados automaticamente
                </p>
              </div>

              {/* Dados da empresa */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="legalName">Razão Social *</Label>
                  <Input
                    id="legalName"
                    value={formData.legalName}
                    onChange={(e) => setFormData(prev => ({ ...prev, legalName: e.target.value }))}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="tradeName">Nome Fantasia *</Label>
                  <Input
                    id="tradeName"
                    value={formData.tradeName}
                    onChange={(e) => setFormData(prev => ({ ...prev, tradeName: e.target.value }))}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={loading}
                  />
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
                      onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP *</Label>
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">UF *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                      maxLength={2}
                      disabled={loading}
                      required
                    />
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
