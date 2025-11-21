import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { forwardRef, useEffect, useState } from "react";
import { MinusCircle, PlusCircle } from "lucide-react";

interface CurrencyInputProps {
  value?: number | string;
  onChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, disabled, placeholder = "R$ 0,00", required }, ref) => {
    const currentValue = Number(value) || 0;
    const [isNegative, setIsNegative] = useState(currentValue < 0);

    // Sincronizar o estado do botão com o valor recebido
    useEffect(() => {
      setIsNegative(currentValue < 0);
    }, [currentValue]);

    const formatToBRL = (amount: number) => {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Math.abs(amount));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, "");
      let numericValue = Number(rawValue) / 100;
      
      // Aplicar sinal negativo se o toggle estiver ativo
      if (isNegative && numericValue > 0) {
        numericValue = -numericValue;
      }
      
      onChange(numericValue);
    };

    const toggleSign = () => {
      const newIsNegative = !isNegative;
      setIsNegative(newIsNegative);
      const absoluteValue = Math.abs(currentValue);
      
      // Só atualizar se houver um valor
      if (absoluteValue > 0) {
        onChange(newIsNegative ? -absoluteValue : absoluteValue);
      }
    };

    const displayValue = value !== undefined && value !== null && value !== "" 
      ? formatToBRL(Number(value))
      : "";

    return (
      <div className="flex gap-2">
        <Button
          type="button"
          variant={isNegative ? "destructive" : "outline"}
          size="icon"
          onClick={toggleSign}
          disabled={disabled}
          className="shrink-0"
        >
          {isNegative ? (
            <MinusCircle className="h-4 w-4" />
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
        </Button>
        <Input
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="flex-1"
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
