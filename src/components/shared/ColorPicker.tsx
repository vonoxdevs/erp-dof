import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

const FIXED_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#84cc16', // Lime
  '#f43f5e', // Rose
  '#a855f7', // Violet
  '#0ea5e9', // Sky
  '#22c55e', // Green 500
  '#eab308', // Yellow
  '#64748b', // Slate
  '#dc2626', // Red 600
  '#059669', // Emerald
  '#7c3aed', // Purple 600
];

export function ColorPicker({ value, onChange, disabled = false }: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <Label>Cor</Label>
      <div className="grid grid-cols-10 gap-2">
        {FIXED_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => !disabled && onChange(color)}
            disabled={disabled}
            className={cn(
              'w-8 h-8 rounded-md border-2 transition-all hover:scale-110',
              value === color ? 'border-foreground ring-2 ring-offset-2 ring-foreground' : 'border-transparent',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Escolha uma cor para destacar a categoria
      </p>
    </div>
  );
}
