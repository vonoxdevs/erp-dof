/**
 * Converte array de transações para CSV
 */
export function convertTransactionsToCSV(transactions: any[]): string {
  // Cabeçalhos do CSV
  const headers = [
    'Data de Vencimento',
    'Tipo',
    'Descrição',
    'Valor',
    'Status',
    'Data de Pagamento',
    'Criado em'
  ];

  // Mapear tipos e status para português
  const typeMap = {
    revenue: 'Receita',
    expense: 'Despesa',
    transfer: 'Transferência'
  };

  const statusMap = {
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Vencido',
    cancelled: 'Cancelado'
  };

  // Converter transações para linhas CSV
  const rows = transactions.map(t => {
    return [
      new Date(t.due_date).toLocaleDateString('pt-BR'),
      typeMap[t.type as keyof typeof typeMap] || t.type,
      `"${t.description}"`, // Aspas para escapar vírgulas
      `"R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}"`,
      statusMap[t.status as keyof typeof statusMap] || t.status,
      t.payment_date ? new Date(t.payment_date).toLocaleDateString('pt-BR') : '-',
      new Date(t.created_at).toLocaleDateString('pt-BR')
    ].join(',');
  });

  // Combinar cabeçalhos e linhas
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Faz download de um arquivo CSV
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Adicionar BOM para UTF-8 (garante acentuação correta no Excel)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Criar link temporário e disparar download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Limpar URL temporária
  URL.revokeObjectURL(url);
}
