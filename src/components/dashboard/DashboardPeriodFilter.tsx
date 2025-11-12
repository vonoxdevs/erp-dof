import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface DashboardPeriodFilterProps {
  selectedPeriod: '30' | '90' | 'custom';
  dateRange: DateRange | undefined;
  onPeriodChange: (period: '30' | '90' | 'custom') => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function DashboardPeriodFilter({
  selectedPeriod,
  dateRange,
  onPeriodChange,
  onDateRangeChange,
}: DashboardPeriodFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <span className="text-sm font-medium text-muted-foreground">Período:</span>
      <div className="flex gap-2">
        <Button
          variant={selectedPeriod === '30' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPeriodChange('30')}
        >
          30 dias
        </Button>
        <Button
          variant={selectedPeriod === '90' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPeriodChange('90')}
        >
          90 dias
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={selectedPeriod === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPeriodChange('custom')}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Personalizado
              {dateRange?.from && dateRange?.to && (
                <span className="ml-2 text-xs">
                  ({format(dateRange.from, 'dd/MM', { locale: ptBR })} - {format(dateRange.to, 'dd/MM', { locale: ptBR })})
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
