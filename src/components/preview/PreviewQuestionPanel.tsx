import { cn } from '@/lib/utils';
import { QuestionImageDisplay } from '@/components/questions/QuestionImageDisplay';
import type { QuestionImageAttachment } from '@/types/questionImage.types';
import type { QuestionEntity } from '@/services/questions.service';

const CORRECT_KEYS = new Set(['option1', 'option2', 'option3', 'option4']);

function formatDifficultyLabel(difficulty: unknown): string {
  const d = String(difficulty ?? '');
  if (!d) return '';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

type PreviewQuestionPanelProps = {
  question: QuestionEntity;
  questionNumber: number;
  image?: QuestionImageAttachment;
};

export function PreviewQuestionPanel({
  question,
  questionNumber,
  image,
}: PreviewQuestionPanelProps) {
  const options = [
    { key: 'option1', label: 'A', text: question.option1 ?? '' },
    { key: 'option2', label: 'B', text: question.option2 ?? '' },
    { key: 'option3', label: 'C', text: question.option3 ?? '' },
    { key: 'option4', label: 'D', text: question.option4 ?? '' },
  ];
  const correctKey = question.correct_option ?? '';

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-[#111827]">
          Question {questionNumber}
        </div>
        {question.difficulty ? (
          <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#1B5DEF]">
            {formatDifficultyLabel(question.difficulty)}
          </span>
        ) : null}
      </div>

      <div
        className="text-[13px] leading-relaxed text-[#111827]"
        dangerouslySetInnerHTML={{ __html: question.question }}
      />

      <QuestionImageDisplay image={image} />

      <div className="mt-4 space-y-2">
        {options.map((opt) => {
          const isCorrect =
            CORRECT_KEYS.has(correctKey) && correctKey === opt.key;
          return (
            <div
              key={opt.key}
              className={cn(
                'flex items-start gap-3 rounded-md border px-3 py-2 text-[13px]',
                isCorrect
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]',
              )}
            >
              <span className="mt-0.5 font-semibold">{opt.label}.</span>
              <span className="flex-1">{opt.text || '—'}</span>
              {isCorrect ? (
                <span className="text-[11px] font-semibold text-emerald-700">
                  Correct
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {question.explanation?.trim() ? (
        <div className="mt-4 rounded-md border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2">
          <div className="text-[11px] font-semibold text-[#6B7280]">
            Solution
          </div>
          <div className="mt-1 text-[12px] text-[#374151]">
            {question.explanation}
          </div>
        </div>
      ) : null}
    </div>
  );
}
