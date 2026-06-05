import { isValidCatalogId } from '@/lib/catalog';
import type { BulkCreateQuestionInput } from '@/services/questions.service';
import type { QuestionEntity } from '@/services/questions.service';
import type { QuestionDraftV2, QuestionDifficulty } from '@/store/addQuestions.store';

export function getResolvedTopicId(
  draft: QuestionDraftV2,
  fallbackTopicId?: string,
): string {
  return draft.topicId || fallbackTopicId || '';
}

export function getResolvedSubTopicId(
  draft: QuestionDraftV2,
  fallbackSubTopicId?: string,
): string {
  return draft.subTopicId || fallbackSubTopicId || '';
}

/** Validate a single question draft. Returns error message or null if valid. */
export function validateQuestionDraft(
  draft: QuestionDraftV2,
  questionNumber: number,
  fallbackTopicId?: string,
  fallbackSubTopicId?: string,
): string | null {
  const topicId = getResolvedTopicId(draft, fallbackTopicId);
  const subTopicId = getResolvedSubTopicId(draft, fallbackSubTopicId);

  if (!draft.questionHtml.trim()) {
    return `Question ${questionNumber}: question text is required.`;
  }

  const optsOk = draft.options.every((o) => o.trim().length > 0);
  if (!optsOk) {
    return `Question ${questionNumber}: all 4 options are required.`;
  }

  if (!topicId) {
    return `Question ${questionNumber}: topic is required.`;
  }

  if (!subTopicId) {
    return `Question ${questionNumber}: sub-topic is required.`;
  }

  return null;
}

/** Same rules as manual Next — draft is complete and eligible for isSaved. */
export function isDraftCompleteForSave(
  draft: QuestionDraftV2,
  questionNumber: number,
  fallbackTopicId?: string,
  fallbackSubTopicId?: string,
): boolean {
  return (
    validateQuestionDraft(
      draft,
      questionNumber,
      fallbackTopicId,
      fallbackSubTopicId,
    ) === null
  );
}

function mapCorrectOptionToIndex(correctOption: unknown): 0 | 1 | 2 | 3 {
  const key = String(correctOption ?? 'option1').trim().toLowerCase();
  switch (key) {
    case 'option2':
    case '2':
    case 'b':
      return 1;
    case 'option3':
    case '3':
    case 'c':
      return 2;
    case 'option4':
    case '4':
    case 'd':
      return 3;
    default:
      return 0;
  }
}

function mapApiDifficultyToDraft(raw: unknown): QuestionDifficulty {
  const d = String(raw ?? '').trim().toLowerCase();
  if (d === 'medium') return 'medium';
  if (d === 'hard' || d === 'difficult') return 'hard';
  return 'easy';
}

function readEntityStringField(
  row: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/** Map API question (manual or CSV-created) into the Add Questions draft shape. */
export function mapQuestionEntityToDraft(
  entity: QuestionEntity,
  questionNumber: number,
  defaults?: { topicId?: string; subTopicId?: string },
): QuestionDraftV2 {
  const row = entity as Record<string, unknown>;
  const topicId =
    String(entity.topic_id ?? '').trim() ||
    readEntityStringField(row, ['topic_id', 'topicId', 'topic']) ||
    defaults?.topicId ||
    '';
  const subTopicId =
    String(entity.sub_topic_id ?? '').trim() ||
    readEntityStringField(row, [
      'sub_topic_id',
      'subTopicId',
      'sub_topic',
      'subtopic',
    ]) ||
    defaults?.subTopicId ||
    '';

  const draft: QuestionDraftV2 = {
    id:
      typeof entity.id === 'string' && isValidCatalogId(entity.id)
        ? entity.id
        : `qd_${questionNumber}_${Date.now()}`,
    questionHtml: String(entity.question ?? ''),
    options: [
      String(entity.option1 ?? ''),
      String(entity.option2 ?? ''),
      String(entity.option3 ?? ''),
      String(entity.option4 ?? ''),
    ] as [string, string, string, string],
    correctIndex: mapCorrectOptionToIndex(entity.correct_option),
    explanation: String(entity.explanation ?? ''),
    difficulty: mapApiDifficultyToDraft(entity.difficulty),
    topicId,
    subTopicId,
    isSaved: false,
  };

  return {
    ...draft,
    isSaved: isDraftCompleteForSave(
      draft,
      questionNumber,
      defaults?.topicId,
      defaults?.subTopicId,
    ),
  };
}

export function mapQuestionEntitiesToDrafts(
  entities: QuestionEntity[],
  defaults?: { topicId?: string; subTopicId?: string },
): QuestionDraftV2[] {
  return entities.map((entity, index) =>
    mapQuestionEntityToDraft(entity, index + 1, defaults),
  );
}

export function draftHasPersistedQuestionId(draft: QuestionDraftV2): boolean {
  return isValidCatalogId(draft.id);
}

export function draftToBulkInput(
  draft: QuestionDraftV2,
  testId: string,
  subject: string,
): BulkCreateQuestionInput {
  return {
    type: 'mcq',
    question: draft.questionHtml,
    option1: draft.options[0],
    option2: draft.options[1],
    option3: draft.options[2],
    option4: draft.options[3],
    correct_option: `option${draft.correctIndex + 1}` as
      | 'option1'
      | 'option2'
      | 'option3'
      | 'option4',
    explanation: draft.explanation || undefined,
    difficulty: draft.difficulty,
    subject,
    test_id: testId,
  };
}

/** Whether the user can select this question in the sidebar or via prev/next arrows. */
export function isSelectableQuestionIndex(
  drafts: QuestionDraftV2[],
  targetIndex: number,
): boolean {
  return targetIndex >= 0 && targetIndex < drafts.length;
}

/**
 * Sequential unlock for the main Next workflow only:
 * Q1, any saved question, or the question immediately after a saved one.
 */
export function canProceedToQuestionInOrder(
  drafts: QuestionDraftV2[],
  targetIndex: number,
): boolean {
  if (!isSelectableQuestionIndex(drafts, targetIndex)) return false;
  if (targetIndex === 0) return true;
  if (drafts[targetIndex]?.isSaved) return true;
  return Boolean(drafts[targetIndex - 1]?.isSaved);
}
