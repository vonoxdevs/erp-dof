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
  // Password reset errors
  {
    pattern: /User not found|email not found/i,
    message: "Email não encontrado no sistema"
  },
  {
    pattern: /Password reset too many requests/i,
    message: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente"
  },
  {
    pattern: /Invalid recovery token|Token expired/i,
    message: "Link de recuperação expirado. Solicite um novo"
  },
  {
    pattern: /New password should be different/i,
    message: "A nova senha deve ser diferente da anterior"
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
  try {
    // Extract error message from various error formats
    let errorMessage = "Erro desconhecido";
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = String(error.message);
    } else if (error?.error_description) {
      // Supabase auth errors
      errorMessage = String(error.error_description);
    } else if (error?.hint) {
      // Postgres errors
      errorMessage = String(error.hint);
    } else if (error?.details) {
      // Supabase detailed errors
      errorMessage = String(error.details);
    } else {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = String(error);
      }
    }

    // Log detailed error for debugging
    console.error('[Error Details]:', {
      original: error,
      extracted: errorMessage,
      type: typeof error
    });

    // Try to map to a user-friendly message
    for (const mapping of errorMappings) {
      if (mapping.pattern.test(errorMessage)) {
        return mapping.message;
      }
    }

    // If no specific mapping found, return a generic message
    return "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente";
  } catch (e) {
    // Fallback in case sanitization itself fails
    console.error('[sanitizeError failed]:', e);
    return "Ocorreu um erro inesperado. Por favor, tente novamente";
  }
}
