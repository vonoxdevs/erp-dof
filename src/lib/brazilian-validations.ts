/**
 * Validações Brasileiras - CPF, CNPJ, Telefone, CEP
 * Implementação completa com algoritmos de validação
 */

// Validação de CPF com algoritmo brasileiro completo
export const validateCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  
  // Rejeitar CPFs com todos os dígitos iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== parseInt(cleaned[9])) return false;
  
  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  return digit === parseInt(cleaned[10]);
};

// Validação de CNPJ com algoritmo brasileiro completo
export const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  
  // Rejeitar CNPJs com todos os dígitos iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Primeiro dígito verificador
  let sum = 0;
  let pos = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * pos--;
    if (pos < 2) pos = 9;
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cleaned[12])) return false;
  
  // Segundo dígito verificador
  sum = 0;
  pos = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * pos--;
    if (pos < 2) pos = 9;
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return digit === parseInt(cleaned[13]);
};

// Validação de telefone brasileiro
export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  // Aceitar: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  return cleaned.length === 10 || cleaned.length === 11;
};

// Validação de CEP
export const validateCEP = (cep: string): boolean => {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8;
};

// Validação de email
export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Validação de senha segura
export const validatePassword = (password: string): boolean => {
  // Mínimo 8 caracteres, pelo menos 1 letra e 1 número
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasMinLength && hasLetter && hasNumber;
};

// Validação de nome completo (mínimo 2 palavras)
export const validateFullName = (name: string): boolean => {
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/);
  return words.length >= 2 && words.every(word => word.length > 0);
};

// Máscaras de formatação
export const formatCPF = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/);
  if (!match) return value;
  return !match[2] ? match[1] : `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}${match[4] ? '-' + match[4] : ''}`;
};

export const formatCNPJ = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})$/);
  if (!match) return value;
  return !match[2] ? match[1] : `${match[1]}.${match[2]}${match[3] ? '.' + match[3] : ''}${match[4] ? '/' + match[4] : ''}${match[5] ? '-' + match[5] : ''}`;
};

export const formatPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
  if (!match) return value;
  return !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`;
};

export const formatCEP = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,5})(\d{0,3})$/);
  if (!match) return value;
  return !match[2] ? match[1] : `${match[1]}-${match[2]}`;
};
