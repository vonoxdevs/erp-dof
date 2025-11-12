import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { validateCNPJ, formatCNPJ, formatCEP } from '@/lib/brazilian-validations';
import { buscarCNPJ, buscarCEP } from '@/services/externalApiService';
import { ChevronLeft, ChevronRight, Loader2, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export interface CompanyData {
  cnpj: string;
  legalName: string;
  tradeName: string;
  email: string;
  phone: string;
  industry: string;
  size: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface CompanyDataStepProps {
  data: CompanyData;
  onChange: (data: CompanyData) => void;
  onNext: () => void;
  onBack: () => void;
}

const estadosBrasileiros = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const CompanyDataStep = ({ data, onChange, onNext, onBack }: CompanyDataStepProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);

  const handleCNPJBlur = async () => {
    const cleanCNPJ = data.cnpj.replace(/\D/g, '');
    
    if (cleanCNPJ.length !== 14) return;
    
    if (!validateCNPJ(data.cnpj)) {
      setErrors(prev => ({ ...prev, cnpj: 'CNPJ inválido' }));
      toast.error('CNPJ inválido. Verifique os dígitos.');
      return;
    }

    setLoadingCNPJ(true);
    try {
      const cnpjData = await buscarCNPJ(data.cnpj);
      
      if (cnpjData) {
        onChange({
          ...data,
          legalName: cnpjData.razao_social,
          tradeName: cnpjData.nome_fantasia,
          email: cnpjData.email || data.email,
          phone: cnpjData.telefone || data.phone,
          cep: cnpjData.cep || data.cep,
          street: cnpjData.logradouro || data.street,
          number: cnpjData.numero || data.number,
          complement: cnpjData.complemento || data.complement,
          neighborhood: cnpjData.bairro || data.neighborhood,
          city: cnpjData.municipio || data.city,
          state: cnpjData.uf || data.state
        });
        toast.success('Dados da empresa encontrados!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar CNPJ');
    } finally {
      setLoadingCNPJ(false);
    }
  };

  const handleCEPBlur = async () => {
    const cleanCEP = data.cep.replace(/\D/g, '');
    
    if (cleanCEP.length !== 8) return;

    setLoadingCEP(true);
    try {
      const cepData = await buscarCEP(data.cep);
      
      if (cepData) {
        onChange({
          ...data,
          street: cepData.logradouro,
          neighborhood: cepData.bairro,
          city: cepData.localidade,
          state: cepData.uf
        });
        toast.success('CEP encontrado!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar CEP');
    } finally {
      setLoadingCEP(false);
    }
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!validateCNPJ(data.cnpj)) {
      newErrors.cnpj = 'CNPJ inválido';
    }

    if (!data.legalName.trim()) {
      newErrors.legalName = 'Razão social é obrigatória';
    }

    if (!data.tradeName.trim()) {
      newErrors.tradeName = 'Nome fantasia é obrigatório';
    }

    if (!data.cep.replace(/\D/g, '')) {
      newErrors.cep = 'CEP é obrigatório';
    }

    if (!data.street.trim()) {
      newErrors.street = 'Logradouro é obrigatório';
    }

    if (!data.number.trim()) {
      newErrors.number = 'Número é obrigatório';
    }

    if (!data.neighborhood.trim()) {
      newErrors.neighborhood = 'Bairro é obrigatório';
    }

    if (!data.city.trim()) {
      newErrors.city = 'Cidade é obrigatória';
    }

    if (!data.state) {
      newErrors.state = 'Estado é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      onNext();
    } else {
      toast.error('Preencha todos os campos obrigatórios');
    }
  };

  const handleChange = (field: keyof CompanyData, value: string) => {
    onChange({ ...data, [field]: value });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold">Dados da Empresa</h2>
        <p className="text-muted-foreground">
          Informe o CNPJ para buscar automaticamente os dados
        </p>
      </div>

      <div className="space-y-4">
        {/* CNPJ com busca automática */}
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ *</Label>
          <div className="relative">
            <Input
              id="cnpj"
              value={data.cnpj}
              onChange={(e) => handleChange('cnpj', formatCNPJ(e.target.value))}
              onBlur={handleCNPJBlur}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              className={errors.cnpj ? 'border-destructive' : ''}
              disabled={loadingCNPJ}
            />
            {loadingCNPJ && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
            )}
          </div>
          {errors.cnpj && (
            <p className="text-sm text-destructive">{errors.cnpj}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Digite o CNPJ e os dados serão preenchidos automaticamente
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="legalName">Razão Social *</Label>
          <Input
            id="legalName"
            value={data.legalName}
            onChange={(e) => handleChange('legalName', e.target.value)}
            placeholder="Empresa Completa LTDA"
            className={errors.legalName ? 'border-destructive' : ''}
          />
          {errors.legalName && (
            <p className="text-sm text-destructive">{errors.legalName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tradeName">Nome Fantasia *</Label>
          <Input
            id="tradeName"
            value={data.tradeName}
            onChange={(e) => handleChange('tradeName', e.target.value)}
            placeholder="Empresa"
            className={errors.tradeName ? 'border-destructive' : ''}
          />
          {errors.tradeName && (
            <p className="text-sm text-destructive">{errors.tradeName}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail da Empresa</Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="contato@empresa.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone da Empresa</Label>
            <Input
              id="phone"
              value={data.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(00) 0000-0000"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="industry">Setor de Atuação</Label>
            <Select value={data.industry} onValueChange={(value) => handleChange('industry', value)}>
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
            <Label htmlFor="size">Porte da Empresa</Label>
            <Select value={data.size} onValueChange={(value) => handleChange('size', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o porte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="micro">Microempresa (até 9 funcionários)</SelectItem>
                <SelectItem value="small">Pequena (10-49 funcionários)</SelectItem>
                <SelectItem value="medium">Média (50-249 funcionários)</SelectItem>
                <SelectItem value="large">Grande (250+ funcionários)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Endereço */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Endereço da Empresa</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP *</Label>
              <div className="relative">
                <Input
                  id="cep"
                  value={data.cep}
                  onChange={(e) => handleChange('cep', formatCEP(e.target.value))}
                  onBlur={handleCEPBlur}
                  placeholder="00000-000"
                  maxLength={9}
                  className={errors.cep ? 'border-destructive' : ''}
                  disabled={loadingCEP}
                />
                {loadingCEP && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                )}
              </div>
              {errors.cep && (
                <p className="text-sm text-destructive">{errors.cep}</p>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="street">Logradouro *</Label>
                <Input
                  id="street"
                  value={data.street}
                  onChange={(e) => handleChange('street', e.target.value)}
                  placeholder="Rua, Avenida, etc"
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
                  value={data.number}
                  onChange={(e) => handleChange('number', e.target.value)}
                  placeholder="123"
                  className={errors.number ? 'border-destructive' : ''}
                />
                {errors.number && (
                  <p className="text-sm text-destructive">{errors.number}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                value={data.complement}
                onChange={(e) => handleChange('complement', e.target.value)}
                placeholder="Sala, Andar, Bloco (opcional)"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  value={data.neighborhood}
                  onChange={(e) => handleChange('neighborhood', e.target.value)}
                  placeholder="Centro"
                  className={errors.neighborhood ? 'border-destructive' : ''}
                />
                {errors.neighborhood && (
                  <p className="text-sm text-destructive">{errors.neighborhood}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={data.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="São Paulo"
                  className={errors.city ? 'border-destructive' : ''}
                />
                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado *</Label>
                <Select value={data.state} onValueChange={(value) => handleChange('state', value)}>
                  <SelectTrigger className={errors.state ? 'border-destructive' : ''}>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosBrasileiros.map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && (
                  <p className="text-sm text-destructive">{errors.state}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={onBack} variant="outline" size="lg" className="w-full">
          <ChevronLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <Button onClick={handleNext} size="lg" className="w-full">
          Continuar
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};
