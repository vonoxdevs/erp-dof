import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PersonalData } from './PersonalDataStep';
import { CompanyData } from './CompanyDataStep';
import { ChevronLeft, CheckCircle2, User, Building2, MapPin, Loader2 } from 'lucide-react';

interface ReviewStepProps {
  personalData: PersonalData;
  companyData: CompanyData;
  onBack: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const ReviewStep = ({ personalData, companyData, onBack, onConfirm, loading }: ReviewStepProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold">Revise seus dados</h2>
        <p className="text-muted-foreground">
          Confira se todas as informações estão corretas
        </p>
      </div>

      <div className="space-y-4">
        {/* Dados Pessoais */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b">
            <User className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Dados Pessoais</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Nome Completo</p>
                <p className="font-medium">{personalData.fullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">CPF</p>
                <p className="font-medium">{personalData.cpf}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">E-mail</p>
                <p className="font-medium">{personalData.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Telefone</p>
                <p className="font-medium">{personalData.phone}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Dados da Empresa */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Dados da Empresa</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Razão Social</p>
                <p className="font-medium">{companyData.legalName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nome Fantasia</p>
                <p className="font-medium">{companyData.tradeName}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">CNPJ</p>
                <p className="font-medium">{companyData.cnpj}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Setor</p>
                <p className="font-medium">{companyData.industry || 'Não informado'}</p>
              </div>
            </div>
            {companyData.email && (
              <div>
                <p className="text-muted-foreground">E-mail da Empresa</p>
                <p className="font-medium">{companyData.email}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Endereço */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Endereço</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium">
              {companyData.street}, {companyData.number}
              {companyData.complement && ` - ${companyData.complement}`}
            </p>
            <p className="text-muted-foreground">
              {companyData.neighborhood} - {companyData.city}/{companyData.state}
            </p>
            <p className="text-muted-foreground">
              CEP: {companyData.cep}
            </p>
          </div>
        </Card>
      </div>

      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium mb-1">Acesso Completo</p>
            <p className="text-muted-foreground">
              Você terá acesso a todas as funcionalidades do sistema conforme seu plano.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={onBack} variant="outline" size="lg" className="w-full" disabled={loading}>
          <ChevronLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <Button onClick={onConfirm} size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Criando conta...
            </>
          ) : (
            <>
              Criar Conta
              <CheckCircle2 className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Ao confirmar, você concorda com nossos{' '}
        <a href="#" className="text-primary hover:underline">
          Termos de Serviço
        </a>{' '}
        e{' '}
        <a href="#" className="text-primary hover:underline">
          Política de Privacidade
        </a>
      </p>
    </div>
  );
};
