import { ChevronDown } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface MultiSelectOption {
  value: string;
  label: string;
}

function isRenderableOption(opt: MultiSelectOption): boolean {
  const value = opt.value?.trim();
  const label = opt.label?.trim();
  if (!value || !label) return false;
  if (value.includes('://') || label.includes('://')) return false;
  if (value.startsWith('/') || label.startsWith('/')) return false;
  return true;
}

export function MultiSelect({
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: {
  value: string[];
  options: MultiSelectOption[];
  placeholder: string;
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const safeOptions = useMemo(
    () => options.filter(isRenderableOption),
    [options],
  );

  const safeValue = useMemo(
    () => value.filter((v) => safeOptions.some((o) => o.value === v)),
    [safeOptions, value],
  );

  const label = useMemo(() => {
    if (!safeValue.length) return placeholder;
    const selected = safeOptions
      .filter((o) => safeValue.includes(o.value))
      .map((o) => o.label);
    if (!selected.length) return placeholder;
    if (selected.length <= 2) return selected.join(', ');
    return `${selected.slice(0, 2).join(', ')} +${selected.length - 2}`;
  }, [placeholder, safeOptions, safeValue]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between rounded border border-[#E5E7EB] bg-white px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#5B7FFF] focus:ring-2 focus:ring-[#5B7FFF]/20',
            disabled && 'cursor-not-allowed bg-[#F9FAFB] text-[#9CA3AF]',
          )}
        >
          <span className={cn(!safeValue.length && 'text-[#9CA3AF]')}>{label}</span>
          <ChevronDown className="size-4 text-[#6B7280]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dropdown-scroll z-[9999] min-w-[var(--radix-dropdown-menu-trigger-width)]">
        {safeOptions.map((opt) => {
          const checked = safeValue.includes(opt.value);
          return (
            <DropdownMenuItem
              key={opt.value}
              onSelect={(e) => {
                e.preventDefault();
                if (checked) {
                  onChange(safeValue.filter((v) => v !== opt.value));
                } else {
                  onChange([...safeValue, opt.value]);
                }
              }}
              className="flex items-center gap-2"
            >
              <input type="checkbox" checked={checked} readOnly />
              {opt.label}
            </DropdownMenuItem>
          );
        })}
        {safeOptions.length === 0 ? (
          <div className="px-2 py-2 text-[12px] text-[#6B7280]">No options</div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
