import { Clock, FileText, Pencil, Star } from 'lucide-react';
import {
  extractTestCatalogItems,
  parseTestRefList,
  resolveSubjectName,
} from '@/lib/catalog';
import { getLinkedQuestionCount } from '@/lib/testEntity';
import type { TestEntity } from '@/types/test.types';
import type { Subject } from '@/types/catalog.types';

function formatTestType(type: unknown): string {
  const raw = String(type ?? 'Test').replace(/_/g, ' ');
  return raw
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function formatDifficultyLabel(difficulty: unknown): string {
  const d = String(difficulty ?? '');
  if (!d) return '';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

type PreviewTestSummaryCardProps = {
  test: TestEntity;
  subjects: Subject[];
  showEditButton?: boolean;
  onEdit?: () => void;
};

export function PreviewTestSummaryCard({
  test,
  subjects,
  showEditButton = false,
  onEdit,
}: PreviewTestSummaryCardProps) {
  const subjectLabel = resolveSubjectName(test.subject, subjects);
  const topicItems = extractTestCatalogItems(test.topics);
  const subTopicItems = extractTestCatalogItems(test.sub_topics);
  const topicRefs = parseTestRefList(test.topics);
  const subTopicRefs = parseTestRefList(test.sub_topics);

  const topicPills =
    topicItems.length > 0
      ? topicItems.map((t) => t.name)
      : topicRefs.length > 0
        ? topicRefs
        : [];
  const subTopicPills =
    subTopicItems.length > 0
      ? subTopicItems.map((t) => t.name)
      : subTopicRefs.length > 0
        ? subTopicRefs
        : [];

  const linkedCount = getLinkedQuestionCount(test);

  return (
    <div className="relative rounded-xl border border-[#E5E7EB] bg-white px-5 py-5">
      {showEditButton && onEdit ? (
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md text-[#5B7CFA] hover:bg-[#EEF2FF]"
          aria-label="Edit test"
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </button>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4 pr-10">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center rounded-full bg-[#1E3A5F] px-3 py-1 text-[11px] font-semibold text-white">
            {formatTestType(test.type)}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="text-[15px] font-semibold text-[#111827]">
              {test.name}
            </div>
            {test.difficulty ? (
              <span className="rounded-full bg-[#CCFBF1] px-2 py-0.5 text-[11px] font-semibold text-[#0F766E]">
                {formatDifficultyLabel(test.difficulty)}
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid gap-y-1.5 text-[12px] text-[#111827]">
            <div className="flex items-center gap-2">
              <span className="w-[62px] text-[#6B7280]">Subject</span>
              <span className="text-[#6B7280]">:</span>
              <span>{subjectLabel}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-[62px] shrink-0 text-[#6B7280]">Topic</span>
              <span className="text-[#6B7280]">:</span>
              <div className="flex flex-wrap gap-1.5">
                {topicPills.length > 0 ? (
                  topicPills.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-semibold text-[#B45309]"
                    >
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="text-[#9CA3AF]">—</span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-[62px] shrink-0 text-[#6B7280]">
                Sub Topic
              </span>
              <span className="text-[#6B7280]">:</span>
              <div className="flex flex-wrap gap-1.5">
                {subTopicPills.length > 0 ? (
                  subTopicPills.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-semibold text-[#B45309]"
                    >
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="text-[#9CA3AF]">—</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-5 pt-2 text-[12px] font-medium text-[#111827]">
          <div className="flex items-center gap-1.5">
            <Clock className="size-4 text-[#6B7280]" />
            <span>{Number(test.total_time ?? 0)} Min</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="size-4 text-[#6B7280]" />
            <span>{linkedCount} Qs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="size-4 text-[#6B7280]" />
            <span>{Number(test.total_marks ?? 0)} Marks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
