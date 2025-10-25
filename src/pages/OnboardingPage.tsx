import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, Building2, MapPin, User } from "lucide-react";
import { CompanyData } from "@/services/authService";
import { toast } from "sonner";

export default function OnboardingPage() {
  const { completeOnboarding, user, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CompanyData>>({
    name: "",
    legal_name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: {
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    },
    responsible: {
      name: "",
      cpf: "",
      phone: "",
      email: "",
      position: "",
    },
  });

  if (!user) return null;

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await completeOnboarding(formData as CompanyData);
    } catch (error: any) {
      console.error('Erro no onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const buscarCEP = async (cep: string) => {
    if (cep.length === 9) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep.replace('-', '')}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address: {
              ...prev.address!,
              street: data.logradouro,
              neighborhood: data.bairro,
              city: data.localidade,
              state: data.uf,
            },
          }));
          toast.success("CEP encontrado!");
        } else {
          toast.error("CEP não encontrado");
        }
      } catch (error) {
        toast.error("Erro ao buscar CEP");
      }
    }
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1-$2')
      .slice(0, 14);
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Bem-vindo ao LSFIN ERP! 🎉</h1>
          <p className="text-muted-foreground mt-2">Vamos configurar sua empresa em 3 etapas simples</p>
        </div>

        <div className="mb-6">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            <span className="text-sm text-muted-foreground">Etapa {currentStep} de {totalSteps}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && <><Building2 className="w-5 h-5" /> Dados da Empresa</>}
              {currentStep === 2 && <><MapPin className="w-5 h-5" /> Endereço</>}
              {currentStep === 3 && <><User className="w-5 h-5" /> Responsável Financeiro</>}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Informações básicas da sua empresa"}
              {currentStep === 2 && "Onde sua empresa está localizada"}
              {currentStep === 3 && "Dados do responsável financeiro"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* ETAPA 1: Dados da Empresa */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="name">Nome Fantasia *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Minha Empresa LTDA"
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="legal_name">Razão Social *</Label>
                    <Input
                      id="legal_name"
                      value={formData.legal_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, legal_name: e.target.value }))}
                      placeholder="Minha Empresa Comercial LTDA"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => setFormData(prev => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company_email">Email</Label>
                    <Input
                      id="company_email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contato@empresa.com"
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="company_phone">Telefone</Label>
                    <Input
                      id="company_phone"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 2: Endereço */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="cep">CEP *</Label>
                    <Input
                      id="cep"
                      value={formData.address?.cep || ""}
                      onChange={(e) => {
                        const formatted = formatCEP(e.target.value);
                        setFormData(prev => ({ ...prev, address: { ...prev.address!, cep: formatted } }));
                        buscarCEP(formatted);
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="street">Logradouro *</Label>
                    <Input
                      id="street"
                      value={formData.address?.street || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address!, street: e.target.value } }))}
                      placeholder="Rua, Avenida, etc"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      value={formData.address?.number || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address!, number: e.target.value } }))}
                      placeholder="123"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.address?.complement || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address!, complement: e.target.value } }))}
                      placeholder="Sala, Apto, etc"
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      value={formData.address?.neighborhood || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address!, neighborhood: e.target.value } }))}
                      placeholder="Centro"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.address?.city || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address!, city: e.target.value } }))}
                      placeholder="São Paulo"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado (UF) *</Label>
                    <Input
                      id="state"
                      value={formData.address?.state || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: { ...prev.address!, state: e.target.value.toUpperCase() } }))}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 3: Responsável */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="resp_name">Nome Completo *</Label>
                    <Input
                      id="resp_name"
                      value={formData.responsible?.name || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, responsible: { ...prev.responsible!, name: e.target.value } }))}
                      placeholder="João Silva"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="resp_cpf">CPF *</Label>
                    <Input
                      id="resp_cpf"
                      value={formData.responsible?.cpf || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, responsible: { ...prev.responsible!, cpf: formatCPF(e.target.value) } }))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="resp_phone">Telefone *</Label>
                    <Input
                      id="resp_phone"
                      value={formData.responsible?.phone || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, responsible: { ...prev.responsible!, phone: formatPhone(e.target.value) } }))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="resp_email">Email *</Label>
                    <Input
                      id="resp_email"
                      type="email"
                      value={formData.responsible?.email || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, responsible: { ...prev.responsible!, email: e.target.value } }))}
                      placeholder="joao@empresa.com"
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="resp_position">Cargo *</Label>
                    <Input
                      id="resp_position"
                      value={formData.responsible?.position || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, responsible: { ...prev.responsible!, position: e.target.value } }))}
                      placeholder="Diretor Financeiro"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botões de navegação */}
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || loading}
              >
                Voltar
              </Button>
              
              {currentStep < totalSteps ? (
                <Button type="button" onClick={handleNext}>
                  Próximo
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={loading || authLoading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    "Finalizar"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
