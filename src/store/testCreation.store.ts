import { create } from 'zustand';
import { questionsReturnPath, type TestFlowMode } from '@/lib/testFlow';
import {
  testFormValuesToMetaPatch,
  type TestCreationFormValues,
} from '@/lib/testFormHydration';
import type { TestEntity } from '@/types/test.types';

export type Difficulty = 'easy' | 'medium' | 'difficult';

const CURRENT_TEST_ID_KEY = 'current_test_id';

export interface TestMeta {
  testType: string;
  subjectId: string;
  topicIds: string[];
  subTopicIds: string[];
  nameOfTest: string;
  durationMinutes: number;
  difficulty: Difficulty;
  markingScheme: {
    wrongAnswer: number;
    unattempted: number;
    correctAnswer: number;
    noOfQuestions: number;
    totalMarks: number;
  };
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionDraft {
  id: string;
  prompt: string;
  options: QuestionOption[];
  correctOptionId: string | null;
  solution: string;
  difficulty: Difficulty;
  topic: string;
  subTopic: string;
}

export type TestCreationStep =
  | 'create-test'
  | 'question-creation'
  | 'confirmation';

export type PublishMode = 'publish-now' | 'schedule-publish';

export type LiveUntil =
  | 'always-available'
  | 'one-week'
  | 'two-weeks'
  | 'three-weeks'
  | 'one-month'
  | 'custom-duration';

export interface PublishSettings {
  mode: PublishMode;
  scheduleDate: string; // yyyy-mm-dd
  scheduleTime: string; // hh:mm
  liveUntil: LiveUntil;
  customEndDate: string; // yyyy-mm-dd
  customEndTime: string; // hh:mm
}

interface TestCreationState {
  step: TestCreationStep;
  currentTestId: string | null;
  currentTest: TestEntity | null;
  /** create = wizard; edit = Test Tracking edit; view = read-only preview */
  testFlowMode: TestFlowMode;
  meta: TestMeta;
  questions: QuestionDraft[];
  activeQuestionId: string | null;
  publish: PublishSettings;
  isEditModalOpen: boolean;
  isSaving: boolean;
  /** When set, Cancel on test creation navigates here (e.g. /test-tracking). */
  returnToPath: string | null;
  /** Bumped on reset/beginCreateFlow so the create form re-initializes. */
  createSessionKey: number;
}

interface TestCreationActions {
  goTo: (step: TestCreationStep) => void;
  setCurrentTestId: (testId: string | null, options?: { persist?: boolean }) => void;
  /** Fresh create wizard — clears edit/view session and form-related state. */
  beginCreateFlow: () => void;
  /** Edit test metadata while adding questions; Cancel returns to questions without reset. */
  enterWizardEdit: (testId: string) => void;
  setCurrentTest: (test: TestEntity | null) => void;
  setTestFlowMode: (mode: TestFlowMode) => void;
  setMeta: (meta: Partial<TestMeta>) => void;
  addQuestion: () => void;
  setActiveQuestion: (id: string) => void;
  updateQuestion: (id: string, patch: Partial<QuestionDraft>) => void;
  deleteQuestion: (id: string) => void;
  setPublish: (patch: Partial<PublishSettings>) => void;
  openEditModal: () => void;
  closeEditModal: () => void;
  saveEditModal: () => Promise<void>;
  setReturnToPath: (path: string | null) => void;
  /** Sync Zustand meta from hydrated test form values (edit / tracking flows). */
  applyTestFormHydration: (values: TestCreationFormValues) => void;
  reset: () => void;
}

const defaultMeta: TestMeta = {
  testType: '',
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
};

const defaultPublish: PublishSettings = {
  mode: 'publish-now',
  scheduleDate: '',
  scheduleTime: '',
  liveUntil: 'always-available',
  customEndDate: '',
  customEndTime: '',
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function newQuestion(): QuestionDraft {
  const a = uid('opt');
  const b = uid('opt');
  const c = uid('opt');
  const d = uid('opt');

  return {
    id: uid('q'),
    prompt: '',
    options: [
      { id: a, text: '' },
      { id: b, text: '' },
      { id: c, text: '' },
      { id: d, text: '' },
    ],
    correctOptionId: null,
    solution: '',
    difficulty: 'easy',
    topic: '',
    subTopic: '',
  };
}

export const useTestCreationStore = create<TestCreationState & TestCreationActions>(
  (set) => ({
    step: 'create-test',
    currentTestId: null,
    currentTest: null,
    testFlowMode: 'create',
    createSessionKey: 0,
    meta: defaultMeta,
    questions: [newQuestion()],
    activeQuestionId: null,
    publish: defaultPublish,
    isEditModalOpen: false,
    isSaving: false,
    returnToPath: null,

    goTo: (step) => set({ step }),
    setReturnToPath: (path) => set({ returnToPath: path }),
    applyTestFormHydration: (values) =>
      set((s) => {
        const patch = testFormValuesToMetaPatch(values);
        return {
          meta: {
            ...s.meta,
            ...patch,
            markingScheme: {
              ...s.meta.markingScheme,
              ...patch.markingScheme,
            },
          },
        };
      }),
    setTestFlowMode: (mode) => set({ testFlowMode: mode }),
    setCurrentTestId: (testId, options) => {
      if (testId && options?.persist) {
        localStorage.setItem(CURRENT_TEST_ID_KEY, testId);
      } else {
        localStorage.removeItem(CURRENT_TEST_ID_KEY);
      }
      set({ currentTestId: testId });
    },
    beginCreateFlow: () => {
      localStorage.removeItem(CURRENT_TEST_ID_KEY);
      set({
        step: 'create-test',
        currentTestId: null,
        currentTest: null,
        testFlowMode: 'create',
        meta: { ...defaultMeta, markingScheme: { ...defaultMeta.markingScheme } },
        questions: [newQuestion()],
        activeQuestionId: null,
        publish: defaultPublish,
        isEditModalOpen: false,
        isSaving: false,
        returnToPath: null,
        createSessionKey: Date.now(),
      });
    },
    enterWizardEdit: (testId) => {
      localStorage.removeItem(CURRENT_TEST_ID_KEY);
      set({
        step: 'create-test',
        currentTestId: testId,
        testFlowMode: 'edit',
        returnToPath: questionsReturnPath(testId),
        isEditModalOpen: false,
      });
    },
    setCurrentTest: (test) => set({ currentTest: test }),
    setMeta: (meta) =>
      set((s) => ({
        meta: { ...s.meta, ...meta, markingScheme: { ...s.meta.markingScheme, ...(meta as any).markingScheme } },
      })),

    addQuestion: () =>
      set((s) => {
        const q = newQuestion();
        return {
          questions: [...s.questions, q],
          activeQuestionId: q.id,
        };
      }),

    setActiveQuestion: (id) => set({ activeQuestionId: id }),

    updateQuestion: (id, patch) =>
      set((s) => ({
        questions: s.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
      })),

    deleteQuestion: (id) =>
      set((s) => {
        const next = s.questions.filter((q) => q.id !== id);
        const active =
          s.activeQuestionId === id ? (next[0]?.id ?? null) : s.activeQuestionId;
        return { questions: next, activeQuestionId: active };
      }),

    setPublish: (patch) =>
      set((s) => ({
        publish: { ...s.publish, ...patch },
      })),

    openEditModal: () => set({ isEditModalOpen: true }),
    closeEditModal: () => set({ isEditModalOpen: false }),
    saveEditModal: async () => {
      set({ isSaving: true });
      try {
        // mock save delay
        await new Promise((r) => setTimeout(r, 450));
        set({ isEditModalOpen: false });
      } finally {
        set({ isSaving: false });
      }
    },

    reset: () => {
      useTestCreationStore.getState().beginCreateFlow();
    },
  }),
);

