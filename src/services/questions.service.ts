import { apiClient } from '@/lib/api';
import { isValidCatalogId, unwrapCatalogList } from '@/lib/catalog';
import { attachQuestionsToTest } from '@/services/tests.service';
import type { ApiResponse } from '@/types/api.types';
import type { TestEntity } from '@/types/test.types';

export interface QuestionEntity {
  id?: string;
  type?: string;
  question: string;
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  correct_option?: string;
  explanation?: string;
  difficulty?: string;
  subject?: string;
  test_id?: string;
  topic_id?: string;
  sub_topic_id?: string;
  [key: string]: unknown;
}

type FetchBulkBody = {
  success?: boolean;
  status?: string;
  data?: unknown;
  questions?: unknown;
};

function normalizeQuestion(raw: unknown): QuestionEntity | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const question = String(row.question ?? row.questionHtml ?? '').trim();
  if (!question) return null;

  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    type: typeof row.type === 'string' ? row.type : undefined,
    question,
    option1: String(row.option1 ?? ''),
    option2: String(row.option2 ?? ''),
    option3: String(row.option3 ?? ''),
    option4: String(row.option4 ?? ''),
    correct_option:
      typeof row.correct_option === 'string' ? row.correct_option : undefined,
    explanation:
      typeof row.explanation === 'string' ? row.explanation : undefined,
    difficulty:
      typeof row.difficulty === 'string' ? row.difficulty : undefined,
    subject: typeof row.subject === 'string' ? row.subject : undefined,
    test_id: typeof row.test_id === 'string' ? row.test_id : undefined,
    topic_id:
      typeof row.topic_id === 'string'
        ? row.topic_id
        : typeof row.topicId === 'string'
          ? row.topicId
          : typeof row.topic === 'string'
            ? row.topic
            : undefined,
    sub_topic_id:
      typeof row.sub_topic_id === 'string'
        ? row.sub_topic_id
        : typeof row.subTopicId === 'string'
          ? row.subTopicId
          : typeof row.sub_topic === 'string'
            ? row.sub_topic
            : typeof row.subtopic === 'string'
              ? row.subtopic
              : undefined,
  };
}

function unwrapQuestionsList(payload: unknown): QuestionEntity[] {
  if (Array.isArray(payload)) {
    return payload
      .map(normalizeQuestion)
      .filter((q): q is QuestionEntity => q !== null);
  }

  if (payload && typeof payload === 'object') {
    const body = payload as FetchBulkBody;
    if (Array.isArray(body.questions)) {
      return body.questions
        .map(normalizeQuestion)
        .filter((q): q is QuestionEntity => q !== null);
    }
    if (Array.isArray(body.data)) {
      return body.data
        .map(normalizeQuestion)
        .filter((q): q is QuestionEntity => q !== null);
    }
    if (body.data && typeof body.data === 'object') {
      const inner = body.data as Record<string, unknown>;
      if (Array.isArray(inner.questions)) {
        return inner.questions
          .map(normalizeQuestion)
          .filter((q): q is QuestionEntity => q !== null);
      }
    }
  }

  return unwrapCatalogList(payload)
    .map(normalizeQuestion)
    .filter((q): q is QuestionEntity => q !== null);
}

export async function fetchQuestionsBulk(
  questionIds: string[],
): Promise<QuestionEntity[]> {
  const ids = questionIds.map((id) => id.trim()).filter(Boolean);
  if (!ids.length) {
    return [];
  }

  const payload = { question_ids: ids };
  const { data } = await apiClient.post<FetchBulkBody>(
    '/questions/fetchBulk',
    payload,
  );

  if (data.status === 'success' || data.success === true) {
    return unwrapQuestionsList(data.data ?? data.questions ?? data);
  }

  return unwrapQuestionsList(data);
}

export type BulkCreateQuestionApiPayload = {
  type: 'mcq';
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  subject: string;
  test_id: string;
  explanation?: string;
  difficulty?: string;
};

export type BulkCreateQuestionInput = BulkCreateQuestionApiPayload;

export function serializeBulkQuestion(
  input: BulkCreateQuestionInput,
): BulkCreateQuestionApiPayload {
  const payload: BulkCreateQuestionApiPayload = {
    type: input.type,
    question: input.question,
    option1: input.option1,
    option2: input.option2,
    option3: input.option3,
    option4: input.option4,
    correct_option: input.correct_option,
    subject: input.subject,
    test_id: input.test_id,
  };

  const explanation = input.explanation?.trim();
  if (explanation) payload.explanation = explanation;

  if (input.difficulty) payload.difficulty = input.difficulty;

  return payload;
}

export interface CreatedQuestion {
  id: string;
  [k: string]: unknown;
}

function unwrapCreatedQuestions(payload: unknown): CreatedQuestion[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is CreatedQuestion =>
        !!item && typeof item === 'object' && typeof (item as CreatedQuestion).id === 'string',
    );
  }
  if (payload && typeof payload === 'object') {
    const body = payload as Record<string, unknown>;
    if (Array.isArray(body.data)) {
      return unwrapCreatedQuestions(body.data);
    }
    if (Array.isArray(body.questions)) {
      return unwrapCreatedQuestions(body.questions);
    }
  }
  return [];
}

export function extractCreatedQuestionIds(payload: unknown): string[] {
  const rows = unwrapCreatedQuestions(payload);
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const id = String(row.id ?? '').trim();
    if (!id || !isValidCatalogId(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

export async function bulkCreateQuestions(
  questions: BulkCreateQuestionInput[],
): Promise<CreatedQuestion[]> {
  const payload = {
    questions: questions.map(serializeBulkQuestion),
  };
  const { data } = await apiClient.post<ApiResponse<CreatedQuestion[]>>(
    '/questions/bulk',
    payload,
  );
  return unwrapCreatedQuestions(data?.data ?? data);
}

export type BulkCreateAndLinkResult = {
  created: CreatedQuestion[];
  createdQuestionIds: string[];
  attachedQuestionIds: string[];
  test: TestEntity;
};

export async function bulkCreateQuestionsAndLinkToTest(
  testId: string,
  questions: BulkCreateQuestionInput[],
): Promise<BulkCreateAndLinkResult> {
  const created = await bulkCreateQuestions(questions);
  const createdQuestionIds = extractCreatedQuestionIds(created);

  if (!createdQuestionIds.length) {
    throw new Error(
      'Questions were submitted but the API did not return question IDs. Cannot link to test.',
    );
  }

  const test = await attachQuestionsToTest(testId, createdQuestionIds, {
    mergeWithExisting: true,
  });

  return {
    created,
    createdQuestionIds,
    attachedQuestionIds: test.questions ?? createdQuestionIds,
    test,
  };
}
