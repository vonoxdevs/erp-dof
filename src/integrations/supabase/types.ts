export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          company_id: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          company_id: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          company_id?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_digit: string | null
          account_number: string
          account_type: string | null
          agency_number: string
          allow_negative_balance: boolean | null
          auto_sync: boolean | null
          available_balance: number | null
          available_credit: number | null
          bank_code: string
          bank_name: string
          blocked_balance: number | null
          closing_day: number | null
          company_id: string
          created_at: string | null
          credit_limit: number | null
          currency: string | null
          current_balance: number | null
          deleted_at: string | null
          due_day: number | null
          holder_document: string
          holder_name: string
          id: string
          initial_balance: number | null
          is_active: boolean | null
          is_default: boolean | null
          last_sync: string | null
          overdraft_limit: number | null
          sync_frequency: number | null
          updated_at: string | null
        }
        Insert: {
          account_digit?: string | null
          account_number: string
          account_type?: string | null
          agency_number: string
          allow_negative_balance?: boolean | null
          auto_sync?: boolean | null
          available_balance?: number | null
          available_credit?: number | null
          bank_code: string
          bank_name: string
          blocked_balance?: number | null
          closing_day?: number | null
          company_id: string
          created_at?: string | null
          credit_limit?: number | null
          currency?: string | null
          current_balance?: number | null
          deleted_at?: string | null
          due_day?: number | null
          holder_document: string
          holder_name: string
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          is_default?: boolean | null
          last_sync?: string | null
          overdraft_limit?: number | null
          sync_frequency?: number | null
          updated_at?: string | null
        }
        Update: {
          account_digit?: string | null
          account_number?: string
          account_type?: string | null
          agency_number?: string
          allow_negative_balance?: boolean | null
          auto_sync?: boolean | null
          available_balance?: number | null
          available_credit?: number | null
          bank_code?: string
          bank_name?: string
          blocked_balance?: number | null
          closing_day?: number | null
          company_id?: string
          created_at?: string | null
          credit_limit?: number | null
          currency?: string | null
          current_balance?: number | null
          deleted_at?: string | null
          due_day?: number | null
          holder_document?: string
          holder_name?: string
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          is_default?: boolean | null
          last_sync?: string | null
          overdraft_limit?: number | null
          sync_frequency?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_api_credentials: {
        Row: {
          api_credentials: Json
          bank_account_id: string
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          api_credentials: Json
          bank_account_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          api_credentials?: Json
          bank_account_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_api_credentials_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_api_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      categoria_conta_bancaria: {
        Row: {
          categoria_id: string
          conta_bancaria_id: string
          created_at: string
          habilitado: boolean | null
          id: string
          updated_at: string
        }
        Insert: {
          categoria_id: string
          conta_bancaria_id: string
          created_at?: string
          habilitado?: boolean | null
          id?: string
          updated_at?: string
        }
        Update: {
          categoria_id?: string
          conta_bancaria_id?: string
          created_at?: string
          habilitado?: boolean | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categoria_conta_bancaria_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categoria_conta_bancaria_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativo: boolean | null
          centro_custo_id: string | null
          company_id: string
          cor: string | null
          created_at: string
          descricao: string | null
          icon: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          centro_custo_id?: string | null
          company_id: string
          cor?: string | null
          created_at?: string
          descricao?: string | null
          icon?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          centro_custo_id?: string | null
          company_id?: string
          cor?: string | null
          created_at?: string
          descricao?: string | null
          icon?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          company_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          type: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          type: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: Json | null
          cnpj: string
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          is_trial: boolean | null
          legal_name: string
          logo_url: string | null
          name: string
          phone: string | null
          responsible: Json | null
          settings: Json | null
          size: string | null
          subscription_status: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          cnpj: string
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_trial?: boolean | null
          legal_name: string
          logo_url?: string | null
          name: string
          phone?: string | null
          responsible?: Json | null
          settings?: Json | null
          size?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          cnpj?: string
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          is_trial?: boolean | null
          legal_name?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          responsible?: Json | null
          settings?: Json | null
          size?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: Json | null
          bank_details: Json | null
          company_id: string
          created_at: string | null
          credit_limit: number | null
          deleted_at: string | null
          discount_percentage: number | null
          document: string
          document_type: string
          email: string | null
          id: string
          is_active: boolean | null
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          manager_position: string | null
          name: string
          notes: string | null
          payment_terms: number | null
          phone: string | null
          tags: string[] | null
          type: string
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          bank_details?: Json | null
          company_id: string
          created_at?: string | null
          credit_limit?: number | null
          deleted_at?: string | null
          discount_percentage?: number | null
          document: string
          document_type: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          manager_position?: string | null
          name: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          tags?: string[] | null
          type: string
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          bank_details?: Json | null
          company_id?: string
          created_at?: string | null
          credit_limit?: number | null
          deleted_at?: string | null
          discount_percentage?: number | null
          document?: string
          document_type?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          manager_position?: string | null
          name?: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          amount: number
          attachments: Json | null
          auto_generate: boolean | null
          bank_account_id: string | null
          categoria_despesa_id: string | null
          categoria_receita_id: string | null
          category_id: string | null
          centro_custo_id: string | null
          company_id: string
          contact_id: string | null
          contract_name: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          frequency: string
          generation_day: number | null
          id: string
          is_active: boolean | null
          last_generated_date: string | null
          name: string
          next_generation_date: string | null
          payment_method: string | null
          service_description: string | null
          start_date: string
          total_installments: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          attachments?: Json | null
          auto_generate?: boolean | null
          bank_account_id?: string | null
          categoria_despesa_id?: string | null
          categoria_receita_id?: string | null
          category_id?: string | null
          centro_custo_id?: string | null
          company_id: string
          contact_id?: string | null
          contract_name?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          frequency: string
          generation_day?: number | null
          id?: string
          is_active?: boolean | null
          last_generated_date?: string | null
          name: string
          next_generation_date?: string | null
          payment_method?: string | null
          service_description?: string | null
          start_date: string
          total_installments?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          attachments?: Json | null
          auto_generate?: boolean | null
          bank_account_id?: string | null
          categoria_despesa_id?: string | null
          categoria_receita_id?: string | null
          category_id?: string | null
          centro_custo_id?: string | null
          company_id?: string
          contact_id?: string | null
          contract_name?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          frequency?: string
          generation_day?: number | null
          id?: string
          is_active?: boolean | null
          last_generated_date?: string | null
          name?: string
          next_generation_date?: string | null
          payment_method?: string | null
          service_description?: string | null
          start_date?: string
          total_installments?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_categoria_despesa_id_fkey"
            columns: ["categoria_despesa_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_categoria_receita_id_fkey"
            columns: ["categoria_receita_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          company_id: string
          created_at: string | null
          file_url: string
          id: string
          metadata: Json | null
          period_end: string
          period_start: string
          report_type: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          file_url: string
          id?: string
          metadata?: Json | null
          period_end: string
          period_start: string
          report_type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          file_url?: string
          id?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          report_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          bank_account_id: string
          company_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string
          errors: Json | null
          failed_records: number | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string | null
          id: string
          imported_records: number | null
          metadata: Json | null
          processed_records: number | null
          status: string | null
          total_records: number | null
        }
        Insert: {
          bank_account_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          errors?: Json | null
          failed_records?: number | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url?: string | null
          id?: string
          imported_records?: number | null
          metadata?: Json | null
          processed_records?: number | null
          status?: string | null
          total_records?: number | null
        }
        Update: {
          bank_account_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          errors?: Json | null
          failed_records?: number | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string | null
          id?: string
          imported_records?: number | null
          metadata?: Json | null
          processed_records?: number | null
          status?: string | null
          total_records?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "imports_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          company_id: string
          created_at: string | null
          data: Json | null
          id: string
          message: string
          priority: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          company_id: string
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          priority?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          company_id?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          priority?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_metadata: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          fix_description: string
          id: string
          migration_name: string
          severity: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          fix_description: string
          id?: string
          migration_name: string
          severity: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          fix_description?: string
          id?: string
          migration_name?: string
          severity?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_from_id: string | null
          account_to_id: string | null
          ai_classification: Json | null
          amount: number
          attachments: Json | null
          bank_account_id: string | null
          categoria_despesa_id: string | null
          categoria_receita_id: string | null
          category_id: string | null
          centro_custo_id: string | null
          company_id: string
          contact_id: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          deleted_at: string | null
          description: string
          due_date: string
          id: string
          installment_number: number | null
          is_recurring: boolean | null
          notes: string | null
          paid_date: string | null
          payment_date: string | null
          payment_method: string | null
          recurrence_config: Json | null
          recurring_contract_id: string | null
          reference_number: string | null
          status: string | null
          supplier_name: string | null
          tags: string[] | null
          total_installments: number | null
          transfer_to_account_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          account_from_id?: string | null
          account_to_id?: string | null
          ai_classification?: Json | null
          amount: number
          attachments?: Json | null
          bank_account_id?: string | null
          categoria_despesa_id?: string | null
          categoria_receita_id?: string | null
          category_id?: string | null
          centro_custo_id?: string | null
          company_id: string
          contact_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          description: string
          due_date: string
          id?: string
          installment_number?: number | null
          is_recurring?: boolean | null
          notes?: string | null
          paid_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          recurrence_config?: Json | null
          recurring_contract_id?: string | null
          reference_number?: string | null
          status?: string | null
          supplier_name?: string | null
          tags?: string[] | null
          total_installments?: number | null
          transfer_to_account_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          account_from_id?: string | null
          account_to_id?: string | null
          ai_classification?: Json | null
          amount?: number
          attachments?: Json | null
          bank_account_id?: string | null
          categoria_despesa_id?: string | null
          categoria_receita_id?: string | null
          category_id?: string | null
          centro_custo_id?: string | null
          company_id?: string
          contact_id?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          deleted_at?: string | null
          description?: string
          due_date?: string
          id?: string
          installment_number?: number | null
          is_recurring?: boolean | null
          notes?: string | null
          paid_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          recurrence_config?: Json | null
          recurring_contract_id?: string | null
          reference_number?: string | null
          status?: string | null
          supplier_name?: string | null
          tags?: string[] | null
          total_installments?: number | null
          transfer_to_account_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_from_id_fkey"
            columns: ["account_from_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_to_id_fkey"
            columns: ["account_to_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_categoria_despesa_id_fkey"
            columns: ["categoria_despesa_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_categoria_receita_id_fkey"
            columns: ["categoria_receita_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_transfer_to_account_id_fkey"
            columns: ["transfer_to_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string | null
          department: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string
          permissions: Json
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string | null
          department?: string | null
          email: string
          expires_at: string
          full_name: string
          id?: string
          invited_by: string
          permissions?: Json
          role: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string | null
          department?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string
          permissions?: Json
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          full_name: string
          id: string
          is_trial_owner: boolean | null
          last_login_at: string | null
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          full_name: string
          id: string
          is_trial_owner?: boolean | null
          last_login_at?: string | null
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_trial_owner?: boolean | null
          last_login_at?: string | null
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_user_company_id: { Args: never; Returns: string }
      create_default_categories: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      generate_contract_installments: {
        Args: never
        Returns: {
          contract_id: string
          contract_name: string
          parcelas_geradas: number
        }[]
      }
      get_dashboard_stats: {
        Args: { user_company_id: string }
        Returns: {
          company_id: string
          overdue_count: number
          pending_count: number
          total_expenses: number
          total_revenue: number
        }[]
      }
      get_user_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_active: { Args: { company_uuid: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      user_has_company_access: { Args: { user_uuid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "analyst" | "accountant" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "analyst", "accountant", "super_admin"],
    },
  },
} as const
