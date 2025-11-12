import { Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useTrialStatus } from "@/hooks/useTrialStatus";

const PlansPage = () => {
  const navigate = useNavigate();
  const { trialStatus } = useTrialStatus();

  const plans = [
    {
      name: "Básico",
      price: "R$ 99",
      period: "/mês",
      description: "Ideal para pequenas empresas",
      features: [
        "Até 3 usuários",
        "Controle financeiro completo",
        "Dashboard e relatórios",
        "Suporte por email"
      ]
    },
    {
      name: "Profissional",
      price: "R$ 199",
      period: "/mês",
      description: "Para empresas em crescimento",
      features: [
        "Até 10 usuários",
        "Todos os recursos do Básico",
        "Integração bancária automática",
        "Relatórios avançados",
        "Suporte prioritário"
      ],
      popular: true
    },
    {
      name: "Empresarial",
      price: "R$ 399",
      period: "/mês",
      description: "Solução completa para grandes empresas",
      features: [
        "Usuários ilimitados",
        "Todos os recursos do Profissional",
        "API de integração",
        "Gestor de conta dedicado",
        "Suporte 24/7"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Escolha seu Plano</h1>
          <p className="text-lg text-muted-foreground">
            {trialStatus?.hasExpired && trialStatus.isTrialOwner
              ? "Seu período de teste expirou. Escolha um plano para continuar."
              : "Desbloqueie todo o potencial do ERP Financeiro DOF"}
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Crown className="w-4 h-4" />
                    Mais Popular
                  </span>
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button 
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => {
                    // TODO: Implementar integração com gateway de pagamento
                    alert(`Em breve você poderá assinar o plano ${plan.name}!`);
                  }}
                >
                  Assinar Agora
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Back button se não for obrigatório (trial não expirou) */}
        {!trialStatus?.hasExpired && (
          <div className="text-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
            >
              Voltar ao Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlansPage;
