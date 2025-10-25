import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { z } from "zod";

type DbUserProfile = Database['public']['Tables']['user_profiles']['Row'];
type DbCompany = Database['public']['Tables']['companies']['Row'];

export interface UserProfile extends DbUserProfile {}
export interface Company extends DbCompany {}

export interface UserStatus {
  needsOnboarding: boolean;
  profile: UserProfile | null;
  company: Company | null;
}

// Schemas de validação
export const companyDataSchema = z.object({
  // Etapa 1: Dados da Empresa
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  legal_name: z.string().min(3, "Razão Social deve ter no mínimo 3 caracteres"),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido"),
  email: z.string().email("Email inválido").optional(),
  phone: z.string().optional(),
  
  // Etapa 2: Endereço
  address: z.object({
    cep: z.string().regex(/^\d{5}-\d{3}$/, "CEP inválido"),
    street: z.string().min(3, "Logradouro obrigatório"),
    number: z.string().min(1, "Número obrigatório"),
    complement: z.string().optional(),
    neighborhood: z.string().min(2, "Bairro obrigatório"),
    city: z.string().min(2, "Cidade obrigatória"),
    state: z.string().length(2, "Estado deve ter 2 caracteres (UF)"),
  }),
  
  // Etapa 3: Responsável
  responsible: z.object({
    name: z.string().min(3, "Nome do responsável obrigatório"),
    cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido"),
    phone: z.string().min(10, "Telefone inválido"),
    email: z.string().email("Email inválido"),
    position: z.string().min(2, "Cargo obrigatório"),
  }),
});

export type CompanyData = z.infer<typeof companyDataSchema>;

class AuthService {
  // ============ AUTENTICAÇÃO ============
  
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Atualizar last_login_at
    if (data.user) {
      await supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);
    }
    
    return data;
  }
  
  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (error) throw error;
    
    // Criar perfil manualmente (sem company_id ainda)
    if (data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          company_id: null, // Será preenchido no onboarding
        });
        
      if (profileError) {
        console.error('Erro ao criar perfil:', profileError);
        throw new Error('Erro ao criar perfil. Tente novamente.');
      }
    }
    
    return data;
  }
  
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
  
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }
  
  // ============ PERFIL ============
  
  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    const id = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!id) return null;
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (error) throw error;
    return data as UserProfile | null;
  }
  
  async updateUserProfile(userId: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
  
  // ============ EMPRESA ============
  
  async getUserCompany(companyId: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle();
      
    if (error) throw error;
    return data as Company | null;
  }
  
  async createCompany(companyData: CompanyData): Promise<string> {
    const { data, error } = await supabase
      .from('companies')
      .insert({
        name: companyData.name,
        legal_name: companyData.legal_name,
        cnpj: companyData.cnpj,
        email: companyData.email,
        phone: companyData.phone,
        address: companyData.address,
        responsible: companyData.responsible,
      })
      .select('id')
      .single();
      
    if (error) throw error;
    return data.id;
  }
  
  async linkUserToCompany(userId: string, companyId: string) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ company_id: companyId })
      .eq('id', userId);
      
    if (error) throw error;
    
    // Atribuir role de owner
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'owner',
      });
      
    if (roleError) throw roleError;
  }
  
  // ============ ONBOARDING ============
  
  async completeOnboarding(userId: string, companyData: CompanyData) {
    // 1. Validar dados
    companyDataSchema.parse(companyData);
    
    // 2. Criar empresa
    const companyId = await this.createCompany(companyData);
    
    // 3. Vincular usuário à empresa
    await this.linkUserToCompany(userId, companyId);
    
    // 4. Criar categorias padrão
    const { error: categoriesError } = await supabase.rpc('create_default_categories', {
      p_company_id: companyId,
    });
    
    if (categoriesError) {
      console.error('Erro ao criar categorias:', categoriesError);
    }
    
    return companyId;
  }
  
  async checkUserStatus(): Promise<UserStatus> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        needsOnboarding: false,
        profile: null,
        company: null,
      };
    }
    
    const profile = await this.getUserProfile(user.id);
    
    if (!profile) {
      return {
        needsOnboarding: true,
        profile: null,
        company: null,
      };
    }
    
    if (!profile.company_id) {
      return {
        needsOnboarding: true,
        profile,
        company: null,
      };
    }
    
    const company = await this.getUserCompany(profile.company_id);
    
    return {
      needsOnboarding: false,
      profile,
      company,
    };
  }
}

export const authService = new AuthService();
