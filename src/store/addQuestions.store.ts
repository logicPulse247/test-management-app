import { create } from 'zustand';
import {
  clearPersistedAddQuestions,
  loadPersistedAddQuestions,
  savePersistedAddQuestions,
} from '@/lib/addQuestionsPersistence';
import {
  mergeRegistryImagesIntoDrafts,
  syncQuestionImageRegistry,
} from '@/lib/questionImageRegistry';
import { isDraftCompleteForSave } from '@/lib/questionDraft';
import type { QuestionImageAttachment } from '@/types/questionImage.types';

export type { QuestionImageAttachment };

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface QuestionDraftV2 {
  id: string;
  questionHtml: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  difficulty: QuestionDifficulty;
  topicId: string;
  subTopicId: string;
  isSaved: boolean;
  image?: QuestionImageAttachment;
}

interface AddQuestionsState {
  testId: string | null;
  drafts: QuestionDraftV2[];
  activeIndex: number;
}

interface AddQuestionsActions {
  initForTest: (testId: string, totalQuestions: number) => void;
  /** Replace drafts from GET test + fetchBulk (edit from Test Tracking). */
  hydrateDraftsFromApi: (
    testId: string,
    drafts: QuestionDraftV2[],
    options?: { clearPersisted?: boolean },
  ) => void;
  setActiveIndex: (idx: number) => void;
  updateDraft: (idx: number, patch: Partial<QuestionDraftV2>) => void;
  addAnother: () => void;
  /**
   * Merge CSV rows into empty draft slots only.
   * Never changes the configured question count (drafts length).
   */
  importCsvDrafts: (
    incoming: QuestionDraftV2[],
    defaults?: { topicId?: string; subTopicId?: string },
  ) => number;
  markSaved: (idx: number) => void;
  reset: () => void;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function cloneImage(
  image: QuestionImageAttachment | undefined,
): QuestionImageAttachment | undefined {
  if (!image?.imageData?.trim()) return undefined;
  return {
    imageName: String(image.imageName ?? ''),
    imageType: String(image.imageType ?? ''),
    imageSize: Number(image.imageSize ?? 0),
    imageData: String(image.imageData ?? ''),
  };
}

function cloneDraft(d: QuestionDraftV2): QuestionDraftV2 {
  const opts = Array.isArray(d.options) ? d.options : [];
  const cloned: QuestionDraftV2 = {
    ...d,
    questionHtml: String(d.questionHtml ?? ''),
    options: [
      String(opts[0] ?? ''),
      String(opts[1] ?? ''),
      String(opts[2] ?? ''),
      String(opts[3] ?? ''),
    ] as [string, string, string, string],
    correctIndex: (Number(d.correctIndex) || 0) as 0 | 1 | 2 | 3,
    explanation: String(d.explanation ?? ''),
    difficulty: d.difficulty ?? 'easy',
    topicId: String(d.topicId ?? ''),
    subTopicId: String(d.subTopicId ?? ''),
    isSaved: Boolean(d.isSaved),
  };
  const image = cloneImage(d.image);
  if (image) cloned.image = image;
  else delete cloned.image;
  return cloned;
}

export function isEmptyQuestionDraft(d: QuestionDraftV2): boolean {
  return (
    !d.questionHtml.trim() &&
    !d.explanation.trim() &&
    d.options.every((o) => !String(o).trim())
  );
}

function applyTopicDefaults(
  draft: QuestionDraftV2,
  defaults?: { topicId?: string; subTopicId?: string },
): QuestionDraftV2 {
  return {
    ...draft,
    topicId: draft.topicId || defaults?.topicId || '',
    subTopicId: draft.subTopicId || defaults?.subTopicId || '',
  };
}

/** Apply test topic defaults and set isSaved when draft passes the same validation as manual Next. */
function finalizeCsvDraft(
  draft: QuestionDraftV2,
  questionNumber: number,
  defaults?: { topicId?: string; subTopicId?: string },
): QuestionDraftV2 {
  const withTopics = applyTopicDefaults(cloneDraft(draft), defaults);
  const isSaved = isDraftCompleteForSave(
    withTopics,
    questionNumber,
    defaults?.topicId,
    defaults?.subTopicId,
  );
  return { ...withTopics, isSaved };
}

function newDraft(): QuestionDraftV2 {
  return {
    id: uid('qd'),
    questionHtml: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
    difficulty: 'easy',
    topicId: '',
    subTopicId: '',
    isSaved: false,
  };
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

function persistCurrent(state: AddQuestionsState) {
  if (!state.testId || !state.drafts.length) return;
  syncQuestionImageRegistry(state.testId, state.drafts);
  savePersistedAddQuestions(
    state.testId,
    state.drafts,
    clampIndex(state.activeIndex, state.drafts.length),
  );
}

export const useAddQuestionsStore = create<AddQuestionsState & AddQuestionsActions>(
  (set, get) => ({
    testId: null,
    drafts: [],
    activeIndex: 0,

    initForTest: (testId, totalQuestions) => {
      const s = get();
      const n = Math.max(1, Number(totalQuestions || 1));

      if (s.testId === testId && s.drafts.length > 0) {
        if (s.drafts.length < n) {
          const nextDrafts = [
            ...s.drafts,
            ...Array.from({ length: n - s.drafts.length }, () => newDraft()),
          ];
          set({
            drafts: nextDrafts,
            activeIndex: clampIndex(s.activeIndex, nextDrafts.length),
          });
        }
        persistCurrent(get());
        return;
      }

      const persisted = loadPersistedAddQuestions(testId);
      if (persisted) {
        const drafts = mergeRegistryImagesIntoDrafts(
          testId,
          persisted.drafts.map(cloneDraft),
        );
        set({
          testId,
          drafts,
          activeIndex: clampIndex(persisted.activeIndex, drafts.length),
        });
        persistCurrent(get());
        return;
      }

      const initialDrafts = Array.from({ length: n }, () => newDraft());
      set({
        testId,
        drafts: initialDrafts,
        activeIndex: 0,
      });
      persistCurrent(get());
    },

    hydrateDraftsFromApi: (testId, drafts, options) => {
      if (options?.clearPersisted) clearPersistedAddQuestions(testId);
      const cloned = mergeRegistryImagesIntoDrafts(
        testId,
        drafts.map(cloneDraft),
      );
      set({
        testId,
        drafts: cloned,
        activeIndex: 0,
      });
      persistCurrent(get());
    },

    setActiveIndex: (idx) =>
      set((s) => {
        const activeIndex = clampIndex(idx, s.drafts.length);
        const next = { ...s, activeIndex };
        persistCurrent(next);
        return { activeIndex };
      }),

    updateDraft: (idx, patch) =>
      set((s) => {
        const drafts = s.drafts.map((d, i) => {
          if (i !== idx) return d;
          if ('image' in patch && patch.image === undefined) {
            const { image: _removed, ...rest } = { ...d, ...patch };
            return rest as QuestionDraftV2;
          }
          return { ...d, ...patch };
        });
        const next = { ...s, drafts };
        persistCurrent(next);
        return { drafts };
      }),

    addAnother: () =>
      set((s) => {
        const drafts = [...s.drafts, newDraft()];
        const activeIndex = drafts.length - 1;
        const next = { ...s, drafts, activeIndex };
        persistCurrent(next);
        return { drafts, activeIndex };
      }),

    importCsvDrafts: (incoming, defaults) => {
      const s = get();
      if (!incoming.length) return 0;

      const normalized = incoming.map((d) =>
        applyTopicDefaults(cloneDraft(d), defaults),
      );
      const drafts = s.drafts.map(cloneDraft);
      let mergeCursor = 0;

      for (let i = 0; i < drafts.length && mergeCursor < normalized.length; i++) {
        if (!isEmptyQuestionDraft(drafts[i])) continue;
        const source = normalized[mergeCursor];
        drafts[i] = {
          ...finalizeCsvDraft(source, i + 1, defaults),
          id: drafts[i].id,
        };
        mergeCursor++;
      }

      const activeIndex = clampIndex(s.activeIndex, drafts.length);

      console.log('[addQuestions] importCsvDrafts', {
        beforeCount: s.drafts.length,
        incomingCount: incoming.length,
        mergedIntoEmptySlots: mergeCursor,
        afterCount: drafts.length,
        activeIndex,
        savedCount: drafts.filter((d) => d.isSaved).length,
        selectedAfter: drafts[activeIndex],
      });

      const next = { ...s, drafts, activeIndex };
      set({ drafts, activeIndex });
      persistCurrent(next);
      return mergeCursor;
    },

    markSaved: (idx) =>
      set((s) => {
        const drafts = s.drafts.map((d, i) =>
          i === idx ? { ...d, isSaved: true } : d,
        );
        const next = { ...s, drafts };
        persistCurrent(next);
        return { drafts };
      }),

    reset: () => {
      const testId = get().testId;
      if (testId) clearPersistedAddQuestions(testId);
      set({ testId: null, drafts: [], activeIndex: 0 });
    },
  }),
);
