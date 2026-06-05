import { apiClient } from '@/lib/api';
import {
  isValidCatalogId,
  normalizeSubjects,
  normalizeSubTopics,
  normalizeTopics,
} from '@/lib/catalog';
import type { Subject, SubTopic, Topic } from '@/types/catalog.types';

type CatalogApiBody<T> = {
  success?: boolean;
  status?: string;
  message?: string;
  data?: T;
};

function isSuccess(body: CatalogApiBody<unknown>): boolean {
  if (body.status === 'success') return true;
  if (body.success === true) return true;
  return false;
}

export async function fetchSubjects(): Promise<Subject[]> {
  const { data } = await apiClient.get<CatalogApiBody<unknown>>('/subjects');
  console.log('SUBJECTS RESPONSE', data);
  if (!isSuccess(data)) {
    return [];
  }
  const normalized = normalizeSubjects(data.data);
  console.log('SUBJECTS NORMALIZED', normalized);
  return normalized;
}

export async function fetchTopicsBySubject(subjectId: string): Promise<Topic[]> {
  const { data } = await apiClient.get<CatalogApiBody<unknown>>(
    `/topics/subject/${subjectId}`,
  );
  console.log('TOPICS RESPONSE', { subjectId, data });
  if (!isSuccess(data)) {
    return [];
  }
  const normalized = normalizeTopics(data.data);
  console.log('TOPICS NORMALIZED', normalized);
  return normalized;
}

export async function fetchSubTopicsByTopics(
  topicIds: string[],
): Promise<SubTopic[]> {
  const validIds = topicIds
    .map((id) => id.trim())
    .filter((id) => isValidCatalogId(id));

  if (!validIds.length) {
    console.log('SUB TOPICS REQUEST skipped — no valid topic UUIDs', topicIds);
    return [];
  }

  const payload = { topicIds: validIds };
  console.log('SUB TOPICS REQUEST', payload);

  try {
    const { data } = await apiClient.post<CatalogApiBody<unknown>>(
      '/sub-topics/multi-topics',
      payload,
    );
    console.log('SUB TOPICS RESPONSE', data);
    if (!isSuccess(data)) {
      return [];
    }
    const normalized = normalizeSubTopics(data.data);
    console.log('SUB TOPICS NORMALIZED', normalized);
    return normalized;
  } catch (error: unknown) {
    console.log('SUB TOPICS ERROR', error);
    return [];
  }
}
