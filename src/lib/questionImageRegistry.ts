import type { QuestionImageAttachment } from '@/types/questionImage.types';
import type { QuestionDraftV2 } from '@/store/addQuestions.store';

const REGISTRY_PREFIX = 'question_images_v1_';

function registryKey(testId: string): string {
  return `${REGISTRY_PREFIX}${testId}`;
}

type StoredRegistry = Record<string, QuestionImageAttachment>;

function loadRegistryRaw(testId: string): StoredRegistry {
  if (!testId) return {};
  try {
    const raw = localStorage.getItem(registryKey(testId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredRegistry;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveRegistryRaw(testId: string, registry: StoredRegistry): void {
  if (!testId) return;
  try {
    const hasAny = Object.keys(registry).length > 0;
    if (!hasAny) {
      localStorage.removeItem(registryKey(testId));
      return;
    }
    localStorage.setItem(registryKey(testId), JSON.stringify(registry));
  } catch {
    // ignore quota / private mode
  }
}

/** Persist all draft images keyed by question index (survives draft clear after publish). */
export function syncQuestionImageRegistry(
  testId: string,
  drafts: QuestionDraftV2[],
): void {
  const registry: StoredRegistry = {};
  drafts.forEach((draft, index) => {
    if (draft.image?.imageData?.trim()) {
      registry[String(index)] = draft.image;
    }
  });
  saveRegistryRaw(testId, registry);
}

export function getQuestionImageFromRegistry(
  testId: string,
  questionIndex: number,
): QuestionImageAttachment | undefined {
  const registry = loadRegistryRaw(testId);
  const image = registry[String(questionIndex)];
  return image?.imageData?.trim() ? image : undefined;
}

export function setQuestionImageInRegistry(
  testId: string,
  questionIndex: number,
  image: QuestionImageAttachment,
): void {
  const registry = loadRegistryRaw(testId);
  registry[String(questionIndex)] = image;
  saveRegistryRaw(testId, registry);
}

export function removeQuestionImageFromRegistry(
  testId: string,
  questionIndex: number,
): void {
  const registry = loadRegistryRaw(testId);
  delete registry[String(questionIndex)];
  saveRegistryRaw(testId, registry);
}

/** Merge registry images into drafts by index (edit / restore flows). */
export function mergeRegistryImagesIntoDrafts(
  testId: string,
  drafts: QuestionDraftV2[],
): QuestionDraftV2[] {
  if (!testId) return drafts;
  return drafts.map((draft, index) => {
    if (draft.image?.imageData?.trim()) return draft;
    const fromRegistry = getQuestionImageFromRegistry(testId, index);
    if (!fromRegistry) return draft;
    return { ...draft, image: fromRegistry };
  });
}

export function clearQuestionImageRegistry(testId: string): void {
  try {
    localStorage.removeItem(registryKey(testId));
  } catch {
    // ignore
  }
}
