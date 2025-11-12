import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Star, CreditCard, Calendar } from "lucide-react";

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  current_balance: number;
  account_type: string;
  is_active: boolean;
  is_default: boolean;
  credit_limit?: number;
  available_credit?: number;
  closing_day?: number;
  due_day?: number;
}

interface Props {
  account: BankAccount;
  onEdit: (account: BankAccount) => void;
  onDelete: (id: string) => void;
}

export function BankAccountCard({ account, onEdit, onDelete }: Props) {
  const getAccountTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      checking: "Conta Corrente",
      savings: "Poupança",
      investment: "Investimento",
      credit_card: "Cartão de Crédito",
      cdb: "CDB",
    };
    return types[type] || type;
  };

  const isCreditCard = account.account_type === 'credit_card';

  return (
    <Card className={`p-6 glass ${account.is_default ? "border-2 border-primary" : ""}`}>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{account.bank_name}</h3>
              {account.is_default && (
                <Star className="w-4 h-4 text-primary fill-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {getAccountTypeLabel(account.account_type)}
            </p>
          </div>
          <Badge variant={account.is_active ? "default" : "secondary"}>
            {account.is_active ? "Ativa" : "Inativa"}
          </Badge>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Conta</p>
          <p className="font-mono text-lg">{account.account_number}</p>
        </div>

        {isCreditCard ? (
          <>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Limite Total</p>
              <p className="text-xl font-bold text-primary">
                R$ {Number(account.credit_limit || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Disponível</p>
              <p className="text-2xl font-bold text-accent">
                R$ {Number(account.available_credit || account.credit_limit || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>

            {(account.closing_day || account.due_day) && (
              <div className="flex items-center gap-4 text-sm">
                {account.closing_day && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Fecha: dia {account.closing_day}</span>
                  </div>
                )}
                {account.due_day && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CreditCard className="w-4 h-4" />
                    <span>Vence: dia {account.due_day}</span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-1">Saldo Atual</p>
            <p className="text-2xl font-bold">
              R$ {Number(account.current_balance).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(account)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(account.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
