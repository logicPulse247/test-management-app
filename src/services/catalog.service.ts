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
  if (!isSuccess(data)) {
    return [];
  }
  return normalizeSubjects(data.data);
}

export async function fetchTopicsBySubject(subjectId: string): Promise<Topic[]> {
  const { data } = await apiClient.get<CatalogApiBody<unknown>>(
    `/topics/subject/${subjectId}`,
  );
  if (!isSuccess(data)) {
    return [];
  }
  return normalizeTopics(data.data);
}

export async function fetchSubTopicsByTopics(
  topicIds: string[],
): Promise<SubTopic[]> {
  const validIds = topicIds
    .map((id) => id.trim())
    .filter((id) => isValidCatalogId(id));

  if (!validIds.length) {
    return [];
  }

  const payload = { topicIds: validIds };

  try {
    const { data } = await apiClient.post<CatalogApiBody<unknown>>(
      '/sub-topics/multi-topics',
      payload,
    );
    if (!isSuccess(data)) {
      return [];
    }
    return normalizeSubTopics(data.data);
  } catch {
    return [];
  }
}
