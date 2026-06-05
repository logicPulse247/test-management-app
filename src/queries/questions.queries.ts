import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bulkCreateQuestionsAndLinkToTest,
  fetchQuestionsBulk,
} from '@/services/questions.service';
import type { BulkCreateQuestionInput } from '@/services/questions.service';
import { queryKeys } from '@/queries/queryKeys';

export function useBulkCreateAndLinkQuestionsMutation(testId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questions: BulkCreateQuestionInput[]) =>
      bulkCreateQuestionsAndLinkToTest(testId, questions),
    onSuccess: (result) => {
      qc.setQueryData(queryKeys.testById(testId), result.test);
    },
  });
}

export function useQuestionsByIdsQuery(questionIds: string[]) {
  const sortedKey = [...questionIds].sort().join('|');
  return useQuery({
    queryKey: sortedKey
      ? queryKeys.questionsByIds(sortedKey)
      : ['questions', 'none'],
    queryFn: () => fetchQuestionsBulk(questionIds),
    enabled: questionIds.length > 0,
  });
}

