import type { QuestionDraftV2 } from '@/store/addQuestions.store';

const STORAGE_PREFIX = 'add_questions_v1_';

export interface PersistedAddQuestionsState {
  drafts: QuestionDraftV2[];
  activeIndex: number;
}

function storageKey(testId: string): string {
  return `${STORAGE_PREFIX}${testId}`;
}

export function loadPersistedAddQuestions(
  testId: string,
): PersistedAddQuestionsState | null {
  try {
    const raw = localStorage.getItem(storageKey(testId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAddQuestionsState;
    if (!Array.isArray(parsed.drafts) || parsed.drafts.length === 0) {
      return null;
    }
    const activeIndex = Number(parsed.activeIndex);
    return {
      drafts: parsed.drafts,
      activeIndex: Number.isFinite(activeIndex) ? activeIndex : 0,
    };
  } catch {
    return null;
  }
}

export function savePersistedAddQuestions(
  testId: string,
  drafts: QuestionDraftV2[],
  activeIndex: number,
): void {
  if (!testId || !drafts.length) return;
  try {
    localStorage.setItem(
      storageKey(testId),
      JSON.stringify({
        drafts,
        activeIndex: Math.max(0, Math.min(activeIndex, drafts.length - 1)),
      }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearPersistedAddQuestions(testId: string): void {
  try {
    localStorage.removeItem(storageKey(testId));
  } catch {
    // ignore
  }
}
