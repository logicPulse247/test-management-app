import { useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSubjectsQuery, useSubTopicsByTopicsQuery, useTopicsBySubjectQuery } from '@/queries/catalog.queries';
import { useCreateTestMutation, useTestByIdQuery, useTestsQuery, useUpdateTestMutation } from '@/queries/tests.queries';
import { useTestCreationStore } from '@/store/testCreation.store';
import { TEST_STATUS } from '@/constants/testStatus';
import {
  getCreateTestNameError,
  getErrorMessage,
} from '@/lib/api';
import {
  buildCatalogOptionsFromRefs,
  mergeSelectOptions,
  parseTestRefList,
  resolveSubjectId,
  toMultiSelectOptions,
} from '@/lib/catalog';
import type { CreateTestPayload, UpdateTestPayload } from '@/types/test.types';
import { resolveTopicIdsFromTestEntity } from '@/lib/testEntity';
import { isQuestionsReturnPath } from '@/lib/testFlow';
import {
  buildCreateTestFormValuesFromEntity,
  type TestCreationFormValues,
} from '@/lib/testFormHydration';

const createTestSchema = z.object({
  nameOfTest: z
    .string()
    .trim()
    .min(1, 'Test Name is required'),
  testType: z.string().min(1, 'Test Type is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  topicIds: z.array(z.string()).min(1, 'Topic is required'),
  subTopicIds: z.array(z.string()).min(1, 'Sub Topic is required'),
  durationMinutes: z.number().min(1, 'Duration is required'),
  difficulty: z.enum(['easy', 'medium', 'difficult']),
  correctMarks: z.number(),
  wrongMarks: z.number(),
  unattemptMarks: z.number(),
  totalQuestions: z.number().min(1, 'Total Questions is required'),
  totalMarks: z.number().min(0, 'Total Marks is required'),
});

type CreateTestFormValues = z.infer<typeof createTestSchema>;

const editTestSchema = z.object({
  subjectId: z.string().min(1, 'Subject is required'),
  topicIds: z.array(z.string()).min(1, 'Select at least one topic'),
  subTopicIds: z.array(z.string()).min(1, 'Select at least one sub-topic'),
  name: z.string().min(1, 'Test name is required'),
  durationMinutes: z.number().min(1, 'Duration is required'),
  difficulty: z.enum(['easy', 'medium', 'difficult']),
  correctMarks: z.number(),
  wrongMarks: z.number(),
  unattemptMarks: z.number(),
  totalQuestions: z.number().min(1),
  totalMarks: z.number().min(0),
});

type EditTestFormValues = z.infer<typeof editTestSchema>;

function mapFormDifficultyToApi(
  difficulty: CreateTestFormValues['difficulty'],
): string {
  return difficulty === 'difficult' ? 'hard' : difficulty;
}

function buildTestWritePayload(
  values: CreateTestFormValues,
  options?: { status?: string },
): CreateTestPayload {
  return {
    name: values.nameOfTest.trim(),
    type: values.testType,
    subject: values.subjectId,
    topics: values.topicIds,
    sub_topics: values.subTopicIds,
    correct_marks: Number(values.correctMarks),
    wrong_marks: Number(values.wrongMarks),
    unattempt_marks: Number(values.unattemptMarks),
    difficulty: mapFormDifficultyToApi(values.difficulty),
    total_time: Number(values.durationMinutes),
    total_marks: Number(values.totalMarks),
    total_questions: Number(values.totalQuestions),
    status: (options?.status as CreateTestPayload['status']) ?? TEST_STATUS.DRAFT,
  };
}

export default function TestCreationPage() {
  const navigate = useNavigate();
  const meta = useTestCreationStore((s) => s.meta);
  const setMeta = useTestCreationStore((s) => s.setMeta);
  const currentTestId = useTestCreationStore((s) => s.currentTestId);
  const testFlowMode = useTestCreationStore((s) => s.testFlowMode);
  const setTestFlowMode = useTestCreationStore((s) => s.setTestFlowMode);
  const isEditFlow = testFlowMode === 'edit';
  const currentTest = useTestCreationStore((s) => s.currentTest);
  const setCurrentTest = useTestCreationStore((s) => s.setCurrentTest);
  const setCurrentTestId = useTestCreationStore((s) => s.setCurrentTestId);
  const openEditModal = useTestCreationStore((s) => s.openEditModal);
  const closeEditModal = useTestCreationStore((s) => s.closeEditModal);
  const isEditModalOpen = useTestCreationStore((s) => s.isEditModalOpen);
  const returnToPath = useTestCreationStore((s) => s.returnToPath);
  const setReturnToPath = useTestCreationStore((s) => s.setReturnToPath);
  const reset = useTestCreationStore((s) => s.reset);
  const applyTestFormHydration = useTestCreationStore(
    (s) => s.applyTestFormHydration,
  );
  const createSessionKey = useTestCreationStore((s) => s.createSessionKey);

  function handleCancelCreate() {
    if (isEditFlow && returnToPath) {
      const destination = returnToPath;
      if (isQuestionsReturnPath(returnToPath)) {
        setTestFlowMode('create');
        setReturnToPath(null);
        navigate(destination);
        return;
      }
      reset();
      navigate(destination);
      return;
    }
    if (currentTestId && isQuestionsReturnPath(`/questions/${currentTestId}`)) {
      navigate(`/questions/${currentTestId}`);
      return;
    }
    reset();
  }

  const testsQuery = useTestsQuery();
  const availableTypes = useMemo(() => {
    const types = (testsQuery.data ?? [])
      .map((t) => (t.type ? String(t.type) : ''))
      .filter(Boolean);
    return Array.from(new Set(types));
  }, [testsQuery.data]);

  function pickTypeForLabel(label: string): string {
    const l = label.toLowerCase();
    const types = availableTypes;
    const by = (pred: (t: string) => boolean) => types.find(pred) ?? '';

    if (l.includes('chapter')) return by((t) => t.toLowerCase().includes('chapter')) || types[0] || '';
    if (l.includes('pyq')) return by((t) => t.toLowerCase().includes('pyq') || t.toLowerCase().includes('previous')) || types[0] || '';
    if (l.includes('mock')) return by((t) => t.toLowerCase().includes('mock')) || types[0] || '';
    if (l.includes('page')) return by((t) => t.toLowerCase().includes('page')) || types[0] || '';
    return types[0] || '';
  }

  const tabs = useMemo(
    () => [
      { key: 'chapter-wise', label: 'Chapter Wise' },
      { key: 'pyq', label: 'PYQ' },
      { key: 'mock-test', label: 'Mock Test' },
    ],
    [],
  );

  const [activeTypeTab, setActiveTypeTab] = useState('chapter-wise');

  const testQuery = useTestByIdQuery(currentTestId);
  useEffect(() => {
    if (testQuery.data) {
      setCurrentTest(testQuery.data);
    }
  }, [setCurrentTest, testQuery.data]);

  const subjectsQuery = useSubjectsQuery();

  const updateMutation = useUpdateTestMutation(currentTestId || '');
  const createMutation = useCreateTestMutation();

  const [createError, setCreateError] = useState<string | null>(null);
  const lastHydratedKeyRef = useRef<string | null>(null);

  const createForm = useForm<CreateTestFormValues>({
    resolver: zodResolver(createTestSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: {
      nameOfTest: meta.nameOfTest,
      testType: meta.testType,
      subjectId: meta.subjectId,
      topicIds: meta.topicIds,
      subTopicIds: meta.subTopicIds,
      durationMinutes: meta.durationMinutes,
      difficulty: meta.difficulty,
      correctMarks: meta.markingScheme.correctAnswer,
      wrongMarks: meta.markingScheme.wrongAnswer,
      unattemptMarks: meta.markingScheme.unattempted,
      totalQuestions: meta.markingScheme.noOfQuestions,
      totalMarks: meta.markingScheme.totalMarks,
    },
  });

  useEffect(() => {
    if (meta.testType) return;
    if (!availableTypes.length) return;
    const picked = pickTypeForLabel(tabs[0]?.label ?? 'Chapter Wise');
    if (!picked) return;
    setMeta({ testType: picked });
    createForm.setValue('testType', picked, { shouldValidate: false });
  }, [availableTypes.length, createForm, meta.testType, setMeta, tabs]);

  // Fresh create session — clear react-hook-form when store discards edit/view state
  useEffect(() => {
    if (testFlowMode !== 'create' || currentTestId) return;

    lastHydratedKeyRef.current = null;
    const defaultType =
      meta.testType ||
      pickTypeForLabel(tabs[0]?.label ?? 'Chapter Wise') ||
      availableTypes[0] ||
      '';

    createForm.reset({
      nameOfTest: '',
      testType: defaultType,
      subjectId: '',
      topicIds: [],
      subTopicIds: [],
      durationMinutes: 60,
      difficulty: 'easy',
      correctMarks: 5,
      wrongMarks: -1,
      unattemptMarks: 0,
      totalQuestions: 50,
      totalMarks: 250,
    });
    setMeta({
      testType: defaultType,
      subjectId: '',
      topicIds: [],
      subTopicIds: [],
      nameOfTest: '',
      durationMinutes: 60,
      difficulty: 'easy',
      markingScheme: {
        wrongAnswer: -1,
        unattempted: 0,
        correctAnswer: 5,
        noOfQuestions: 50,
        totalMarks: 250,
      },
    });
    setActiveTypeTab('chapter-wise');
  }, [createSessionKey, testFlowMode, currentTestId]);

  const form = useForm<EditTestFormValues>({
    resolver: zodResolver(editTestSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: {
      subjectId: '',
      topicIds: [],
      subTopicIds: [],
      name: '',
      durationMinutes: 60,
      difficulty: 'easy',
      correctMarks: 5,
      wrongMarks: -1,
      unattemptMarks: 0,
      totalQuestions: 50,
      totalMarks: 250,
    },
  });

  const hydratedTest = testQuery.data ?? currentTest;

  const editHydrationSubjectId = useMemo(() => {
    if (!isEditFlow || !hydratedTest) return '';
    return (
      resolveSubjectId(
        hydratedTest.subject,
        subjectsQuery.data ?? [],
      ) ?? ''
    );
  }, [hydratedTest, isEditFlow, subjectsQuery.data]);

  const createSubjectId = createForm.watch('subjectId');
  const createTopicIds = createForm.watch('topicIds');
  const createSubTopicIds = createForm.watch('subTopicIds');
  const effectiveCreateSubjectId =
    createSubjectId || editHydrationSubjectId || '';

  const createTopicsBySubjectQuery = useTopicsBySubjectQuery(
    effectiveCreateSubjectId || null,
  );

  const editHydrationTopicIds = useMemo(() => {
    if (!isEditFlow || !hydratedTest || !subjectsQuery.data?.length) return [];
    return buildCreateTestFormValuesFromEntity(hydratedTest, {
      subjects: subjectsQuery.data,
      topicCatalog: createTopicsBySubjectQuery.data ?? [],
      fallbackTestType: meta.testType || availableTypes[0] || '',
    }).topicIds;
  }, [
    availableTypes,
    createTopicsBySubjectQuery.data,
    hydratedTest,
    isEditFlow,
    meta.testType,
    subjectsQuery.data,
  ]);

  const effectiveCreateTopicIds =
    createTopicIds.length > 0 ? createTopicIds : editHydrationTopicIds;

  const createSubTopicsByTopicsQuery = useSubTopicsByTopicsQuery(
    effectiveCreateTopicIds,
  );

  const editHydrationFormValues = useMemo((): TestCreationFormValues | null => {
    if (!isEditFlow || !hydratedTest?.id || !subjectsQuery.data?.length) {
      return null;
    }
    return buildCreateTestFormValuesFromEntity(hydratedTest, {
      subjects: subjectsQuery.data,
      topicCatalog: createTopicsBySubjectQuery.data ?? [],
      subTopicCatalog: createSubTopicsByTopicsQuery.data ?? [],
      fallbackTestType: meta.testType || availableTypes[0] || '',
    });
  }, [
    availableTypes,
    createSubTopicsByTopicsQuery.data,
    createTopicsBySubjectQuery.data,
    hydratedTest,
    isEditFlow,
    meta.testType,
    subjectsQuery.data,
  ]);

  const displaySubjectId =
    createSubjectId || editHydrationFormValues?.subjectId || editHydrationSubjectId || '';
  const displayTopicIds =
    createTopicIds.length > 0
      ? createTopicIds
      : (editHydrationFormValues?.topicIds ?? editHydrationTopicIds);
  const displaySubTopicIds =
    createSubTopicIds.length > 0
      ? createSubTopicIds
      : (editHydrationFormValues?.subTopicIds ?? []);

  const createTopicOptions = useMemo(() => {
    if (!effectiveCreateSubjectId) return [];
    const fromCatalog = toMultiSelectOptions(
      createTopicsBySubjectQuery.data ?? [],
    );
    const fromTest =
      isEditFlow && hydratedTest
        ? buildCatalogOptionsFromRefs(
            parseTestRefList(hydratedTest.topics),
            createTopicsBySubjectQuery.data ?? [],
          )
        : [];
    return mergeSelectOptions(fromTest, fromCatalog);
  }, [
    createTopicsBySubjectQuery.data,
    effectiveCreateSubjectId,
    hydratedTest,
    isEditFlow,
  ]);

  const createSubTopicOptions = useMemo(() => {
    if (!effectiveCreateTopicIds.length) return [];
    const fromCatalog = toMultiSelectOptions(
      createSubTopicsByTopicsQuery.data ?? [],
    );
    const fromTest =
      isEditFlow && hydratedTest
        ? buildCatalogOptionsFromRefs(
            parseTestRefList(hydratedTest.sub_topics),
            createSubTopicsByTopicsQuery.data ?? [],
          )
        : [];
    return mergeSelectOptions(fromTest, fromCatalog);
  }, [
    createSubTopicsByTopicsQuery.data,
    effectiveCreateTopicIds.length,
    hydratedTest,
    isEditFlow,
  ]);

  const watchedSubjectId = form.watch('subjectId');
  const watchedTopicIds = form.watch('topicIds');
  const effectiveEditSubjectId =
    watchedSubjectId || editHydrationSubjectId || '';

  const topicsBySubjectQuery = useTopicsBySubjectQuery(
    effectiveEditSubjectId || null,
  );

  const editModalHydrationTopicIds = useMemo(() => {
    if (!isEditFlow || !hydratedTest) return [];
    return resolveTopicIdsFromTestEntity(
      hydratedTest,
      topicsBySubjectQuery.data ?? [],
    );
  }, [hydratedTest, isEditFlow, topicsBySubjectQuery.data]);

  const effectiveEditTopicIds =
    watchedTopicIds.length > 0 ? watchedTopicIds : editModalHydrationTopicIds;
  const subTopicsByTopicsQuery = useSubTopicsByTopicsQuery(effectiveEditTopicIds);

  const editTopicOptions = useMemo(() => {
    const fromCatalog = toMultiSelectOptions(topicsBySubjectQuery.data ?? []);
    const fromTest =
      isEditFlow && hydratedTest
        ? buildCatalogOptionsFromRefs(
            parseTestRefList(hydratedTest.topics),
            topicsBySubjectQuery.data ?? [],
          )
        : [];
    return mergeSelectOptions(fromTest, fromCatalog);
  }, [hydratedTest, isEditFlow, topicsBySubjectQuery.data]);

  const editSubTopicOptions = useMemo(() => {
    if (!effectiveEditTopicIds.length) return [];
    const fromCatalog = toMultiSelectOptions(subTopicsByTopicsQuery.data ?? []);
    const fromTest =
      isEditFlow && hydratedTest
        ? buildCatalogOptionsFromRefs(
            parseTestRefList(hydratedTest.sub_topics),
            subTopicsByTopicsQuery.data ?? [],
          )
        : [];
    return mergeSelectOptions(fromTest, fromCatalog);
  }, [
    effectiveEditTopicIds.length,
    hydratedTest,
    isEditFlow,
    subTopicsByTopicsQuery.data,
  ]);

  function syncMetaFromFormValues(values: CreateTestFormValues) {
    setMeta({
      nameOfTest: values.nameOfTest,
      testType: values.testType,
      subjectId: values.subjectId,
      topicIds: values.topicIds,
      subTopicIds: values.subTopicIds,
      durationMinutes: values.durationMinutes,
      difficulty: values.difficulty,
      markingScheme: {
        ...meta.markingScheme,
        correctAnswer: values.correctMarks,
        wrongAnswer: values.wrongMarks,
        unattempted: values.unattemptMarks,
        noOfQuestions: values.totalQuestions,
        totalMarks: values.totalMarks,
      },
    });
  }

  const prevSubjectIdRef = useRef<string | null>(null);
  const prevTopicKeyRef = useRef<string>('');

  useEffect(() => {
    lastHydratedKeyRef.current = null;
  }, [currentTestId]);

  // Populate main create form + edit modal from GET /tests/:id in edit mode
  useEffect(() => {
    if (!isEditFlow || !currentTestId || !hydratedTest?.id) return;
    if (hydratedTest.id !== currentTestId) return;
    if (!subjectsQuery.data?.length) return;

    const formValues = buildCreateTestFormValuesFromEntity(hydratedTest, {
      subjects: subjectsQuery.data,
      topicCatalog: createTopicsBySubjectQuery.data ?? [],
      subTopicCatalog: createSubTopicsByTopicsQuery.data ?? [],
      fallbackTestType: meta.testType || availableTypes[0] || '',
    });

    const hydrationKey = JSON.stringify(formValues);
    if (lastHydratedKeyRef.current === hydrationKey) return;
    lastHydratedKeyRef.current = hydrationKey;

    console.log('Edit Test Response', hydratedTest);
    console.log('Hydrating Test Form', formValues);

    applyTestFormHydration(formValues);
    createForm.reset(formValues);
    syncMetaFromFormValues(formValues);

    console.log('Form Values After Hydration', createForm.getValues());

    if (isEditModalOpen) {
      form.reset({
        subjectId: formValues.subjectId,
        topicIds: formValues.topicIds,
        subTopicIds: formValues.subTopicIds,
        name: formValues.nameOfTest,
        durationMinutes: formValues.durationMinutes,
        difficulty: formValues.difficulty,
        correctMarks: formValues.correctMarks,
        wrongMarks: formValues.wrongMarks,
        unattemptMarks: formValues.unattemptMarks,
        totalQuestions: formValues.totalQuestions,
        totalMarks: formValues.totalMarks,
      });
      prevSubjectIdRef.current = formValues.subjectId;
      prevTopicKeyRef.current = formValues.topicIds.join('|');
    }
  }, [
    applyTestFormHydration,
    availableTypes,
    createForm,
    createSubTopicsByTopicsQuery.data,
    createTopicsBySubjectQuery.data,
    currentTestId,
    form,
    hydratedTest,
    isEditModalOpen,
    isEditFlow,
    meta.testType,
    subjectsQuery.data,
  ]);

  useEffect(() => {
    if (!isEditFlow) {
      lastHydratedKeyRef.current = null;
    }
  }, [isEditFlow]);

  // Cascade resets (only on user-driven changes while modal open)
  useEffect(() => {
    if (!isEditModalOpen) return;

    const prev = prevSubjectIdRef.current;
    prevSubjectIdRef.current = watchedSubjectId || null;
    if (prev === null) return; // initial open/populate
    if (prev !== watchedSubjectId) {
      form.setValue('topicIds', [], { shouldValidate: false });
      form.setValue('subTopicIds', [], { shouldValidate: false });
      form.clearErrors(['topicIds', 'subTopicIds']);
    }
  }, [form, isEditModalOpen, watchedSubjectId]);

  useEffect(() => {
    if (!isEditModalOpen) return;

    const key = watchedTopicIds.join('|');
    const prev = prevTopicKeyRef.current;
    prevTopicKeyRef.current = key;
    if (!prev) return; // initial open/populate
    if (prev !== key) {
      form.setValue('subTopicIds', [], { shouldValidate: false });
      form.clearErrors('subTopicIds');
    }
  }, [form, isEditModalOpen, watchedTopicIds]);

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[14px] font-semibold text-[#111827]">Test Creation</div>
      </div>

      <div className="">
        <div className="flex items-center justify-between border border-[#D1D5DB] px-3 py-1.5 rounded-xl max-w-[335px]">
          <div className="flex items-center gap-4">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                className={cn(
                  'text-[#9CA3AF] text-sm font-medium px-3.5 py-2.25 ',
                  activeTypeTab === t.key && ' bg-[#F8FAFF] text-[#384EC7] rounded-lg',
                )}
                onClick={() => {
                  setActiveTypeTab(t.key);
                  const picked = pickTypeForLabel(t.label);
                  if (picked) {
                    setMeta({ testType: picked });
                    createForm.setValue('testType', picked, { shouldValidate: false });
                  }
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step screens */}
        <div>
          <div className="py-5">
            {createError ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700">
                {createError}
              </div>
            ) : null}

            <form
              onSubmit={createForm.handleSubmit(
                async (values) => {
                  setCreateError(null);
                  syncMetaFromFormValues(values);

                  const existingStatus = String(
                    hydratedTest?.status ?? TEST_STATUS.DRAFT,
                  );

                  try {
                    if (isEditFlow && currentTestId) {
                      const updatePayload: UpdateTestPayload =
                        buildTestWritePayload(values, {
                          status: existingStatus,
                        });
                      const updated = await updateMutation.mutateAsync(
                        updatePayload,
                      );
                      setCurrentTest(updated);
                      lastHydratedKeyRef.current = null;
                      const destination = returnToPath ?? '/test-tracking';
                      if (isQuestionsReturnPath(returnToPath)) {
                        setTestFlowMode('create');
                      }
                      setReturnToPath(null);
                      navigate(destination);
                      return;
                    }

                    const createPayload = buildTestWritePayload(values, {
                      status: TEST_STATUS.DRAFT,
                    });
                    const created = await createMutation.mutateAsync(createPayload);

                    if (!created?.id) {
                      throw new Error('Test created but id is missing in response.');
                    }

                    setTestFlowMode('create');
                    setCurrentTestId(created.id, { persist: true });
                    setCurrentTest(created);
                    navigate(`/questions/${created.id}`);
                  } catch (e: unknown) {
                    if (!isEditFlow) {
                      const nameError = getCreateTestNameError(e);
                      if (nameError) {
                        createForm.setError('nameOfTest', {
                          type: 'server',
                          message: nameError,
                        });
                        setCreateError(null);
                        return;
                      }
                    }
                    setCreateError(
                      getErrorMessage(
                        e,
                        isEditFlow
                          ? 'Failed to update test. Please try again.'
                          : 'Failed to create test. Please try again.',
                      ),
                    );
                  }
                },
                (errors) => {
                  console.log('FORM SUBMITTED');
                  console.log('formState.errors', errors);
                  setCreateError('Please fix validation errors and try again.');
                },
              )}
            >
              <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-[12px] font-medium text-[#111827]">
                  Subject
                </div>
                <Select
                  value={displaySubjectId}
                  onValueChange={(v) => {
                    createForm.setValue('subjectId', v, { shouldValidate: false });
                    createForm.setValue('topicIds', [], { shouldValidate: false });
                    createForm.setValue('subTopicIds', [], { shouldValidate: false });
                    createForm.clearErrors(['topicIds', 'subTopicIds']);
                    setMeta({ subjectId: v, topicIds: [], subTopicIds: [] });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose from Drop down" />
                  </SelectTrigger>
                  <SelectContent>
                    {(subjectsQuery.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.subjectId ? (
                  <div className="mt-1 text-[12px] text-red-600">
                    {createForm.formState.errors.subjectId.message}
                  </div>
                ) : null}
              </div>

              <div>
                <div className="mb-2 text-[12px] font-medium text-[#111827]">
                  Name of Test
                </div>
                <Input
                  value={createForm.watch('nameOfTest')}
                  onChange={(e) => {
                    createForm.setValue('nameOfTest', e.target.value, {
                      shouldValidate: true,
                    });
                    createForm.clearErrors('nameOfTest');
                    setCreateError(null);
                    setMeta({ nameOfTest: e.target.value });
                  }}
                  placeholder="Enter name of test"
                  className={cn(
                    createForm.formState.errors.nameOfTest &&
                      'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                  )}
                  aria-invalid={Boolean(createForm.formState.errors.nameOfTest)}
                />
                {createForm.formState.errors.nameOfTest ? (
                  <div className="mt-1 text-[12px] text-red-600">
                    {createForm.formState.errors.nameOfTest.message}
                  </div>
                ) : null}
              </div>

              <div>
                <div className="mb-2 text-[12px] font-medium text-[#111827]">
                  Topic
                </div>
                <MultiSelect
                  value={displayTopicIds}
                  onChange={(next) => {
                    createForm.setValue('topicIds', next, { shouldValidate: false });
                    createForm.setValue('subTopicIds', [], { shouldValidate: false });
                    createForm.clearErrors('subTopicIds');
                    setMeta({ topicIds: next, subTopicIds: [] });
                  }}
                  placeholder="Choose from Drop down"
                  options={createTopicOptions}
                  disabled={!displaySubjectId}
                />
                {createForm.formState.errors.topicIds ? (
                  <div className="mt-1 text-[12px] text-red-600">
                    {createForm.formState.errors.topicIds.message as any}
                  </div>
                ) : null}
              </div>

              <div>
                <div className="mb-2 text-[12px] font-medium text-[#111827]">
                  Sub Topic
                </div>
                <MultiSelect
                  value={displaySubTopicIds}
                  onChange={(next) => {
                    createForm.setValue('subTopicIds', next, { shouldValidate: false });
                    setMeta({ subTopicIds: next });
                  }}
                  placeholder="Choose from Drop down"
                  options={createSubTopicOptions}
                  disabled={displayTopicIds.length === 0}
                />
                {createForm.formState.errors.subTopicIds ? (
                  <div className="mt-1 text-[12px] text-red-600">
                    {createForm.formState.errors.subTopicIds.message as any}
                  </div>
                ) : null}
              </div>

              <div>
                <div className="mb-2 text-[12px] font-medium text-[#111827]">
                  Duration (Minutes)
                </div>
                <Input
                  type="number"
                  value={createForm.watch('durationMinutes')}
                  onChange={(e) => {
                    const n = Number(e.target.value || 0);
                    createForm.setValue('durationMinutes', n, { shouldValidate: true });
                    setMeta({ durationMinutes: n });
                  }}
                  placeholder="Enter Duration"
                />
                {createForm.formState.errors.durationMinutes ? (
                  <div className="mt-1 text-[12px] text-red-600">
                    {createForm.formState.errors.durationMinutes.message}
                  </div>
                ) : null}
              </div>

              <div>
                <div className="mb-2 text-[12px] font-medium text-[#111827]">
                  Test Difficulty Level
                </div>
                <div className="flex items-center gap-6 pt-1 text-[12px] text-[#111827]">
                  {(['easy', 'medium', 'difficult'] as const).map((d) => (
                    <label key={d} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={createForm.watch('difficulty') === d}
                        onChange={() => {
                          createForm.setValue('difficulty', d, { shouldValidate: true });
                          setMeta({ difficulty: d });
                        }}
                      />
                      {d === 'easy'
                        ? 'Easy'
                        : d === 'medium'
                          ? 'Medium'
                          : 'Difficult'}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 text-[12px] font-semibold text-[#111827]">
                Marking Scheme:
              </div>
              <div className="grid gap-3 md:grid-cols-5">
                <div>
                  <div className="mb-2 text-[11px] text-[#6B7280]">
                    Wrong Answer
                  </div>
                  <Input
                    type="number"
                      value={createForm.watch('wrongMarks')}
                      onChange={(e) => {
                        const n = Number(e.target.value || 0);
                        createForm.setValue('wrongMarks', n, { shouldValidate: true });
                        setMeta({
                          markingScheme: { ...meta.markingScheme, wrongAnswer: n },
                        });
                      }}
                  />
                </div>
                <div>
                  <div className="mb-2 text-[11px] text-[#6B7280]">
                    Unattempted
                  </div>
                  <Input
                    type="number"
                      value={createForm.watch('unattemptMarks')}
                      onChange={(e) => {
                        const n = Number(e.target.value || 0);
                        createForm.setValue('unattemptMarks', n, { shouldValidate: true });
                        setMeta({
                          markingScheme: { ...meta.markingScheme, unattempted: n },
                        });
                      }}
                  />
                </div>
                <div>
                  <div className="mb-2 text-[11px] text-[#6B7280]">
                    Correct Answer
                  </div>
                  <Input
                    type="number"
                      value={createForm.watch('correctMarks')}
                      onChange={(e) => {
                        const n = Number(e.target.value || 0);
                        createForm.setValue('correctMarks', n, { shouldValidate: true });
                        setMeta({
                          markingScheme: { ...meta.markingScheme, correctAnswer: n },
                        });
                      }}
                  />
                </div>
                <div>
                  <div className="mb-2 text-[11px] text-[#6B7280]">
                    No of Questions
                  </div>
                  <Input
                    type="number"
                      value={createForm.watch('totalQuestions')}
                      onChange={(e) => {
                        const n = Number(e.target.value || 0);
                        createForm.setValue('totalQuestions', n, { shouldValidate: true });
                        setMeta({
                          markingScheme: { ...meta.markingScheme, noOfQuestions: n },
                        });
                      }}
                  />
                </div>
                <div>
                  <div className="mb-2 text-[11px] text-[#6B7280]">
                    Total Marks
                  </div>
                  <Input
                    type="number"
                    value={createForm.watch('totalMarks')}
                    onChange={(e) => {
                      const n = Number(e.target.value || 0);
                      createForm.setValue('totalMarks', n, { shouldValidate: true });
                      setMeta({
                        markingScheme: { ...meta.markingScheme, totalMarks: n },
                      });
                    }}
                  />
                </div>
              </div>
            </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={handleCancelCreate}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={
                    isEditFlow
                      ? updateMutation.isPending
                      : createMutation.isPending
                  }
                >
                  {isEditFlow
                    ? updateMutation.isPending
                      ? 'Saving…'
                      : 'Save Changes'
                    : createMutation.isPending
                      ? 'Creating…'
                      : 'Next'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={(open) => (open ? openEditModal() : closeEditModal())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Test creation</DialogTitle>
          </DialogHeader>

          {!currentTestId ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
              No active test selected. Create a test first so it can be edited and saved.
            </div>
          ) : null}

          <form
            className="mt-4 grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              if (!currentTestId) return;

              const payload: UpdateTestPayload = {
                name: values.name.trim(),
                subject: values.subjectId,
                topics: values.topicIds,
                sub_topics: values.subTopicIds,
                difficulty: mapFormDifficultyToApi(values.difficulty),
                correct_marks: values.correctMarks,
                wrong_marks: values.wrongMarks,
                unattempt_marks: values.unattemptMarks,
                total_time: values.durationMinutes,
                total_questions: values.totalQuestions,
                total_marks: values.totalMarks,
                type: String(hydratedTest?.type ?? meta.testType ?? ''),
              };

              const updated = await updateMutation.mutateAsync(payload);
              lastHydratedKeyRef.current = null;
              createForm.setValue('nameOfTest', values.name, { shouldValidate: false });
              setCurrentTest(updated);
              // keep existing UI in sync until full migration off meta
              setMeta({
                subjectId: values.subjectId,
                topicIds: values.topicIds,
                subTopicIds: values.subTopicIds,
                nameOfTest: updated.name ?? meta.nameOfTest,
                durationMinutes: Number(updated.total_time ?? meta.durationMinutes),
                difficulty: (updated.difficulty as any) ?? meta.difficulty,
                markingScheme: {
                  ...meta.markingScheme,
                  wrongAnswer: Number(updated.wrong_marks ?? meta.markingScheme.wrongAnswer),
                  unattempted: Number(updated.unattempt_marks ?? meta.markingScheme.unattempted),
                  correctAnswer: Number(updated.correct_marks ?? meta.markingScheme.correctAnswer),
                  noOfQuestions: Number(updated.total_questions ?? meta.markingScheme.noOfQuestions),
                  totalMarks: Number(updated.total_marks ?? meta.markingScheme.totalMarks),
                },
              });
              closeEditModal();
            })}
          >
            <div className="md:col-span-2">
              <div className="mb-2 text-[12px] font-medium text-[#111827]">
                Subject
              </div>
              <Select
                value={form.watch('subjectId') || ''}
                onValueChange={(v) => {
                  form.setValue('subjectId', v, { shouldValidate: false });
                  form.setValue('topicIds', [], { shouldValidate: false });
                  form.setValue('subTopicIds', [], { shouldValidate: false });
                  form.clearErrors(['topicIds', 'subTopicIds']);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose from Drop-down" />
                </SelectTrigger>
                <SelectContent>
                  {(subjectsQuery.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.subjectId ? (
                <div className="mt-1 text-[12px] text-red-600">
                  {form.formState.errors.subjectId.message}
                </div>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <div className="mb-2 text-[12px] font-medium text-[#111827]">
                Topic
              </div>
              <MultiSelect
                value={form.watch('topicIds')}
                onChange={(next) => {
                  form.setValue('topicIds', next, { shouldValidate: false });
                  form.setValue('subTopicIds', [], { shouldValidate: false });
                  form.clearErrors('subTopicIds');
                }}
                placeholder="Choose from Drop-down"
                options={editTopicOptions}
                disabled={!form.watch('subjectId')}
              />
              {form.formState.errors.topicIds ? (
                <div className="mt-1 text-[12px] text-red-600">
                  {form.formState.errors.topicIds.message as any}
                </div>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <div className="mb-2 text-[12px] font-medium text-[#111827]">
                Sub Topic
              </div>
              <MultiSelect
                value={form.watch('subTopicIds')}
                onChange={(next) =>
                  form.setValue('subTopicIds', next, { shouldValidate: false })
                }
                placeholder="Choose from Drop-down"
                options={editSubTopicOptions}
                disabled={form.watch('topicIds').length === 0}
              />
              {form.formState.errors.subTopicIds ? (
                <div className="mt-1 text-[12px] text-red-600">
                  {form.formState.errors.subTopicIds.message as any}
                </div>
              ) : null}
            </div>

            <div>
              <div className="mb-2 text-[12px] font-medium text-[#111827]">
                Name of Test
              </div>
              <Input {...form.register('name')} placeholder="Enter name of Test" />
              {form.formState.errors.name ? (
                <div className="mt-1 text-[12px] text-red-600">
                  {form.formState.errors.name.message}
                </div>
              ) : null}
            </div>

            <div>
              <div className="mb-2 text-[12px] font-medium text-[#111827]">
                Duration (Minutes)
              </div>
              <Input
                type="number"
                {...form.register('durationMinutes', { valueAsNumber: true })}
              />
            </div>

            <div>
              <div className="mb-2 text-[12px] font-medium text-[#111827]">
                Test Difficulty Level
              </div>
              <Select
                value={form.watch('difficulty')}
                onValueChange={(v) => form.setValue('difficulty', v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="difficult">Difficult</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <div className="mt-2 text-[12px] font-semibold text-[#111827]">
                Marking Scheme:
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-5">
                <div>
                  <div className="mb-2 text-[11px] text-[#6B7280]">
                    Wrong Answer
                  </div>
                  <Input
                    type="number"
                    {...form.register('wrongMarks', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <div className="mb-2 text-[11px] text-[#6B7280]">
                    Unattempted
                  </div>
                  <Input
                    type="number"
                    {...form.register('unattemptMarks', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <div className="mb-2 text-[11px] text-[#6B7280]">
                    Correct Answer
                  </div>
                  <Input
                    type="number"
                    {...form.register('correctMarks', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <div className="mb-2 text-[11px] text-[#6B7280]">
                    Total Questions
                  </div>
                  <Input
                    type="number"
                    {...form.register('totalQuestions', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <div className="mb-2 text-[11px] text-[#6B7280]">
                    Total Marks
                  </div>
                  <Input
                    type="number"
                    {...form.register('totalMarks', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-3 md:col-span-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => closeEditModal()}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!currentTestId || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

