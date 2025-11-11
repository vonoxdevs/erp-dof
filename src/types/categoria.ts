export type TipoCategoria = 'centro_custo' | 'receita' | 'despesa';

export interface Categoria {
  id: string;
  company_id: string;
  nome: string;
  descricao?: string;
  tipo: TipoCategoria;
  ativo: boolean;
  cor?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface CategoriaContaBancaria {
  id: string;
  categoria_id: string;
  conta_bancaria_id: string;
  habilitado: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoriaComContas extends Categoria {
  contas_habilitadas: string[];
  categoria_conta_bancaria?: Array<{
    conta_bancaria_id: string;
    habilitado: boolean;
  }>;
}

export interface CategoriaFormData {
  nome: string;
  descricao?: string;
  tipo: TipoCategoria;
  cor?: string;
  icon?: string;
  contas_bancarias: string[];
}
