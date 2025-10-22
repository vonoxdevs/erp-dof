/**
 * Error mapping utility to sanitize error messages
 * Maps technical database/API errors to user-friendly messages
 * Prevents information disclosure while maintaining good UX
 */

interface ErrorMapping {
  pattern: RegExp;
  message: string;
}

const errorMappings: ErrorMapping[] = [
  // RLS violations
  {
    pattern: /row-level security policy/i,
    message: "Você não tem permissão para acessar este recurso"
  },
  // Foreign key constraints
  {
    pattern: /violates foreign key constraint/i,
    message: "Não foi possível completar a operação devido a dependências"
  },
  // Unique constraints
  {
    pattern: /duplicate key value violates unique constraint/i,
    message: "Já existe um registro com essas informações"
  },
  // Not null constraints
  {
    pattern: /null value in column .* violates not-null constraint/i,
    message: "Todos os campos obrigatórios devem ser preenchidos"
  },
  // Database connection issues
  {
    pattern: /connection|network|timeout/i,
    message: "Erro de conexão. Por favor, tente novamente"
  },
  // Auth errors
  {
    pattern: /Invalid login credentials/i,
    message: "Email ou senha incorretos"
  },
  {
    pattern: /Email not confirmed/i,
    message: "Por favor, confirme seu email antes de fazer login"
  },
  {
    pattern: /User already registered/i,
    message: "Este email já está cadastrado"
  },
  // Profile errors
  {
    pattern: /Perfil não encontrado/i,
    message: "Perfil não encontrado. Por favor, faça logout e login novamente"
  },
];

/**
 * Maps technical error messages to user-friendly ones
 * Logs the original error for debugging while showing sanitized message to user
 */
export function sanitizeError(error: any): string {
  // Extract error message
  const errorMessage = error?.message || error?.toString() || "Erro desconhecido";

  // Log detailed error for debugging (only in console, not exposed to user)
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Details]:', error);
  }

  // Try to map to a user-friendly message
  for (const mapping of errorMappings) {
    if (mapping.pattern.test(errorMessage)) {
      return mapping.message;
    }
  }

  // If no specific mapping found, return a generic message
  // Never expose the raw error message to the user
  return "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente";
}
