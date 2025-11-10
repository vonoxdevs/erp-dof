interface Contract {
  amount: number;
  frequency: string;
  is_active: boolean;
  type: string;
}

/**
 * Normaliza um valor para mensal baseado na frequência
 */
export const normalizeToMonthly = (amount: number, frequency: string): number => {
  const multipliers: Record<string, number> = {
    daily: 30,
    weekly: 4,
    monthly: 1,
    yearly: 1 / 12,
  };
  
  return amount * (multipliers[frequency] || 1);
};

/**
 * Calcula a Receita Mensal Recorrente (MRR) de contratos ativos
 */
export const calculateMRR = (contracts: Contract[]): number => {
  return contracts
    .filter((c) => c.is_active && (c.type === "revenue" || c.type === "income"))
    .reduce((sum, c) => sum + normalizeToMonthly(Number(c.amount), c.frequency), 0);
};

/**
 * Calcula as Despesas Mensais Recorrentes de contratos ativos
 */
export const calculateMonthlyExpenses = (contracts: Contract[]): number => {
  return contracts
    .filter((c) => c.is_active && c.type === "expense")
    .reduce((sum, c) => sum + normalizeToMonthly(Number(c.amount), c.frequency), 0);
};
