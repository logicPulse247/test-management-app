import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bold,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Pencil,
  Plus,
  Trash2,
  Underline,
  Download,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useSubjectsQuery,
  useTopicsBySubjectQuery,
  useSubTopicsByTopicsQuery,
} from '@/queries/catalog.queries';
import {
  buildCatalogOptionsFromRefs,
  extractTestCatalogItems,
  isValidCatalogId,
  mergeSelectOptions,
  parseTestRefList,
  resolveSubjectId,
  resolveSubjectName,
  toMultiSelectOptions,
} from '@/lib/catalog';
import { getErrorMessage } from '@/lib/api';
import { QuestionImageDisplay } from '@/components/questions/QuestionImageDisplay';
import { clearPersistedAddQuestions } from '@/lib/addQuestionsPersistence';
import { getLinkedQuestionIds } from '@/lib/testEntity';
import {
  fileToQuestionImage,
  QUESTION_IMAGE_ACCEPT,
} from '@/lib/questionImageAttachment';
import {
  applyFormatToQuestionText,
  type QuestionTextFormatAction,
} from '@/lib/questionTextFormat';
import { buildCreateTestFormValuesFromEntity } from '@/lib/testFormHydration';
import { parseQuestionsCsvFile } from '@/lib/csvImport';
import type { CsvImportResult } from '@/lib/csvImport';
import {
  draftHasPersistedQuestionId,
  draftToBulkInput,
  isSelectableQuestionIndex,
  mapQuestionEntitiesToDrafts,
  validateQuestionDraft,
} from '@/lib/questionDraft';
import {
  useBulkCreateAndLinkQuestionsMutation,
  useQuestionsByIdsQuery,
} from '@/queries/questions.queries';
import { useTestByIdQuery } from '@/queries/tests.queries';
import type { BulkCreateQuestionInput } from '@/services/questions.service';
import { useAddQuestionsStore } from '@/store/addQuestions.store';
import { useTestCreationStore } from '@/store/testCreation.store';

