/**
 * Serviço de integração com APIs externas
 * ReceitaWS (CNPJ), ViaCEP (CEP)
 */

export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  telefone: string;
  email: string;
}

export interface CEPData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
}

/**
 * Busca dados de empresa via CNPJ usando ReceitaWS
 * Fallback para BrasilAPI em caso de erro
 */
export const buscarCNPJ = async (cnpj: string): Promise<CNPJData | null> => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) {
    throw new Error('CNPJ deve conter 14 dígitos');
  }

  try {
    // Tentativa 1: ReceitaWS
    const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCNPJ}`);
    
    if (!response.ok) {
      throw new Error('Erro na API ReceitaWS');
    }
    
    const data = await response.json();
    
    if (data.status === 'ERROR') {
      throw new Error(data.message || 'CNPJ não encontrado');
    }

    return {
      cnpj: data.cnpj,
      razao_social: data.nome || '',
      nome_fantasia: data.fantasia || data.nome || '',
      cep: data.cep || '',
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      municipio: data.municipio || '',
      uf: data.uf || '',
      telefone: data.telefone || '',
      email: data.email || ''
    };
  } catch (error) {
    console.warn('ReceitaWS falhou, tentando BrasilAPI...', error);
    
    try {
      // Fallback: BrasilAPI
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      
      if (!response.ok) {
        throw new Error('Erro na API BrasilAPI');
      }
      
      const data = await response.json();

      return {
        cnpj: data.cnpj,
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || data.razao_social || '',
        cep: data.cep || '',
        logradouro: data.descricao_tipo_logradouro + ' ' + data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        municipio: data.municipio || '',
        uf: data.uf || '',
        telefone: data.ddd_telefone_1 || '',
        email: ''
      };
    } catch (fallbackError) {
      console.error('Ambas APIs falharam:', fallbackError);
      throw new Error('Não foi possível consultar o CNPJ. Tente novamente mais tarde.');
    }
  }
};

/**
 * Busca endereço via CEP usando ViaCEP
 */
export const buscarCEP = async (cep: string): Promise<CEPData | null> => {
  const cleanCEP = cep.replace(/\D/g, '');
  
  if (cleanCEP.length !== 8) {
    throw new Error('CEP deve conter 8 dígitos');
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    
    if (!response.ok) {
      throw new Error('Erro ao consultar CEP');
    }
    
    const data = await response.json();
    
    if (data.erro) {
      throw new Error('CEP não encontrado');
    }

    return {
      cep: data.cep,
      logradouro: data.logradouro || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || ''
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    throw new Error('Não foi possível consultar o CEP. Verifique o número e tente novamente.');
  }
};
