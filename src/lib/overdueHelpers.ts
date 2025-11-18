import { formatInSaoPauloTZ, formatCurrency as formatCurrencyUtil } from './dateUtils';

/**
 * Formata valor em Real brasileiro
 */
export function formatCurrency(value: number): string {
  return formatCurrencyUtil(value);
}

/**
 * Formata data no formato dd/MM/yyyy (timezone São Paulo)
 */
export function formatDate(date: string | Date): string {
  return formatInSaoPauloTZ(date, 'dd/MM/yyyy');
}

/**
 * Retorna variante do Badge baseada nos dias de atraso
 */
export function getBadgeVariant(days: number): 'warning' | 'danger' | 'critical' {
  if (days <= 7) return 'warning';
  if (days <= 30) return 'danger';
  return 'critical';
}

/**
 * Retorna classes CSS para o Badge baseado na severidade
 */
export function getBadgeClasses(severity: 'warning' | 'danger' | 'critical'): string {
  const variants = {
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    danger: 'bg-orange-100 text-orange-800 border-orange-300',
    critical: 'bg-red-100 text-red-800 border-red-300',
  };
  return variants[severity];
}

/**
 * Paleta de cores para receitas e despesas
 */
export const OVERDUE_COLORS = {
  revenue: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    hover: 'hover:bg-green-100',
    cardBg: 'bg-green-50/50',
  },
  expense: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    hover: 'hover:bg-red-100',
    cardBg: 'bg-red-50/50',
  },
};
