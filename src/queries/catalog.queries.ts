import { useQuery } from '@tanstack/react-query';
import {
  fetchSubjects,
  fetchSubTopicsByTopics,
  fetchTopicsBySubject,
} from '@/services/catalog.service';
import { queryKeys } from '@/queries/queryKeys';

export function useSubjectsQuery() {
  return useQuery({
    queryKey: queryKeys.subjects(),
    queryFn: fetchSubjects,
  });
}

export function useTopicsBySubjectQuery(subjectId: string | null) {
  return useQuery({
    queryKey: subjectId
      ? queryKeys.topicsBySubject(subjectId)
      : ['topics', 'subject', 'none'],
    queryFn: () => fetchTopicsBySubject(subjectId as string),
    enabled: Boolean(subjectId),
  });
}

export function useSubTopicsByTopicsQuery(topicIds: string[]) {
  const validTopicIds = topicIds.filter(
    (id) => typeof id === 'string' && id.trim().length > 0,
  );

  return useQuery({
    queryKey: queryKeys.subTopicsByTopics(validTopicIds),
    queryFn: () => fetchSubTopicsByTopics(validTopicIds),
    enabled: validTopicIds.length > 0,
  });
}
