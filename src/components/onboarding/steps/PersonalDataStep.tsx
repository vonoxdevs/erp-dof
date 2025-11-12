import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { validateCPF, validateEmail, validatePhone, validatePassword, validateFullName, formatCPF, formatPhone } from '@/lib/brazilian-validations';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';

export interface PersonalData {
  fullName: string;
  email: string;
  cpf: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface PersonalDataStepProps {
  data: PersonalData;
  onChange: (data: PersonalData) => void;
  onNext: () => void;
}

export const PersonalDataStep = ({ data, onChange, onNext }: PersonalDataStepProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!validateFullName(data.fullName)) {
      newErrors.fullName = 'Digite seu nome completo (mínimo 2 palavras)';
    }

    if (!validateEmail(data.email)) {
      newErrors.email = 'Digite um e-mail válido';
    }

    if (!validateCPF(data.cpf)) {
      newErrors.cpf = 'CPF inválido. Verifique os dígitos';
    }

    if (!validatePhone(data.phone)) {
      newErrors.phone = 'Telefone inválido. Use o formato (XX) XXXXX-XXXX';
    }

    if (!validatePassword(data.password)) {
      newErrors.password = 'Senha deve ter no mínimo 8 caracteres, letras e números';
    }

    if (data.password !== data.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      onNext();
    }
  };

  const handleChange = (field: keyof PersonalData, value: string) => {
    onChange({ ...data, [field]: value });
    // Limpar erro do campo quando o usuário digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Crie sua conta</h2>
        <p className="text-muted-foreground">
          Preencha seus dados pessoais para começar
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo *</Label>
          <Input
            id="fullName"
            value={data.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            placeholder="João da Silva Santos"
            className={errors.fullName ? 'border-destructive' : ''}
          />
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="seu@email.com"
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              value={data.cpf}
              onChange={(e) => handleChange('cpf', formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              className={errors.cpf ? 'border-destructive' : ''}
            />
            {errors.cpf && (
              <p className="text-sm text-destructive">{errors.cpf}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              value={data.phone}
              onChange={(e) => handleChange('phone', formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              maxLength={15}
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha *</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={data.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Use letras, números e no mínimo 8 caracteres
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={data.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="Digite a senha novamente"
              className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword}</p>
          )}
        </div>
      </div>

      <Button onClick={handleNext} className="w-full" size="lg">
        Continuar
        <ChevronRight className="w-5 h-5 ml-2" />
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Ao continuar, você concorda com nossos{' '}
        <a href="#" className="text-primary hover:underline">
          Termos de Uso
        </a>{' '}
        e{' '}
        <a href="#" className="text-primary hover:underline">
          Política de Privacidade
        </a>
      </p>
    </div>
  );
};
