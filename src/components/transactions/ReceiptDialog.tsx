import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileText, Building2, Wallet, User, CreditCard, Calendar, Hash } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { formatCurrency } from "@/lib/dateUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";

interface BankAccountData {
  bank_name: string;
  account_number?: string;
  agency_number?: string;
  holder_name?: string;
  holder_document?: string;
  pix_key?: string | null;
  pix_key_type?: string | null;
}

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
  bank_account?: BankAccountData | null;
  account_from?: BankAccountData | null;
  account_to?: BankAccountData | null;
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
  logo_url?: string | null;
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
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

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
        .select("name, legal_name, cnpj, logo_url, address, phone, email")
        .eq("id", profile.company_id)
        .single();

      if (company) {
        setCompanyData(company as CompanyData);
        
        // Carregar logo como base64 para o PDF
        if (company.logo_url) {
          try {
            const response = await fetch(company.logo_url);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              setLogoBase64(reader.result as string);
            };
            reader.readAsDataURL(blob);
          } catch (e) {
            console.log("Não foi possível carregar a logo");
          }
        }
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
    const numbers = doc.replace(/\D/g, "");
    if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    } else if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return doc;
  };

  const formatAddress = (address?: CompanyData["address"]) => {
    if (!address) return null;
    const parts = [];
    if (address.street) {
      let streetPart = address.street;
      if (address.number) streetPart += `, ${address.number}`;
      if (address.complement) streetPart += ` - ${address.complement}`;
      parts.push(streetPart);
    }
    if (address.neighborhood) parts.push(address.neighborhood);
    if (address.city && address.state) {
      parts.push(`${address.city}/${address.state}`);
    }
    if (address.zip) parts.push(`CEP: ${address.zip}`);
    return parts.length > 0 ? parts.join(" • ") : null;
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

  const formatBankAccountDetails = (account: BankAccountData | null | undefined) => {
    if (!account) return "Conta não informada";
    const parts = [account.bank_name];
    if (account.agency_number) parts.push(`Ag: ${account.agency_number}`);
    if (account.account_number) parts.push(`CC: ${account.account_number}`);
    return parts.join(" • ");
  };

  const formatPixKeyType = (type: string | null | undefined) => {
    if (!type) return "";
    const types: Record<string, string> = {
      cpf: "CPF",
      cnpj: "CNPJ",
      email: "E-mail",
      phone: "Telefone",
      random: "Chave Aleatória"
    };
    return types[type] || type;
  };

  const getPixInfo = (account: BankAccountData | null | undefined) => {
    if (!account?.pix_key) return null;
    return {
      key: account.pix_key,
      type: formatPixKeyType(account.pix_key_type)
    };
  };

  const formatDateFromString = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return format(localDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const getDisplayDate = () => {
    if (!transaction) return "";
    // Para transações pagas, usa a data de pagamento
    if (transaction.status === "paid") {
      const dateStr = transaction.payment_date || transaction.paid_date || transaction.due_date;
      return formatDateFromString(dateStr);
    }
    // Para pendentes/vencidas, sempre usa a data de vencimento
    return formatDateFromString(transaction.due_date);
  };

  const getDueDate = () => {
    if (!transaction) return "";
    return formatDateFromString(transaction.due_date);
  };

  const getDateLabel = () => {
    if (!transaction) return "Data";
    if (transaction.status === "paid") return "Data do Pagamento";
    if (transaction.status === "overdue") return "Data de Vencimento (Vencido)";
    return "Data de Vencimento";
  };

  const generatePDF = async () => {
    if (!transaction || !companyData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Cores
    const primaryColor = [59, 130, 246]; // Azul
    const grayColor = [107, 114, 128];
    const darkColor = [31, 41, 55];

    // Header com gradiente simulado
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 50, "F");

    // Logo ou nome da empresa no header
    yPos = 20;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", margin, 10, 30, 30);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(companyData.name, margin + 38, 22);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(companyData.legal_name, margin + 38, 29);
        doc.text(`CNPJ: ${formatDocument(companyData.cnpj)}`, margin + 38, 36);
      } catch (e) {
        // Se falhar, usa texto
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(companyData.name, margin, 25);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`CNPJ: ${formatDocument(companyData.cnpj)}`, margin, 35);
      }
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(companyData.name, margin, 25);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`CNPJ: ${formatDocument(companyData.cnpj)}`, margin, 35);
    }

    // Tipo do documento no lado direito
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const receiptType = getReceiptType();
    doc.text(receiptType, pageWidth - margin, 25, { align: "right" });
    
    const receiptNumber = transaction.reference_number || `#${transaction.id.substring(0, 8).toUpperCase()}`;
    doc.setFont("helvetica", "normal");
    doc.text(`Nº ${receiptNumber}`, pageWidth - margin, 35, { align: "right" });

    yPos = 60;

    // Valor em destaque
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, "F");
    
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("VALOR TOTAL", pageWidth / 2, yPos + 10, { align: "center" });
    
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(transaction.amount), pageWidth / 2, yPos + 24, { align: "center" });

    yPos += 40;

    // Grid de informações
    const colWidth = (pageWidth - 2 * margin) / 2;
    
    // Coluna 1 - Dados da Conta
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DA CONTA", margin, yPos);
    yPos += 6;
    
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const bankInfo = getBankAccountInfo();
    if (transaction.type === "transfer" && bankInfo && 'from' in bankInfo) {
      doc.text(`Origem: ${formatBankAccountDetails(bankInfo.from)}`, margin, yPos);
      yPos += 5;
      doc.text(`Destino: ${formatBankAccountDetails(bankInfo.to)}`, margin, yPos);
      yPos += 5;
    } else if (bankInfo && 'account' in bankInfo && bankInfo.account) {
      doc.text(formatBankAccountDetails(bankInfo.account), margin, yPos);
      yPos += 5;
      if (bankInfo.account.holder_name) {
        doc.text(`Titular: ${bankInfo.account.holder_name}`, margin, yPos);
        yPos += 5;
      }
      if (bankInfo.account.holder_document) {
        doc.text(`Doc: ${formatDocument(bankInfo.account.holder_document)}`, margin, yPos);
        yPos += 5;
      }
      const pixInfo = getPixInfo(bankInfo.account);
      if (pixInfo) {
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text(`Pix (${pixInfo.type}): ${pixInfo.key}`, margin, yPos);
        doc.setFont("helvetica", "normal");
        yPos += 5;
      }
    }

    yPos += 8;

    // Dados do Pagador/Recebedor
    if (transaction.type !== "transfer") {
      doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const partyLabel = transaction.type === "revenue" ? "DADOS DO PAGADOR" : "DADOS DO RECEBEDOR";
      doc.text(partyLabel, margin, yPos);
      yPos += 6;
      
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(getPartyName(), margin, yPos);
      yPos += 5;
      
      const partyDoc = getPartyDocument();
      if (partyDoc) {
        doc.text(`Documento: ${partyDoc}`, margin, yPos);
        yPos += 5;
      }
      
      yPos += 8;
    }

    // Dados da Transação
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const sectionTitle = transaction.status === "paid" ? "DADOS DO PAGAMENTO" : "DADOS DA TRANSAÇÃO";
    doc.text(sectionTitle, margin, yPos);
    yPos += 6;
    
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const descLines = doc.splitTextToSize(`Descrição: ${transaction.description}`, pageWidth - 2 * margin);
    doc.text(descLines, margin, yPos);
    yPos += descLines.length * 5;
    
    if (transaction.category) {
      doc.text(`Categoria: ${transaction.category.name}`, margin, yPos);
      yPos += 5;
    }
    
    doc.text(`${getDateLabel()}: ${getDisplayDate()}`, margin, yPos);
    yPos += 10;

    // Linha separadora
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // Declaração
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    const isPaid = transaction.status === "paid";
    let declaration = "";
    
    if (transaction.type === "revenue") {
      declaration = isPaid 
        ? `Recebi(emos) de ${getPartyName()} a quantia de ${formatCurrency(transaction.amount)} referente a ${transaction.description}.`
        : `Declaramos que ${getPartyName()} deve a quantia de ${formatCurrency(transaction.amount)} referente a ${transaction.description}, com vencimento em ${getDueDate()}.`;
    } else if (transaction.type === "expense") {
      declaration = isPaid
        ? `Paguei(amos) a ${getPartyName()} a quantia de ${formatCurrency(transaction.amount)} referente a ${transaction.description}.`
        : `Declaramos que devemos a ${getPartyName()} a quantia de ${formatCurrency(transaction.amount)} referente a ${transaction.description}, com vencimento em ${getDueDate()}.`;
    } else {
      declaration = isPaid
        ? `Transferência realizada no valor de ${formatCurrency(transaction.amount)} referente a ${transaction.description}.`
        : `Transferência prevista no valor de ${formatCurrency(transaction.amount)} referente a ${transaction.description}, com data prevista para ${getDueDate()}.`;
    }

    const splitDeclaration = doc.splitTextToSize(declaration, pageWidth - 2 * margin);
    doc.text(splitDeclaration, margin, yPos);
    yPos += splitDeclaration.length * 5 + 15;

    // Assinatura
    doc.setDrawColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.line(margin, yPos, margin + 80, yPos);
    yPos += 5;
    
    const signerAccount = transaction.type === "transfer" || transaction.type === "expense"
      ? (transaction.account_from || transaction.bank_account)
      : (transaction.account_to || transaction.bank_account);
    
    const signerName = signerAccount?.holder_name || companyData.name;
    const signerDocument = signerAccount?.holder_document || companyData.cnpj;
    
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(signerName, margin, yPos);
    yPos += 4;
    doc.setFont("helvetica", "normal");
    doc.text(formatDocument(signerDocument), margin, yPos);

    // Rodapé
    const footerY = pageHeight - 15;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    doc.setFontSize(8);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(
      `Documento gerado em ${format(brasiliaTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      pageWidth / 2,
      footerY,
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

  const bankInfo = getBankAccountInfo();

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
          <div className="space-y-4">
            {/* Preview do recibo - Design moderno */}
            <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
              {/* Header com cor primária */}
              <div className="bg-primary px-6 py-4 text-primary-foreground">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {companyData.logo_url ? (
                      <img 
                        src={companyData.logo_url} 
                        alt={companyData.name}
                        className="w-12 h-12 rounded-lg bg-white/10 object-contain p-1"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{companyData.name}</h3>
                      <p className="text-sm opacity-90">{companyData.legal_name}</p>
                      <p className="text-xs opacity-75">CNPJ: {formatDocument(companyData.cnpj)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium opacity-75">{getReceiptType()}</p>
                    <p className="text-sm font-mono mt-1">
                      Nº {transaction.reference_number || `#${transaction.id.substring(0, 8).toUpperCase()}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Valor em destaque */}
              <div className="bg-muted/50 px-6 py-5 text-center border-b">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Valor Total</p>
                <p className="text-4xl font-bold text-primary">
                  {formatCurrency(transaction.amount)}
                </p>
                {transaction.status && transaction.status !== "paid" && (
                  <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    transaction.status === "overdue" 
                      ? "bg-destructive/10 text-destructive" 
                      : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
                  }`}>
                    {transaction.status === "overdue" ? "Vencido" : "Pendente"}
                  </span>
                )}
              </div>

              {/* Informações em grid */}
              <div className="p-6 space-y-5">
                {/* Dados da Conta */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Dados da Conta</p>
                    {transaction.type === "transfer" && bankInfo && 'from' in bankInfo ? (
                      <>
                        <p className="text-sm font-medium">Origem: {formatBankAccountDetails(bankInfo.from)}</p>
                        <p className="text-sm font-medium">Destino: {formatBankAccountDetails(bankInfo.to)}</p>
                      </>
                    ) : bankInfo && 'account' in bankInfo && bankInfo.account ? (
                      <>
                        <p className="text-sm font-medium">{formatBankAccountDetails(bankInfo.account)}</p>
                        {bankInfo.account.holder_name && (
                          <p className="text-sm text-muted-foreground">
                            Titular: {bankInfo.account.holder_name}
                          </p>
                        )}
                        {bankInfo.account.holder_document && (
                          <p className="text-sm text-muted-foreground">
                            Doc: {formatDocument(bankInfo.account.holder_document)}
                          </p>
                        )}
                        {(() => {
                          const pixInfo = getPixInfo(bankInfo.account);
                          if (pixInfo) {
                            return (
                              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                                <CreditCard className="h-3.5 w-3.5 text-primary" />
                                <span className="text-sm font-medium text-primary">
                                  Pix ({pixInfo.type}): {pixInfo.key}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Conta não informada</p>
                    )}
                  </div>
                </div>

                {transaction.type !== "transfer" && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                          {transaction.type === "revenue" ? "Dados do Pagador" : "Dados do Recebedor"}
                        </p>
                        <p className="text-sm font-medium">{getPartyName()}</p>
                        {getPartyDocument() && (
                          <p className="text-sm text-muted-foreground">
                            Documento: {getPartyDocument()}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Dados da Transação */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Hash className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      {transaction.status === "paid" ? "Dados do Pagamento" : "Dados da Transação"}
                    </p>
                    <p className="text-sm font-medium">{transaction.description}</p>
                    {transaction.category && (
                      <p className="text-sm text-muted-foreground">
                        Categoria: {transaction.category.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{getDateLabel()}</p>
                    <p className="text-sm font-medium">{getDisplayDate()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Download className="h-4 w-4" />
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
