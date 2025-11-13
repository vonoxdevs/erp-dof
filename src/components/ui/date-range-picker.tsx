import * as React from "react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [fromInput, setFromInput] = React.useState("");
  const [toInput, setToInput] = React.useState("");

  React.useEffect(() => {
    if (dateRange?.from) {
      setFromInput(format(dateRange.from, "dd/MM/yyyy"));
    } else {
      setFromInput("");
    }
    if (dateRange?.to) {
      setToInput(format(dateRange.to, "dd/MM/yyyy"));
    } else {
      setToInput("");
    }
  }, [dateRange]);

  const handleFromInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFromInput(value);
    
    if (value.length === 10) {
      try {
        const parsedDate = parse(value, "dd/MM/yyyy", new Date());
        if (!isNaN(parsedDate.getTime())) {
          onDateRangeChange({
            from: parsedDate,
            to: dateRange?.to,
          });
        }
      } catch (error) {
        console.error("Invalid date format");
      }
    }
  };

  const handleToInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setToInput(value);
    
    if (value.length === 10) {
      try {
        const parsedDate = parse(value, "dd/MM/yyyy", new Date());
        if (!isNaN(parsedDate.getTime())) {
          onDateRangeChange({
            from: dateRange?.from,
            to: parsedDate,
          });
        }
      } catch (error) {
        console.error("Invalid date format");
      }
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd 'de' MMM", { locale: ptBR })} -{" "}
                  {format(dateRange.to, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                </>
              ) : (
                format(dateRange.from, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              )
            ) : (
              <span>Selecione o período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Data inicial</label>
                <Input
                  placeholder="DD/MM/AAAA"
                  value={fromInput}
                  onChange={handleFromInputChange}
                  maxLength={10}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Data final</label>
                <Input
                  placeholder="DD/MM/AAAA"
                  value={toInput}
                  onChange={handleToInputChange}
                  maxLength={10}
                  className="h-9"
                />
              </div>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}