function formatTestTypeLabel(type: unknown): string {
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

export default function AddQuestionsPage() {
  const params = useParams<{ testId: string }>();
  const testId = params.testId ?? null;
  const navigate = useNavigate();

  const setCurrentTestId = useTestCreationStore((s) => s.setCurrentTestId);
  const setCurrentTest = useTestCreationStore((s) => s.setCurrentTest);
  const setTestFlowMode = useTestCreationStore((s) => s.setTestFlowMode);
  const setReturnToPath = useTestCreationStore((s) => s.setReturnToPath);
  const applyTestFormHydration = useTestCreationStore(
    (s) => s.applyTestFormHydration,
  );
  const enterWizardEdit = useTestCreationStore((s) => s.enterWizardEdit);
  const testFlowMode = useTestCreationStore((s) => s.testFlowMode);
  const returnToPath = useTestCreationStore((s) => s.returnToPath);
  const currentTest = useTestCreationStore((s) => s.currentTest);

  const testQuery = useTestByIdQuery(testId);
  const isEditFlow = testFlowMode === 'edit';

  const linkedQuestionIds = useMemo(
    () => (testQuery.data ? getLinkedQuestionIds(testQuery.data) : []),
    [testQuery.data],
  );
  const questionsQuery = useQuestionsByIdsQuery(
    isEditFlow ? linkedQuestionIds : [],
  );

  const initForTest = useAddQuestionsStore((s) => s.initForTest);
  const hydrateDraftsFromApi = useAddQuestionsStore((s) => s.hydrateDraftsFromApi);
  const drafts = useAddQuestionsStore((s) => s.drafts);
  const activeIndex = useAddQuestionsStore((s) => s.activeIndex);
  const setActiveIndex = useAddQuestionsStore((s) => s.setActiveIndex);
  const updateDraft = useAddQuestionsStore((s) => s.updateDraft);
  const markSaved = useAddQuestionsStore((s) => s.markSaved);
  const importCsvDrafts = useAddQuestionsStore((s) => s.importCsvDrafts);

  const [pageError, setPageError] = useState<string | null>(null);
  const [csvImportInfo, setCsvImportInfo] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteAllEditsOpen, setDeleteAllEditsOpen] = useState(false);
  const bulkMutation = useBulkCreateAndLinkQuestionsMutation(testId ?? '');
  const didSeedTopicDefaults = useRef(false);
  const editHydrationKeyRef = useRef<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const questionTextareaRef = useRef<HTMLTextAreaElement>(null);

  function applyQuestionFormat(action: QuestionTextFormatAction) {
    const textarea = questionTextareaRef.current;
    if (!textarea || activeDraft === undefined) return;

    const { nextValue, selectionStart, selectionEnd } = applyFormatToQuestionText(
      activeDraft.questionHtml,
      textarea.selectionStart,
      textarea.selectionEnd,
      action,
    );

    updateDraft(activeIndex, { questionHtml: nextValue });

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function handleImageButtonClick() {
    setPageError(null);
    imageInputRef.current?.click();
  }

  async function handleImageFileSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || activeDraft === undefined) return;

    setPageError(null);
    try {
      const image = await fileToQuestionImage(file);
      updateDraft(activeIndex, { image });
    } catch (e: unknown) {
      setPageError(
        e instanceof Error ? e.message : 'Failed to attach image.',
      );
    }
  }

  function handleRemoveQuestionImage() {
    setPageError(null);
    updateDraft(activeIndex, { image: undefined });
  }

  useEffect(() => {
    if (testId) {
      setCurrentTestId(testId);
    }
  }, [setCurrentTestId, testId]);

  useEffect(() => {
    if (testFlowMode === 'view' && testId) {
      navigate(`/preview/${testId}`, { replace: true });
    }
  }, [navigate, testFlowMode, testId]);

  const testTotalQuestions = Number(testQuery.data?.total_questions ?? 1);

  useEffect(() => {
    if (!testQuery.data?.id || testQuery.data.id !== testId) return;
    setCurrentTest(testQuery.data);
    if (isEditFlow) return;
    initForTest(testQuery.data.id, testTotalQuestions);
  }, [
    initForTest,
    isEditFlow,
    setCurrentTest,
    testId,
    testQuery.data?.id,
    testTotalQuestions,
    testQuery.data,
  ]);

  useEffect(() => {
    editHydrationKeyRef.current = null;
  }, [testId]);

  const subjectsQuery = useSubjectsQuery();
  const resolvedSubjectId = useMemo(
    () =>
      resolveSubjectId(
        String(currentTest?.subject ?? testQuery.data?.subject ?? ''),
        subjectsQuery.data ?? [],
      ),
    [currentTest?.subject, subjectsQuery.data, testQuery.data?.subject],
  );

  const activeDraft =
    drafts.length > 0
      ? drafts[Math.min(activeIndex, drafts.length - 1)]
      : undefined;
  const testData = testQuery.data ?? currentTest;

  const isReadOnlyFlow = testFlowMode === 'view';

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  function showToast(message: string) {
    setToastMessage(message);
  }

  function handleMcqButtonClick() {
    showToast('MCQ template already active');
  }

  function handleClearQuestionText() {
    if (!activeDraft) return;
    updateDraft(activeIndex, { questionHtml: '' });
  }

  function handleClearOption(optionIndex: number) {
    if (!activeDraft) return;
    const next = [...activeDraft.options] as [
      string,
      string,
      string,
      string,
    ];
    next[optionIndex] = '';
    updateDraft(activeIndex, { options: next });
  }

  function handleClearSolution() {
    if (!activeDraft) return;
    updateDraft(activeIndex, { explanation: '' });
  }

  function handleConfirmDeleteAllEdits() {
    if (!activeDraft) return;
    updateDraft(activeIndex, {
      questionHtml: '',
      options: ['', '', '', ''],
      explanation: '',
      correctIndex: 0,
      isSaved: false,
      image: undefined,
    });
    setDeleteAllEditsOpen(false);
    setPageError(null);
    setCsvImportInfo(null);
  }

  function openTestEdit() {
    if (!testId) return;
    const test = testQuery.data ?? currentTest;
    if (test && subjectsQuery.data?.length) {
      const formValues = buildCreateTestFormValuesFromEntity(test, {
        subjects: subjectsQuery.data,
        topicCatalog: topicsQuery.data ?? [],
        subTopicCatalog: subTopicsQuery.data ?? [],
        fallbackTestType: String(test.type ?? ''),
      });
      applyTestFormHydration(formValues);
    }
    enterWizardEdit(testId);
    navigate('/test-creation');
  }

  const testSubjectName = useMemo(
    () =>
      resolveSubjectName(
        String(testData?.subject ?? ''),
        subjectsQuery.data ?? [],
      ),
    [subjectsQuery.data, testData?.subject],
  );

  const topicsQuery = useTopicsBySubjectQuery(resolvedSubjectId);

  const testTopicRefs = useMemo(
    () => parseTestRefList(testData?.topics),
    [testData?.topics],
  );

  const testSubTopicRefs = useMemo(
    () => parseTestRefList(testData?.sub_topics),
    [testData?.sub_topics],
  );

  const topicSelectOptions = useMemo(() => {
    const catalog = topicsQuery.data ?? [];
    const fromEmbedded = toMultiSelectOptions(
      extractTestCatalogItems(testData?.topics),
    );
    const fromRefs = buildCatalogOptionsFromRefs(testTopicRefs, catalog);
    const fromCatalog = toMultiSelectOptions(
      catalog.filter((t) =>
        testTopicRefs.some(
          (ref) =>
            ref === t.id || ref.toLowerCase() === t.name.toLowerCase(),
        ),
      ),
    );
    return mergeSelectOptions(fromEmbedded, fromRefs, fromCatalog);
  }, [testData?.topics, testTopicRefs, topicsQuery.data]);

  const testTopicIds = useMemo(
    () => topicSelectOptions.map((o) => o.value).filter(isValidCatalogId),
    [topicSelectOptions],
  );

  const subTopicsQuery = useSubTopicsByTopicsQuery(testTopicIds);

  const subTopicSelectOptions = useMemo(() => {
    const catalog = subTopicsQuery.data ?? [];
    const fromEmbedded = toMultiSelectOptions(
      extractTestCatalogItems(testData?.sub_topics),
    );
    const fromRefs = buildCatalogOptionsFromRefs(testSubTopicRefs, catalog);
    const fromApi = toMultiSelectOptions(catalog);
    return mergeSelectOptions(fromEmbedded, fromRefs, fromApi);
  }, [testData?.sub_topics, testSubTopicRefs, subTopicsQuery.data]);

  useEffect(() => {
    if (!isEditFlow || !testId || !testQuery.data?.id) return;
    if (testQuery.data.id !== testId) return;

    if (linkedQuestionIds.length === 0) {
      initForTest(testId, testTotalQuestions);
      return;
    }

    if (questionsQuery.isLoading || questionsQuery.isFetching) return;

    if (questionsQuery.isError) {
      setPageError('Failed to load questions for editing.');
      return;
    }

    const questions = questionsQuery.data ?? [];

    if (linkedQuestionIds.length > 0 && questions.length === 0) {
      setPageError(
        'Questions are linked to this test but could not be loaded. Check the network tab for fetchBulk errors.',
      );
      return;
    }

    const defaultTopicId = topicSelectOptions[0]?.value ?? '';
    const defaultSubTopicId = subTopicSelectOptions[0]?.value ?? '';
    const mappedDrafts = mapQuestionEntitiesToDrafts(questions, {
      topicId: defaultTopicId,
      subTopicId: defaultSubTopicId,
    });

    const hydrationKey = [
      testId,
      linkedQuestionIds.join(','),
      String(questions.length),
      defaultTopicId,
      defaultSubTopicId,
    ].join('|');
    if (editHydrationKeyRef.current === hydrationKey) return;
    editHydrationKeyRef.current = hydrationKey;

    hydrateDraftsFromApi(testId, mappedDrafts, { clearPersisted: true });
  }, [
    hydrateDraftsFromApi,
    initForTest,
    isEditFlow,
    linkedQuestionIds,
    questionsQuery.data,
    questionsQuery.isError,
    questionsQuery.isFetching,
    questionsQuery.isLoading,
    subTopicSelectOptions,
    testId,
    testQuery.data,
    testTotalQuestions,
    topicSelectOptions,
  ]);

  useEffect(() => {
    if (!isEditFlow || !testQuery.data?.id || !subjectsQuery.data?.length) return;
    const formValues = buildCreateTestFormValuesFromEntity(testQuery.data, {
      subjects: subjectsQuery.data,
      topicCatalog: topicsQuery.data ?? [],
      subTopicCatalog: subTopicsQuery.data ?? [],
      fallbackTestType: String(testQuery.data.type ?? ''),
    });
    applyTestFormHydration(formValues);
  }, [
    applyTestFormHydration,
    isEditFlow,
    subjectsQuery.data,
    subTopicsQuery.data,
    testQuery.data,
    topicsQuery.data,
  ]);

  useEffect(() => {
    if (didSeedTopicDefaults.current) return;
    if (!testData?.id) return;
    if (!topicSelectOptions.length) return;

    const defaultTopicId = topicSelectOptions[0]?.value ?? '';
    const defaultSubTopicId = subTopicSelectOptions[0]?.value ?? '';

    drafts.forEach((d, idx) => {
      const patch: { topicId?: string; subTopicId?: string } = {};
      if (!d.topicId && defaultTopicId) patch.topicId = defaultTopicId;
      if (!d.subTopicId && defaultSubTopicId) patch.subTopicId = defaultSubTopicId;
      if (Object.keys(patch).length) updateDraft(idx, patch);
    });

    didSeedTopicDefaults.current = true;
  }, [
    drafts,
    subTopicSelectOptions,
    testData?.id,
    topicSelectOptions,
    updateDraft,
  ]);

  useEffect(() => {
    didSeedTopicDefaults.current = false;
  }, [testId]);

  const totalQuestions = drafts.length;

  const defaultTopicId = topicSelectOptions[0]?.value;
  const defaultSubTopicId = subTopicSelectOptions[0]?.value;
  const isLastQuestion = activeIndex >= totalQuestions - 1;

  const statusForIndex = useMemo(() => {
    return drafts.map((d, idx) => {
      if (idx === activeIndex) return 'active' as const;
      if (d.isSaved) return 'completed' as const;
      return 'pending' as const;
    });
  }, [activeIndex, drafts]);

  const testTypeLabel = formatTestTypeLabel(testQuery.data?.type);

  function validateCurrentQuestion(): string | null {
    if (!activeDraft) return 'No active question.';
    return validateQuestionDraft(
      activeDraft,
      activeIndex + 1,
      defaultTopicId,
      defaultSubTopicId,
    );
  }

  function goToQuestion(index: number) {
    if (!isSelectableQuestionIndex(drafts, index)) return;
    setPageError(null);
    setActiveIndex(index);
  }

  function handleArrowPrevious() {
    setPageError(null);
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  }

  function handleArrowNext() {
    setPageError(null);
    if (activeIndex < totalQuestions - 1) {
      setActiveIndex(activeIndex + 1);
    }
  }

  function handleExitTestCreation() {
    setPageError(null);
    openTestEdit();
  }

  function handleCsvButtonClick() {
    setPageError(null);
    setCsvImportInfo(null);
    csvInputRef.current?.click();
  }

  async function handleCsvFileSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPageError(null);
    setCsvImportInfo(null);

    const beforeImport = useAddQuestionsStore.getState();

    const result: CsvImportResult = await parseQuestionsCsvFile(file);
    if (result.ok === false) {
      setPageError(result.errors.join(' '));
      return;
    }

    const configuredCount = totalQuestions;
    const csvCount = result.drafts.length;

    if (csvCount > configuredCount) {
      setPageError(
        `CSV contains ${csvCount} questions but this test is configured for ${configuredCount} questions. Please upload a CSV with ${configuredCount} questions or fewer.`,
      );
      return;
    }

    const emptySlots = beforeImport.drafts.filter((d) => {
      return (
        !String(d.questionHtml ?? '').trim() &&
        !String(d.explanation ?? '').trim() &&
        (Array.isArray(d.options) ? d.options : []).every(
          (o) => !String(o ?? '').trim(),
        )
      );
    }).length;

    if (csvCount > emptySlots) {
      setPageError(
        `CSV contains ${csvCount} questions but only ${emptySlots} empty question slot${emptySlots === 1 ? '' : 's'} are available. Please clear existing questions or upload a smaller CSV.`,
      );
      return;
    }

    const importedCount = importCsvDrafts(result.drafts, {
      topicId: defaultTopicId,
      subTopicId: defaultSubTopicId,
    });

    setCsvImportInfo(
      `Imported ${importedCount} question${importedCount === 1 ? '' : 's'} from CSV.`,
    );
  }

  async function handleNext() {
    if (!testId || !activeDraft) return;
    setPageError(null);

    const err = validateCurrentQuestion();
    if (err) {
      setPageError(err);
      return;
    }

    markSaved(activeIndex);

    if (!isLastQuestion) {
      setActiveIndex(activeIndex + 1);
      return;
    }

    const savedDrafts = useAddQuestionsStore
      .getState()
      .drafts.filter((d) => d.isSaved);
    if (savedDrafts.length < drafts.length) {
      const firstUnsaved = drafts.findIndex((d) => !d.isSaved) + 1;
      setPageError(
        `Please complete all questions before continuing. Question ${firstUnsaved} is not saved yet.`,
      );
      return;
    }

    if (!testSubjectName.trim()) {
      setPageError(
        'Test subject is missing. Reload the test or update the test before saving questions.',
      );
      return;
    }

    const inputs: BulkCreateQuestionInput[] = savedDrafts.map((d) =>
      draftToBulkInput(d, testId, testSubjectName),
    );

    try {
      if (isEditFlow && savedDrafts.every(draftHasPersistedQuestionId)) {
        clearPersistedAddQuestions(testId);
        const destination = returnToPath ?? '/test-tracking';
        setTestFlowMode('create');
        setReturnToPath(null);
        navigate(destination);
        return;
      }

      await bulkMutation.mutateAsync(inputs);

      clearPersistedAddQuestions(testId);
      setTestFlowMode('create');
      if (returnToPath) {
        const destination = returnToPath;
        setReturnToPath(null);
        navigate(destination);
        return;
      }
      navigate(`/preview/${testId}`);
    } catch (e: unknown) {
      setPageError(
        getErrorMessage(e, 'Failed to save questions. Please try again.'),
      );
    }
  }

  return (
    <PageContainer className="max-w-none px-4 py-4 sm:px-6">
      {testQuery.isLoading ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-[13px] text-[#111827]">
          Loading test…
        </div>
      ) : null}

      {testQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-[13px] text-red-700">
          Failed to load test details.
        </div>
      ) : null}

      {pageError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-[12px] text-red-700">
          {pageError}
        </div>
      ) : null}

      {csvImportInfo ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-[12px] text-emerald-800">
          {csvImportInfo}
        </div>
      ) : null}

      {testQuery.data && activeDraft ? (
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
          <div className="grid min-h-[820px] grid-cols-[168px_minmax(0,1fr)]">
            <div className="border-r border-[#E5E7EB] bg-white px-2 py-3">
              <div className="px-1.5">
                <div className="text-sm font-semibold text-[#6B7180]">
                  Question creation
                </div>
                <div className="mt-1 text-sm text-[#6B7280]">
                  Total Questions : {totalQuestions}
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {drafts.map((d, idx) => {
                  const state = statusForIndex[idx];
                  const isActive = state === 'active';
                  const isCompleted = state === 'completed';
                  const LeftIcon = isCompleted ? CheckCircle2 : Circle;

                  return (
                    <button
                      key={d.id}
                      type="button"
                      className={cn(
                        'flex h-8 w-full items-center gap-2 rounded-lg border px-2.5 text-[11px] font-medium transition',
                        !isActive &&
                        'border-transparent bg-white text-[#374151] hover:bg-[#F9FAFB]',
                        isActive &&
                        'border-[#0C9D61] bg-transparent text-[#0C9D61]',
                        isCompleted &&
                        !isActive &&
                        'border-transparent bg-white text-[#374151]',
                      )}
                      onClick={() => goToQuestion(idx)}
                    >
                      <LeftIcon
                        className={cn(
                          'size-3.5 shrink-0',
                          isCompleted
                            ? 'text-[#22C55E]'
                            : isActive
                              ? 'fill-[#22C55E] text-[#22C55E]'
                              : 'text-[#CBD5E1]',
                        )}
                      />
                      <span className="truncate">{`Question ${idx + 1}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex min-w-0 flex-col bg-[#F8FAFC]">
              <div className="flex-1 p-5 pb-0">
                <div className="flex items-start justify-between">
                  <div className="text-[12px] text-[#6B7280]">
                    Test Creation / Create Test / {testTypeLabel}
                  </div>
                  <button className='inline-flex h-10 min-w-[100px] items-center justify-center rounded-md bg-[#5B7CFA] px-10 text-[12px] font-semibold text-white hover:bg-[#4A6EFF] disabled:opacity-60'>Publish</button>
                </div>

                <div className="relative mt-4 rounded-xl border border-[#E5E7EB] bg-white px-5 py-5">
                  {!isReadOnlyFlow ? (
                    <button
                      type="button"
                      className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md text-[#5B7CFA] hover:bg-[#EEF2FF]"
                      aria-label="Edit test"
                      onClick={openTestEdit}
                    >
                      <Pencil className="size-4" />
                    </button>
                  ) : null}

                  <div className="flex items-start justify-between gap-4 pr-10">
                    <div>
                      <div className="inline-flex items-center rounded-full bg-[#1E3A5F] px-3 py-1 text-[11px] font-semibold text-white">
                        {testTypeLabel}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="text-[13px] font-semibold text-[#111827]">
                          {testQuery.data.name}
                        </div>
                        {testQuery.data.difficulty ? (
                          <span className="rounded-full bg-[#CCFBF1] px-2 py-0.5 text-[11px] font-semibold text-[#0F766E]">
                            {formatDifficultyLabel(testQuery.data.difficulty)}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 grid gap-y-1.5 text-[12px] text-[#111827]">
                        <div className="flex items-center gap-2">
                          <span className="w-[52px] text-[#6B7280]">Subject</span>
                          <span className="text-[#6B7280]">:</span>
                          <span>{String(testQuery.data.subject ?? '—')}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-[52px] shrink-0 text-[#6B7280]">
                            Topic
                          </span>
                          <span className="text-[#6B7280]">:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {(testQuery.data.topics ?? []).slice(0, 6).map((t) => (
                              <span
                                key={String(t)}
                                className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-semibold text-[#B45309]"
                              >
                                {String(t)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-[52px] shrink-0 text-[#6B7280]">
                            Sub Topic
                          </span>
                          <span className="text-[#6B7280]">:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {(testQuery.data.sub_topics ?? [])
                              .slice(0, 6)
                              .map((st) => (
                                <span
                                  key={String(st)}
                                  className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[10px] font-semibold text-[#B45309]"
                                >
                                  {String(st)}
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-6 pt-6 text-[12px] text-[#111827]">
                      <div className="text-center font-medium">
                        {Number(testQuery.data.total_time ?? 0)} Min
                      </div>
                      <div className="text-center font-medium">
                        {totalQuestions} Q&apos;s
                      </div>
                      <div className="text-center font-medium">
                        {Number(testQuery.data.total_marks ?? 0)} Marks
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-start justify-between">
                  <div>
                    <div className="text-[13px] font-semibold text-[#111827]">
                      Question {activeIndex + 1}/{totalQuestions}
                    </div>
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#EF4444] hover:text-[#DC2626]"
                      onClick={() => setDeleteAllEditsOpen(true)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete All Edits
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 text-[12px] font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
                      onClick={handleMcqButtonClick}
                    >
                      <Plus
                        size={14}
                        strokeWidth={1.5}
                        className="shrink-0"
                        aria-hidden
                      />
                      MCQ
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 text-[12px] font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
                      onClick={handleCsvButtonClick}
                    >
                      <Download
                        size={14}
                        strokeWidth={1.5}
                        className="shrink-0"
                        aria-hidden
                      />
                      CSV
                    </button>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      aria-hidden
                      tabIndex={-1}
                      onChange={(e) => void handleCsvFileSelected(e)}
                    />
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-white">
                  <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-3 py-2 text-[#6B7280]">
                    <button
                      type="button"
                      title="Bold"
                      className="inline-flex size-8 items-center justify-center rounded-md hover:bg-[#F3F4F6] hover:text-[#111827]"
                      onClick={() => applyQuestionFormat('bold')}
                    >
                      <Bold className="size-4" />
                    </button>
                    <button
                      type="button"
                      title="Italic"
                      className="inline-flex size-8 items-center justify-center rounded-md hover:bg-[#F3F4F6] hover:text-[#111827]"
                      onClick={() => applyQuestionFormat('italic')}
                    >
                      <Italic className="size-4" />
                    </button>
                    <button
                      type="button"
                      title="Underline"
                      className="inline-flex size-8 items-center justify-center rounded-md hover:bg-[#F3F4F6] hover:text-[#111827]"
                      onClick={() => applyQuestionFormat('underline')}
                    >
                      <Underline className="size-4" />
                    </button>
                    <button
                      type="button"
                      title="Bullet list"
                      className="inline-flex size-8 items-center justify-center rounded-md hover:bg-[#F3F4F6] hover:text-[#111827]"
                      onClick={() => applyQuestionFormat('unordered-list')}
                    >
                      <List className="size-4" />
                    </button>
                    <button
                      type="button"
                      title="Numbered list"
                      className="inline-flex size-8 items-center justify-center rounded-md hover:bg-[#F3F4F6] hover:text-[#111827]"
                      onClick={() => applyQuestionFormat('ordered-list')}
                    >
                      <ListOrdered className="size-4" />
                    </button>
                    <button
                      type="button"
                      title="Attach image"
                      className={cn(
                        'inline-flex size-8 items-center justify-center rounded-md hover:bg-[#F3F4F6] hover:text-[#111827]',
                        activeDraft?.image?.imageData && 'text-[#1B5DEF]',
                      )}
                      onClick={handleImageButtonClick}
                    >
                      <ImageIcon className="size-4" />
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept={QUESTION_IMAGE_ACCEPT}
                      className="hidden"
                      aria-hidden
                      tabIndex={-1}
                      onChange={(e) => void handleImageFileSelected(e)}
                    />
                  </div>
                  <div className="relative">
                    <textarea
                      ref={questionTextareaRef}
                      value={activeDraft.questionHtml}
                      onChange={(e) =>
                        updateDraft(activeIndex, { questionHtml: e.target.value })
                      }
                      className="min-h-[200px] w-full resize-none bg-white px-3 py-3 pr-10 pb-10 text-[13px] text-[#111827] outline-none placeholder:text-[#9CA3AF]"
                      placeholder="Type here"
                    />
                    <button
                      type="button"
                      className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-md text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#111827]"
                      aria-label="Clear question text"
                      onClick={handleClearQuestionText}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {activeDraft ? (
                    <div className="border-t border-[#E5E7EB] px-3 pb-3">
                      <QuestionImageDisplay
                        image={activeDraft.image}
                        editable
                        onReplace={handleImageButtonClick}
                        onRemove={handleRemoveQuestionImage}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="mt-6">
                  <div className="text-[12px] font-semibold text-[#111827]">
                    Type the options below
                  </div>
                  <div className="mt-3 space-y-3">
                    {activeDraft.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`correct-${activeDraft.id}`}
                          checked={activeDraft.correctIndex === idx}
                          onChange={() =>
                            updateDraft(activeIndex, {
                              correctIndex: idx as 0 | 1 | 2 | 3,
                            })
                          }
                          className="size-4 shrink-0 accent-[#5B7CFA]"
                        />
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const next = [...activeDraft.options] as [
                                string,
                                string,
                                string,
                                string,
                              ];
                              next[idx] = e.target.value;
                              updateDraft(activeIndex, { options: next });
                            }}
                            placeholder="Type Option here"
                            className="h-10 text-[13px]"
                          />
                          <button
                            type="button"
                            className="flex size-9 shrink-0 items-center justify-center rounded-md text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#111827]"
                            aria-label={`Clear option ${idx + 1}`}
                            onClick={() => handleClearOption(idx)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-[12px] font-semibold text-[#111827]">
                    Add Solution
                  </div>
                  <div className="relative mt-3">
                    <textarea
                      value={activeDraft.explanation}
                      onChange={(e) =>
                        updateDraft(activeIndex, { explanation: e.target.value })
                      }
                      className="min-h-[120px] w-full resize-none rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 pr-10 pb-10 text-[13px] text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#5B7CFA] focus:ring-2 focus:ring-[#5B7CFA]/20"
                      placeholder="Type here"
                    />
                    <button
                      type="button"
                      className="absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-md text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#111827]"
                      aria-label="Clear solution"
                      onClick={handleClearSolution}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleArrowPrevious}
                    disabled={activeIndex === 0}
                    className="inline-flex size-9 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous question"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleArrowNext}
                    disabled={
                      activeIndex >= totalQuestions - 1
                    }
                    className="inline-flex size-9 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next question"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>

                <div className="mt-6">
                  <div className="text-[12px] font-semibold text-[#111827]">
                    Question settings
                  </div>

                  <div className="mt-4 max-w-full space-y-4 sm:max-w-[480px]">
                    <div>
                      <div className="mb-1.5 text-[12px] font-medium text-[#111827]">
                        Level of Difficulty
                      </div>
                      <Select
                        value={activeDraft.difficulty}
                        onValueChange={(v) =>
                          updateDraft(activeIndex, {
                            difficulty: v as 'easy' | 'medium' | 'hard',
                          })
                        }
                      >
                        <SelectTrigger className="h-10 w-full text-[13px]">
                          <SelectValue placeholder="Select from Drop-down" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="mb-1.5 text-[12px] font-medium text-[#111827]">
                        Topic
                      </div>
                      <Select
                        value={
                          activeDraft.topicId ||
                          topicSelectOptions[0]?.value ||
                          ''
                        }
                        onValueChange={(v) =>
                          updateDraft(activeIndex, {
                            topicId: v,
                            subTopicId: '',
                          })
                        }
                        disabled={topicSelectOptions.length === 0}
                      >
                        <SelectTrigger className="h-10 w-full text-[13px]">
                          <SelectValue placeholder="Select from Drop-down" />
                        </SelectTrigger>
                        <SelectContent>
                          {topicSelectOptions.length === 0 ? (
                            <div className="px-2 py-2 text-[12px] text-[#6B7280]">
                              No topics on this test
                            </div>
                          ) : (
                            topicSelectOptions.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="mb-1.5 text-[12px] font-medium text-[#111827]">
                        Sub-topic
                      </div>
                      <Select
                        value={
                          activeDraft.subTopicId ||
                          subTopicSelectOptions[0]?.value ||
                          ''
                        }
                        onValueChange={(v) =>
                          updateDraft(activeIndex, { subTopicId: v })
                        }
                        disabled={subTopicSelectOptions.length === 0}
                      >
                        <SelectTrigger className="h-10 w-full text-[13px]">
                          <SelectValue placeholder="Select from Drop-down" />
                        </SelectTrigger>
                        <SelectContent>
                          {subTopicSelectOptions.length === 0 ? (
                            <div className="px-2 py-2 text-[12px] text-[#6B7280]">
                              No sub-topics on this test
                            </div>
                          ) : (
                            subTopicSelectOptions.map((st) => (
                              <SelectItem key={st.value} value={st.value}>
                                {st.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-[#E5E7EB] bg-white px-5 py-4">
                <button
                  type="button"
                  onClick={handleExitTestCreation}
                  className="inline-flex h-10 items-center rounded-md border border-[#FECACA] bg-[#FFF1F2] px-4 text-[12px] font-semibold text-[#EF4444] hover:bg-[#FFE4E6]"
                >
                  Exit Test Creation
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleArrowPrevious}
                    disabled={activeIndex === 0}
                    className="inline-flex size-9 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous question"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleArrowNext}
                    disabled={
                      activeIndex >= totalQuestions - 1
                    }
                    className="inline-flex size-9 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next question"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={bulkMutation.isPending}
                  onClick={() => void handleNext()}
                  className="inline-flex h-10 min-w-[100px] items-center justify-center rounded-md bg-[#5B7CFA] px-10 text-[12px] font-semibold text-white hover:bg-[#4A6EFF] disabled:opacity-60"
                >
                  {bulkMutation.isPending ? 'Saving…' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={deleteAllEditsOpen} onOpenChange={setDeleteAllEditsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete all edits?</DialogTitle>
            <DialogDescription>
              This will clear the current question text, all options, solution,
              and any attached image for Question {activeIndex + 1}. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setDeleteAllEditsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="button"
              onClick={handleConfirmDeleteAllEdits}
            >
              Delete All Edits
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {toastMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[10000] -translate-x-1/2 rounded-md bg-[#111827] px-4 py-2.5 text-[13px] font-medium text-white shadow-lg"
        >
          {toastMessage}
        </div>
      ) : null}
    </PageContainer>
  );
}
