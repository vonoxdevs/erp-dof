import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BankAccount {
  id: string;
  bank_name: string;
  account_type?: string | null;
}

interface MultiSelectAccountsProps {
  accounts: BankAccount[];
  selectedAccounts: string[];
  onSelectionChange: (accounts: string[]) => void;
  placeholder?: string;
}

const getAccountTypeLabel = (type?: string | null): string => {
  switch (type) {
    case "checking":
      return "Conta";
    case "savings":
      return "Poupança";
    case "credit":
    case "credit_card":
      return "Cartão";
    case "investment":
      return "Investimento";
    default:
      return "Conta";
  }
};

export function MultiSelectAccounts({
  accounts,
  selectedAccounts,
  onSelectionChange,
  placeholder = "Selecionar contas",
}: MultiSelectAccountsProps) {
  const [open, setOpen] = useState(false);

  const allSelected = selectedAccounts.length === 0;

  const toggleAccount = (accountId: string) => {
    if (selectedAccounts.includes(accountId)) {
      const newSelection = selectedAccounts.filter((id) => id !== accountId);
      onSelectionChange(newSelection);
    } else {
      onSelectionChange([...selectedAccounts, accountId]);
    }
  };

  const selectAll = () => {
    onSelectionChange([]);
  };

  const getDisplayText = () => {
    if (allSelected) {
      return "Todas as contas";
    }
    if (selectedAccounts.length === 1) {
      const account = accounts.find((a) => a.id === selectedAccounts[0]);
      if (account) {
        const typeLabel = getAccountTypeLabel(account.account_type);
        return `${account.bank_name} (${typeLabel})`;
      }
    }
    return `${selectedAccounts.length} contas selecionadas`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 font-normal"
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 bg-popover" align="start">
        <div className="max-h-[300px] overflow-auto p-2">
          {/* Opção Todas as contas */}
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer hover:bg-accent/50",
              allSelected && "bg-accent/30"
            )}
            onClick={selectAll}
          >
            <Checkbox
              checked={allSelected}
              onCheckedChange={selectAll}
              className="pointer-events-none"
            />
            <span className="flex-1 font-medium">Todas as contas</span>
            {allSelected && <Check className="h-4 w-4 text-primary" />}
          </div>

          <div className="h-px bg-border my-2" />

          {/* Lista de contas */}
          {accounts.map((account) => {
            const isSelected = selectedAccounts.includes(account.id);
            const typeLabel = getAccountTypeLabel(account.account_type);

            return (
              <div
                key={account.id}
                className={cn(
                  "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer hover:bg-accent/50",
                  isSelected && "bg-accent/30"
                )}
                onClick={() => toggleAccount(account.id)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleAccount(account.id)}
                  className="pointer-events-none"
                />
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <span className="truncate">{account.bank_name}</span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {typeLabel}
                  </Badge>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Rodapé com contagem */}
        {selectedAccounts.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <div className="p-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedAccounts.length} de {accounts.length} selecionadas
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={selectAll}
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
