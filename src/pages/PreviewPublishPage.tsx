import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { PreviewPublishControls } from '@/components/preview/PreviewPublishControls';
import { PreviewQuestionPanel } from '@/components/preview/PreviewQuestionPanel';
import { PreviewQuestionSidebar } from '@/components/preview/PreviewQuestionSidebar';
import { PreviewTestSummaryCard } from '@/components/preview/PreviewTestSummaryCard';
import { canPublishTest } from '@/lib/testFlow';
import {
  getLinkedQuestionCount,
  getLinkedQuestionIds,
} from '@/lib/testEntity';
import { getQuestionImageFromRegistry } from '@/lib/questionImageRegistry';
import { useSubjectsQuery } from '@/queries/catalog.queries';
import { useQuestionsByIdsQuery } from '@/queries/questions.queries';
import { useTestByIdQuery, useUpdateTestMutation } from '@/queries/tests.queries';
import { useTestCreationStore } from '@/store/testCreation.store';
import { TEST_STATUS } from '@/constants/testStatus';

export default function PreviewPublishPage() {
  const params = useParams<{ testId: string }>();
  const testId = params.testId ?? '';
  const navigate = useNavigate();

  const testFlowMode = useTestCreationStore((s) => s.testFlowMode);
  const beginCreateFlow = useTestCreationStore((s) => s.beginCreateFlow);
  const publish = useTestCreationStore((s) => s.publish);
  const setPublish = useTestCreationStore((s) => s.setPublish);

  const isViewMode = testFlowMode === 'view';

  const testQuery = useTestByIdQuery(testId || null);
  const questionIds = useMemo(
    () => (testQuery.data ? getLinkedQuestionIds(testQuery.data) : []),
    [testQuery.data],
  );
  const questionsQuery = useQuestionsByIdsQuery(questionIds);
  const subjectsQuery = useSubjectsQuery();
  const updateMutation = useUpdateTestMutation(testId || '');

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const questions = questionsQuery.data ?? [];
  const questionCount = questions.length;

  useEffect(() => {
    if (questionCount === 0) {
      setActiveQuestionIndex(0);
      return;
    }
    setActiveQuestionIndex((idx) => Math.min(idx, questionCount - 1));
  }, [questionCount]);

  const activeQuestion = questions[activeQuestionIndex];
  const linkedCount = testQuery.data
    ? getLinkedQuestionCount(testQuery.data)
    : 0;

  const showPublishControls =
    !isViewMode && canPublishTest(testFlowMode, testQuery.data?.status);

  function exitViewMode() {
    beginCreateFlow();
    navigate('/test-tracking');
  }

  function handleCancel() {
    if (isViewMode) {
      navigate('/test-tracking');
      return;
    }
    navigate(`/questions/${testId}`);
  }

  async function handleConfirmPublish() {
    if (!testId) return;
    await updateMutation.mutateAsync({ status: TEST_STATUS.LIVE });
    navigate('/dashboard');
  }

  return (
    <PageContainer className="max-w-none px-4 py-4 sm:px-6">
      {/* Page header */}
      <div className="mb-4">
        <div className="text-[12px] text-[#6B7280]">Test creation</div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[18px] font-semibold text-[#111827]">
              {isViewMode ? 'Test Preview' : 'Test created'}
            </h1>
            {!isViewMode && linkedCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#ECFDF5] px-3 py-1 text-[11px] font-semibold text-[#15803D]">
                <CheckCircle2 className="size-3.5" />
                All {linkedCount} Question{linkedCount === 1 ? '' : 's'} done
              </span>
            ) : null}
          </div>
          {isViewMode ? (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => navigate('/test-tracking')}
              >
                Back to Test Tracking
              </Button>
              <Button variant="primary" size="sm" type="button" onClick={exitViewMode}>
                Close
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {testQuery.isLoading ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-[13px] text-[#6B7280]">
          Loading test…
        </div>
      ) : null}

      {testQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-[13px] text-red-700">
          Failed to load test details.
        </div>
      ) : null}

      {testQuery.data && subjectsQuery.data ? (
        <PreviewTestSummaryCard
          test={testQuery.data}
          subjects={subjectsQuery.data}
          showEditButton={!isViewMode}
          onEdit={() => navigate(`/questions/${testId}`)}
        />
      ) : null}

      {questionsQuery.isLoading ? (
        <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white p-5 text-[13px] text-[#6B7280]">
          Loading questions…
        </div>
      ) : null}

      {testQuery.data && questionIds.length === 0 ? (
        <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white p-5 text-[13px] text-[#6B7280]">
          {isViewMode
            ? 'No questions are linked to this test.'
            : 'No questions are linked to this test yet. Add questions from the Add Questions page.'}
        </div>
      ) : null}

      {questionIds.length > 0 && questionsQuery.isError ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-5 text-[13px] text-amber-900">
          Could not load questions for preview.
        </div>
      ) : null}

      {questionIds.length > 0 &&
      questionsQuery.data &&
      questionsQuery.data.length === 0 ? (
        <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white p-5 text-[13px] text-[#6B7280]">
          No question details returned for this test.
        </div>
      ) : null}

      {activeQuestion && questionCount > 0 ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
          <div className="grid min-h-[480px] grid-cols-[168px_minmax(0,1fr)]">
            <PreviewQuestionSidebar
              totalQuestions={questionCount}
              activeIndex={activeQuestionIndex}
              onSelect={setActiveQuestionIndex}
            />

            <div className="min-w-0 bg-[#F8FAFC] p-5">
              <PreviewQuestionPanel
                question={activeQuestion}
                questionNumber={activeQuestionIndex + 1}
                image={getQuestionImageFromRegistry(testId, activeQuestionIndex)}
              />

              {showPublishControls ? (
                <PreviewPublishControls
                  publishMode={publish.mode}
                  liveUntil={publish.liveUntil}
                  scheduleDate={publish.scheduleDate}
                  scheduleTime={publish.scheduleTime}
                  customEndDate={publish.customEndDate}
                  customEndTime={publish.customEndTime}
                  isPublishing={updateMutation.isPending}
                  onPublishModeChange={(mode) => setPublish({ mode })}
                  onLiveUntilChange={(liveUntil) => setPublish({ liveUntil })}
                  onScheduleDateChange={(scheduleDate) =>
                    setPublish({ scheduleDate })
                  }
                  onScheduleTimeChange={(scheduleTime) =>
                    setPublish({ scheduleTime })
                  }
                  onCustomEndDateChange={(customEndDate) =>
                    setPublish({ customEndDate })
                  }
                  onCustomEndTimeChange={(customEndTime) =>
                    setPublish({ customEndTime })
                  }
                  onCancel={handleCancel}
                  onConfirm={() => void handleConfirmPublish()}
                />
              ) : isViewMode ? (
                <div className="mt-6 flex justify-end border-t border-[#E5E7EB] pt-5">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => navigate('/test-tracking')}
                  >
                    Back to Test Tracking
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
