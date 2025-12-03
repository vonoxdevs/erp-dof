import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Printer, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { formatCurrency } from "@/lib/dateUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  id: string;
  type: "revenue" | "expense" | "transfer";
  status?: "pending" | "paid" | "overdue" | "cancelled" | null;
  amount: number;
  description: string;
  due_date: string;
  payment_date?: string | null;
  paid_date?: string | null;
  customer_name?: string | null;
  supplier_name?: string | null;
  contact_id?: string | null;
  reference_number?: string | null;
  category?: { name: string } | null;
  contact?: { name: string; document?: string } | null;
  bank_account?: { bank_name: string; account_number?: string; agency_number?: string; holder_name?: string; holder_document?: string } | null;
  account_from?: { bank_name: string; account_number?: string; agency_number?: string; holder_name?: string; holder_document?: string } | null;
  account_to?: { bank_name: string; account_number?: string; agency_number?: string; holder_name?: string; holder_document?: string } | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

interface CompanyData {
  name: string;
  legal_name: string;
  cnpj: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  phone?: string;
  email?: string;
}

export function ReceiptDialog({ open, onClose, transaction }: Props) {
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);

  useEffect(() => {
    if (open && transaction) {
      loadCompanyData();
    }
  }, [open, transaction]);

  const loadCompanyData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      const { data: company } = await supabase
        .from("companies")
        .select("name, legal_name, cnpj, address, phone, email")
        .eq("id", profile.company_id)
        .single();

      if (company) {
        setCompanyData(company as CompanyData);
      }
    } catch (error) {
      console.error("Erro ao carregar dados da empresa:", error);
      toast.error("Erro ao carregar dados da empresa");
    } finally {
      setLoading(false);
    }
  };

  const formatDocument = (doc: string) => {
    if (!doc) return "";
    // Remove caracteres não numéricos
    const numbers = doc.replace(/\D/g, "");
    // Formata CNPJ ou CPF
    if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    } else if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return doc;
  };

  const getReceiptType = () => {
    if (!transaction) return "";
    const isPaid = transaction.status === "paid";
    
    if (transaction.type === "transfer") {
      return isPaid ? "COMPROVANTE DE TRANSFERÊNCIA" : "COMPROVANTE DE TRANSFERÊNCIA (PREVISTA)";
    }
    
    if (transaction.type === "revenue") {
      return isPaid ? "RECIBO DE PAGAMENTO" : "DOCUMENTO DE COBRANÇA";
    }
    
    if (transaction.type === "expense") {
      return isPaid ? "RECIBO DE PAGAMENTO" : "DOCUMENTO A PAGAR";
    }
    
    return "RECIBO";
  };

  const getPartyName = () => {
    if (!transaction) return "";
    if (transaction.type === "revenue") {
      return transaction.contact?.name || transaction.customer_name || "Cliente não informado";
    } else if (transaction.type === "expense") {
      return transaction.contact?.name || transaction.supplier_name || "Fornecedor não informado";
    }
    return "";
  };

  const getPartyDocument = () => {
    if (!transaction) return "";
    // Primeiro tenta o documento do contato
    if (transaction.contact?.document) {
      return formatDocument(transaction.contact.document);
    }
    return "";
  };

  const getBankAccountInfo = () => {
    if (!transaction) return null;
    if (transaction.type === "transfer") {
      return {
        from: transaction.account_from,
        to: transaction.account_to
      };
    }
    if (transaction.type === "expense") {
      return { account: transaction.account_from || transaction.bank_account };
    }
    return { account: transaction.account_to || transaction.bank_account };
  };

  const formatBankAccountDetails = (account: { bank_name: string; account_number?: string; agency_number?: string; holder_name?: string; holder_document?: string } | null | undefined) => {
    if (!account) return "Conta não informada";
    const parts = [account.bank_name];
    if (account.agency_number) parts.push(`Ag: ${account.agency_number}`);
    if (account.account_number) parts.push(`CC: ${account.account_number}`);
    return parts.join(" - ");
  };

  const getPaymentDate = () => {
    if (!transaction) return "";
    const isPaid = transaction.status === "paid";
    const dateStr = transaction.payment_date || transaction.paid_date || transaction.due_date;
    return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const getDateLabel = () => {
    if (!transaction) return "Data";
    if (transaction.status === "paid") return "Data do Pagamento";
    if (transaction.status === "overdue") return "Data de Vencimento (Vencido)";
    return "Data de Vencimento";
  };

  const generatePDF = () => {
    if (!transaction || !companyData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Título
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(getReceiptType(), pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Número do recibo
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const receiptNumber = transaction.reference_number || `#${transaction.id.substring(0, 8).toUpperCase()}`;
    doc.text(`Nº: ${receiptNumber}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Valor em destaque
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(transaction.amount), pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Linha
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Dados da conta bancária
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DA CONTA", 20, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const bankInfo = getBankAccountInfo();
    if (transaction.type === "transfer" && bankInfo && 'from' in bankInfo) {
      doc.text(`Conta Origem: ${formatBankAccountDetails(bankInfo.from)}`, 20, yPos);
      yPos += 5;
      if (bankInfo.from?.holder_name) {
        doc.text(`Titular Origem: ${bankInfo.from.holder_name}`, 20, yPos);
        yPos += 5;
      }
      doc.text(`Conta Destino: ${formatBankAccountDetails(bankInfo.to)}`, 20, yPos);
      yPos += 5;
      if (bankInfo.to?.holder_name) {
        doc.text(`Titular Destino: ${bankInfo.to.holder_name}`, 20, yPos);
        yPos += 5;
      }
    } else if (bankInfo && 'account' in bankInfo && bankInfo.account) {
      doc.text(`Banco: ${formatBankAccountDetails(bankInfo.account)}`, 20, yPos);
      yPos += 5;
      if (bankInfo.account.holder_name) {
        doc.text(`Titular: ${bankInfo.account.holder_name}`, 20, yPos);
        yPos += 5;
      }
      if (bankInfo.account.holder_document) {
        doc.text(`Documento: ${formatDocument(bankInfo.account.holder_document)}`, 20, yPos);
        yPos += 5;
      }
    }

    yPos += 5;

    // Dados do pagador/recebedor (se não for transferência)
    if (transaction.type !== "transfer") {
      doc.setFont("helvetica", "bold");
      const partyLabel = transaction.type === "revenue" ? "DADOS DO PAGADOR" : "DADOS DO RECEBEDOR";
      doc.text(partyLabel, 20, yPos);
      yPos += 7;

      doc.setFont("helvetica", "normal");
      const partyName = getPartyName();
      doc.text(`Nome: ${partyName}`, 20, yPos);
      yPos += 5;

      const partyDoc = getPartyDocument();
      if (partyDoc) {
        doc.text(`Documento: ${partyDoc}`, 20, yPos);
        yPos += 5;
      }

      yPos += 5;
    }

    // Dados da transação
    doc.setFont("helvetica", "bold");
    const sectionTitle = transaction.status === "paid" ? "DADOS DO PAGAMENTO" : "DADOS DA TRANSAÇÃO";
    doc.text(sectionTitle, 20, yPos);
    yPos += 7;

    doc.setFont("helvetica", "normal");
    doc.text(`Descrição: ${transaction.description}`, 20, yPos);
    yPos += 5;

    if (transaction.category) {
      doc.text(`Categoria: ${transaction.category.name}`, 20, yPos);
      yPos += 5;
    }

    doc.text(`${getDateLabel()}: ${getPaymentDate()}`, 20, yPos);
    yPos += 5;

    doc.text(`Valor: ${formatCurrency(transaction.amount)}`, 20, yPos);
    yPos += 5;

    yPos += 10;

    // Linha
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Declaração
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    const isPaid = transaction.status === "paid";
    let declaration = "";
    
    if (transaction.type === "revenue") {
      declaration = isPaid 
        ? `Recebi(emos) de ${getPartyName()} a quantia de ${formatCurrency(transaction.amount)} referente a ${transaction.description}.`
        : `Declaramos que ${getPartyName()} deve a quantia de ${formatCurrency(transaction.amount)} referente a ${transaction.description}, com vencimento em ${getPaymentDate()}.`;
    } else if (transaction.type === "expense") {
      declaration = isPaid
        ? `Paguei(amos) a ${getPartyName()} a quantia de ${formatCurrency(transaction.amount)} referente a ${transaction.description}.`
        : `Declaramos que devemos a ${getPartyName()} a quantia de ${formatCurrency(transaction.amount)} referente a ${transaction.description}, com vencimento em ${getPaymentDate()}.`;
    } else {
      declaration = isPaid
        ? `Transferência realizada no valor de ${formatCurrency(transaction.amount)} referente a ${transaction.description}.`
        : `Transferência prevista no valor de ${formatCurrency(transaction.amount)} referente a ${transaction.description}, com data prevista para ${getPaymentDate()}.`;
    }

    const splitDeclaration = doc.splitTextToSize(declaration, pageWidth - 40);
    doc.text(splitDeclaration, 20, yPos);
    yPos += splitDeclaration.length * 5 + 10;

    // Assinatura
    yPos += 20;
    doc.line(20, yPos, 90, yPos);
    yPos += 5;
    doc.setFontSize(8);
    doc.text(companyData.name, 20, yPos);
    doc.text(formatDocument(companyData.cnpj), 20, yPos + 4);

    // Rodapé - usar data/hora de Brasília
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Documento gerado em ${format(brasiliaTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );

    // Salvar PDF
    const fileName = `Recibo_${receiptNumber}_${format(new Date(), "yyyyMMdd")}.pdf`;
    doc.save(fileName);
    toast.success("Recibo gerado com sucesso!");
  };

  const handlePrint = () => {
    if (!transaction || !companyData) return;
    generatePDF();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Emitir Recibo
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Carregando dados...
            </span>
          </div>
        ) : transaction && companyData ? (
          <div className="space-y-6">
            {/* Preview do recibo */}
            <div className="border rounded-lg p-6 bg-background">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">{getReceiptType()}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Nº: {transaction.reference_number || `#${transaction.id.substring(0, 8).toUpperCase()}`}
                </p>
              </div>

              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(transaction.amount)}
                </p>
              </div>

              <div className="space-y-4">
                {/* Dados da Conta Bancária */}
                <div>
                  <h3 className="font-semibold mb-2">Dados da Conta</h3>
                  {(() => {
                    const bankInfo = getBankAccountInfo();
                    if (transaction.type === "transfer" && bankInfo && 'from' in bankInfo) {
                      return (
                        <>
                          <p className="text-sm">
                            <span className="font-medium">Origem:</span> {formatBankAccountDetails(bankInfo.from)}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Destino:</span> {formatBankAccountDetails(bankInfo.to)}
                          </p>
                        </>
                      );
                    } else if (bankInfo && 'account' in bankInfo && bankInfo.account) {
                      return (
                        <>
                          <p className="text-sm">{formatBankAccountDetails(bankInfo.account)}</p>
                          {bankInfo.account.holder_name && (
                            <p className="text-sm text-muted-foreground">
                              Titular: {bankInfo.account.holder_name}
                            </p>
                          )}
                          {bankInfo.account.holder_document && (
                            <p className="text-sm text-muted-foreground">
                              Documento: {formatDocument(bankInfo.account.holder_document)}
                            </p>
                          )}
                        </>
                      );
                    }
                    return <p className="text-sm text-muted-foreground">Conta não informada</p>;
                  })()}
                </div>

                {transaction.type !== "transfer" && (
                  <div>
                    <h3 className="font-semibold mb-2">
                      {transaction.type === "revenue" ? "Dados do Pagador" : "Dados do Recebedor"}
                    </h3>
                    <p className="text-sm">{getPartyName()}</p>
                    {getPartyDocument() && (
                      <p className="text-sm text-muted-foreground">
                        Documento: {getPartyDocument()}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">
                    {transaction.status === "paid" ? "Dados do Pagamento" : "Dados da Transação"}
                  </h3>
                  <p className="text-sm">
                    <span className="font-medium">Descrição:</span> {transaction.description}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{getDateLabel()}:</span> {getPaymentDate()}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Valor:</span> {formatCurrency(transaction.amount)}
                  </p>
                  {transaction.status && transaction.status !== "paid" && (
                    <p className="text-sm mt-2">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        transaction.status === "overdue" 
                          ? "bg-destructive/10 text-destructive" 
                          : "bg-yellow-500/10 text-yellow-600"
                      }`}>
                        {transaction.status === "overdue" ? "Vencido" : "Pendente"}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handlePrint}>
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Dados da transação não disponíveis
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
