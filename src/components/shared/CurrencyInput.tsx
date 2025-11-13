import { Input } from "@/components/ui/input";
import { forwardRef } from "react";

interface CurrencyInputProps {
  value?: number | string;
  onChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, disabled, placeholder = "R$ 0,00", required }, ref) => {
    const formatToBRL = (amount: number) => {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(amount);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, "");
      const numericValue = Number(rawValue) / 100;
      onChange(numericValue);
    };

    const displayValue = value !== undefined && value !== null && value !== "" 
      ? formatToBRL(Number(value))
      : "";

    return (
      <Input
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
