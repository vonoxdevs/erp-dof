import { format as dateFnsFormat, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

/**
 * Timezone padrão do sistema: America/Sao_Paulo (Brasília)
 */
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte uma data para o timezone de São Paulo
 */
export function toSaoPauloTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObj, DEFAULT_TIMEZONE);
}

/**
 * Converte uma data do timezone de São Paulo para UTC
 */
export function fromSaoPauloTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return fromZonedTime(dateObj, DEFAULT_TIMEZONE);
}

/**
 * Formata uma data considerando o timezone de São Paulo
 */
export function formatInSaoPauloTZ(
  date: Date | string,
  formatStr: string = 'dd/MM/yyyy'
): string {
  const zonedDate = toSaoPauloTime(date);
  return dateFnsFormat(zonedDate, formatStr, { locale: ptBR });
}

/**
 * Obtém a data/hora atual no timezone de São Paulo
 */
export function nowInSaoPaulo(): Date {
  return toZonedTime(new Date(), DEFAULT_TIMEZONE);
}

/**
 * Converte Date para formato YYYY-MM-DD sem problemas de timezone
 * Usa a data LOCAL, não UTC
 */
export function formatDateForInput(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtém a data atual no formato YYYY-MM-DD (timezone local)
 */
export function getTodayForInput(): string {
  return formatDateForInput(new Date());
}

/**
 * Formata valor monetário em Real brasileiro
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
