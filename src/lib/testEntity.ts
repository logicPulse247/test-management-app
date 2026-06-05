import {
  extractTestCatalogItems,
  isValidCatalogId,
  parseTestRefList,
} from '@/lib/catalog';
import type { TestEntity } from '@/types/test.types';

function readStringField(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  return '';
}

/** Normalize subject from string, id, or populated object. */
export function normalizeTestSubject(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (raw && typeof raw === 'object') {
    const row = raw as Record<string, unknown>;
    if (typeof row.id === 'string' && row.id.trim()) return row.id.trim();
    if (typeof row.name === 'string' && row.name.trim()) return row.name.trim();
  }
  return '';
}

/** Keep topics/sub_topics as arrays for downstream parsers. */
function normalizeRefArray(raw: unknown): unknown[] | undefined {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  return undefined;
}

/**
 * Normalize GET /tests/:id (and list) payloads — handles nested subject,
 * topic objects, and mixed id/name arrays.
 */
export function normalizeTestEntity(raw: unknown): TestEntity {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid test payload');
  }

  const row = raw as Record<string, unknown>;

  const id = readStringField(row.id);
  if (!id) {
    throw new Error('Test id is missing in response');
  }

  return {
    id,
    name: readStringField(row.name),
    type: readStringField(row.type) || undefined,
    subject: normalizeTestSubject(row.subject),
    topics: normalizeRefArray(row.topics) as TestEntity['topics'],
    sub_topics: normalizeRefArray(row.sub_topics) as TestEntity['sub_topics'],
    difficulty: readStringField(row.difficulty) || undefined,
    correct_marks:
      row.correct_marks !== undefined ? Number(row.correct_marks) : undefined,
    wrong_marks:
      row.wrong_marks !== undefined ? Number(row.wrong_marks) : undefined,
    unattempt_marks:
      row.unattempt_marks !== undefined
        ? Number(row.unattempt_marks)
        : undefined,
    total_time:
      row.total_time !== undefined ? Number(row.total_time) : undefined,
    total_marks:
      row.total_marks !== undefined ? Number(row.total_marks) : undefined,
    total_questions:
      row.total_questions !== undefined
        ? Number(row.total_questions)
        : undefined,
    questions: normalizeQuestionIds(row.questions),
    status: readStringField(row.status) || undefined,
    created_at: readStringField(row.created_at) || undefined,
    updated_at: readStringField(row.updated_at) || undefined,
  };
}

/** Extract question UUIDs from test.questions (strings or { id } objects). */
export function normalizeQuestionIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    let id = '';
    if (typeof item === 'string') {
      id = item.trim();
    } else if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>;
      if (typeof row.id === 'string') id = row.id.trim();
    }
    if (!id || !isValidCatalogId(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

/** Linked question UUIDs; null/empty API `questions` → []. */
export function getLinkedQuestionIds(test: { questions?: unknown }): string[] {
  return normalizeQuestionIds(test.questions) ?? [];
}

/** Count of questions actually linked on the test record (not planned total_questions). */
export function getLinkedQuestionCount(test: { questions?: unknown }): number {
  if (!Array.isArray(test.questions)) return 0;
  return getLinkedQuestionIds(test).length;
}

export function resolveTopicIdsFromTestEntity(
  test: TestEntity,
  topicCatalog: Array<{ id: string; name: string }>,
): string[] {
  const embedded = extractTestCatalogItems(test.topics).map((t) => t.id);
  if (embedded.length) return embedded;

  const refs = parseTestRefList(test.topics);
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const ref of refs) {
    if (isValidCatalogId(ref) && !seen.has(ref)) {
      seen.add(ref);
      ids.push(ref);
      continue;
    }
    const match = topicCatalog.find(
      (t) => t.name.toLowerCase() === ref.toLowerCase(),
    );
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      ids.push(match.id);
    }
  }

  return ids;
}

export function resolveSubTopicIdsFromTestEntity(
  test: TestEntity,
  subTopicCatalog: Array<{ id: string; name: string }>,
): string[] {
  const embedded = extractTestCatalogItems(test.sub_topics).map((t) => t.id);
  if (embedded.length) return embedded;

  const refs = parseTestRefList(test.sub_topics);
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const ref of refs) {
    if (isValidCatalogId(ref) && !seen.has(ref)) {
      seen.add(ref);
      ids.push(ref);
      continue;
    }
    const match = subTopicCatalog.find(
      (t) => t.name.toLowerCase() === ref.toLowerCase(),
    );
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      ids.push(match.id);
    }
  }

  return ids;
}
