import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatInSaoPauloTZ } from '@/lib/dateUtils';

interface Transaction {
  type: "revenue" | "expense" | "transfer";
  amount: number;
  description: string;
  due_date: string;
  payment_date: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  created_at: string;
}

/**
 * Exporta transações para PDF formatado
 */
export function exportTransactionsToPDF(
  transactions: Transaction[],
  companyName: string = "Minha Empresa"
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const primaryColor: [number, number, number] = [59, 130, 246];
  const accentColor: [number, number, number] = [16, 185, 129];
  const expenseColor: [number, number, number] = [239, 68, 68];
  const textColor: [number, number, number] = [51, 51, 51];

  // Cabeçalho
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE TRANSAÇÕES', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, pageWidth / 2, 25, { align: 'center' });

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.setFontSize(10);
  doc.text(`Gerado em: ${today}`, pageWidth / 2, 33, { align: 'center' });

  // Resumo Financeiro
  let yPosition = 50;

  const totalRevenue = transactions
    .filter(t => t.type === 'revenue' && t.status === 'paid')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const overdueCount = transactions.filter(t => t.status === 'overdue').length;
  const balance = totalRevenue - totalExpense;

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(15, yPosition, pageWidth - 30, 35, 3, 3, 'F');

  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO FINANCEIRO', 20, yPosition + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.setTextColor(...accentColor);
  doc.text(`Receitas: R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, yPosition + 18);
  
  doc.setTextColor(...expenseColor);
  doc.text(`Despesas: R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 75, yPosition + 18);

  doc.setTextColor(...textColor);
  doc.text(`Pendentes: ${pendingCount}`, 20, yPosition + 26);
  doc.text(`Vencidas: ${overdueCount}`, 75, yPosition + 26);

  doc.setFont('helvetica', 'bold');
  const balanceColor = balance >= 0 ? accentColor : expenseColor;
  doc.setTextColor(...balanceColor);
  doc.text(
    `Saldo: R$ ${Math.abs(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    pageWidth - 20,
    yPosition + 22,
    { align: 'right' }
  );

  yPosition += 45;

  // Tabela de Transações
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

  const tableData = transactions.map(t => [
    formatInSaoPauloTZ(t.due_date, 'dd/MM/yyyy'),
    typeMap[t.type],
    t.description,
    `R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    statusMap[t.status],
    t.payment_date ? formatInSaoPauloTZ(t.payment_date, 'dd/MM/yyyy') : '-'
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Data Venc.', 'Tipo', 'Descrição', 'Valor', 'Status', 'Pag.']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      font: 'helvetica',
      textColor: textColor,
      lineColor: [220, 220, 220],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 60 },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 22, halign: 'center' }
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    didParseCell: (data) => {
      if (data.column.index === 1 && data.section === 'body') {
        const type = transactions[data.row.index].type;
        if (type === 'revenue') {
          data.cell.styles.textColor = accentColor;
          data.cell.styles.fontStyle = 'bold';
        } else if (type === 'expense') {
          data.cell.styles.textColor = expenseColor;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      
      if (data.column.index === 4 && data.section === 'body') {
        const status = transactions[data.row.index].status;
        if (status === 'overdue') {
          data.cell.styles.textColor = expenseColor;
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'paid') {
          data.cell.styles.textColor = accentColor;
        }
      }
    },
    margin: { left: 15, right: 15 }
  });

  // Rodapé
  const finalY = (doc as any).lastAutoTable.finalY || yPosition + 50;
  
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Documento gerado automaticamente em ${today}`,
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );
  
  doc.text(
    `Total de ${transactions.length} transações`,
    pageWidth / 2,
    pageHeight - 7,
    { align: 'center' }
  );

  const filename = `transacoes_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

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
      formatInSaoPauloTZ(t.due_date, 'dd/MM/yyyy'),
      typeMap[t.type as keyof typeof typeMap] || t.type,
      `"${t.description}"`, // Aspas para escapar vírgulas
      `"R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}"`,
      statusMap[t.status as keyof typeof statusMap] || t.status,
      t.payment_date ? formatInSaoPauloTZ(t.payment_date, 'dd/MM/yyyy') : '-',
      formatInSaoPauloTZ(t.created_at, 'dd/MM/yyyy')
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
