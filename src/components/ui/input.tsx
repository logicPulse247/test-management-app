import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded border border-[#E5E7EB] bg-white px-3 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] outline-none transition focus:border-[#5B7FFF] focus:ring-2 focus:ring-[#5B7FFF]/20 disabled:cursor-not-allowed disabled:bg-[#F9FAFB]',
        className,
      )}
      {...props}
    />
  );
}

