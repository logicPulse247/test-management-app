import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type PreviewQuestionSidebarProps = {
  totalQuestions: number;
  activeIndex: number;
  onSelect: (index: number) => void;
};

export function PreviewQuestionSidebar({
  totalQuestions,
  activeIndex,
  onSelect,
}: PreviewQuestionSidebarProps) {
  return (
    <div className="border-r border-[#E5E7EB] bg-white px-2 py-3">
      <div className="px-1.5">
        <div className="text-[11px] font-semibold text-[#111827]">
          Question creation
        </div>
        <div className="mt-1 text-[10px] text-[#6B7280]">
          Total Questions : {totalQuestions}
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {Array.from({ length: totalQuestions }, (_, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={idx}
              type="button"
              className={cn(
                'flex h-8 w-full items-center gap-2 rounded-sm px-2 text-[11px] font-medium transition',
                isActive
                  ? 'bg-[#5B7CFA] text-white'
                  : 'text-[#374151] hover:bg-[#F3F4F6]',
              )}
              onClick={() => onSelect(idx)}
            >
              <CheckCircle2
                className={cn(
                  'size-3.5 shrink-0',
                  isActive ? 'text-white' : 'text-[#22C55E]',
                )}
              />
              <span className="truncate">{`Question ${idx + 1}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
