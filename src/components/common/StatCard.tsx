import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-[#E5E7EB] bg-white p-4',
        className,
      )}
    >
      <div className="text-[12px] text-[#6B7280]">{label}</div>
      <div className="mt-1 text-[18px] font-semibold text-[#111827]">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-[11px] text-[#6B7280]">{hint}</div>
      ) : null}
    </div>
  );
}

