/**
 * Utilitários para exportação de dados financeiros
 */

interface ExportTransaction {
  id: string;
  due_date: string;
  description: string;
  amount: number;
  status?: string;
  daysOverdue?: number;
  partyName: string;
  type: string;
  category?: { name: string };
}

/**
 * Exporta transações para formato CSV
 */
export function exportToCSV(transactions: ExportTransaction[], filename: string) {
  const headers = ['Data Vencimento', 'Descrição', 'Valor', 'Status', 'Dias Atraso', 'Cliente/Fornecedor', 'Categoria'];
  
  const csvContent = [
    headers.join(';'),
    ...transactions.map(t => [
      new Date(t.due_date).toLocaleDateString('pt-BR'),
      `"${t.description}"`,
      Number(t.amount).toFixed(2).replace('.', ','),
      t.status || 'pending',
      t.daysOverdue || 0,
      `"${t.partyName}"`,
      `"${t.category?.name || 'Sem categoria'}"`
    ].join(';'))
  ].join('\n');

  // Adicionar BOM para UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

/**
 * Exporta transações para formato PDF (via impressão do navegador)
 */
export function exportToPDF(transactions: ExportTransaction[], type: 'revenues' | 'expenses') {
  const typeName = type === 'revenues' ? 'Receitas' : 'Despesas';
  const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Transações Vencidas - ${typeName}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px;
            color: #333;
          }
          .header {
            border-bottom: 3px solid #dc2626;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #dc2626;
            font-size: 28px;
            margin-bottom: 5px;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .summary {
            background: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
          }
          .summary-item {
            text-align: center;
          }
          .summary-item .label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
          }
          .summary-item .value {
            font-size: 24px;
            font-weight: bold;
            color: #dc2626;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px;
          }
          th { 
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            font-size: 12px;
            text-transform: uppercase;
          }
          td { 
            border: 1px solid #e5e7eb;
            padding: 12px 8px;
            text-align: left;
            font-size: 13px;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .amount {
            font-weight: bold;
            color: ${type === 'revenues' ? '#10b981' : '#ef4444'};
          }
          .severity {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            display: inline-block;
          }
          .severity-warning {
            background: #fef3c7;
            color: #92400e;
          }
          .severity-danger {
            background: #fed7aa;
            color: #9a3412;
          }
          .severity-critical {
            background: #fecaca;
            color: #991b1b;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 20px;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚨 Transações Vencidas - ${typeName}</h1>
          <p>Relatório gerado em ${new Date().toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="label">Total de Transações</div>
            <div class="value">${transactions.length}</div>
          </div>
          <div class="summary-item">
            <div class="label">Valor Total</div>
            <div class="value">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="summary-item">
            <div class="label">Média Atraso</div>
            <div class="value">
              ${Math.round(transactions.reduce((sum, t) => sum + (t.daysOverdue || 0), 0) / transactions.length)} dias
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Descrição</th>
              <th>Cliente/Fornecedor</th>
              <th>Categoria</th>
              <th>Atraso</th>
              <th style="text-align: right;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t => {
              let severityClass = 'severity-warning';
              let severityLabel = 'Atenção';
              if ((t.daysOverdue || 0) > 30) {
                severityClass = 'severity-critical';
                severityLabel = 'Crítico';
              } else if ((t.daysOverdue || 0) > 7) {
                severityClass = 'severity-danger';
                severityLabel = 'Urgente';
              }
              
              return `
                <tr>
                  <td>${new Date(t.due_date).toLocaleDateString('pt-BR')}</td>
                  <td><strong>${t.description}</strong></td>
                  <td>${t.partyName}</td>
                  <td>${t.category?.name || 'Sem categoria'}</td>
                  <td>
                    <span class="severity ${severityClass}">${severityLabel} - ${t.daysOverdue || 0} dias</span>
                  </td>
                  <td style="text-align: right;" class="amount">
                    R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>LSFIN v2.0 - Sistema de Gestão Financeira | LS&Co. Holding Empresarial</p>
          <p>Relatório confidencial - Uso interno</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
  }
}