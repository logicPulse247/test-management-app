import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTest,
  deleteTest,
  fetchTestById,
  fetchTests,
  updateTest,
} from '@/services/tests.service';
import { queryKeys } from '@/queries/queryKeys';
import type { CreateTestPayload, UpdateTestPayload } from '@/types/test.types';

export function useTestsQuery() {
  return useQuery({
    queryKey: queryKeys.tests(),
    queryFn: fetchTests,
  });
}

export function useTestByIdQuery(testId: string | null) {
  return useQuery({
    queryKey: testId ? queryKeys.testById(testId) : ['tests', 'none'],
    queryFn: () => fetchTestById(testId as string),
    enabled: Boolean(testId),
  });
}

export function useCreateTestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTestPayload) => createTest(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tests() });
    },
  });
}

export function useUpdateTestMutation(testId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTestPayload) => updateTest(testId, payload),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.testById(testId), updated);
      void qc.invalidateQueries({ queryKey: queryKeys.tests() });
    },
  });
}

export function useDeleteTestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (testId: string) => deleteTest(testId),
    onSuccess: (_data, testId) => {
      qc.removeQueries({ queryKey: queryKeys.testById(testId) });
      void qc.invalidateQueries({ queryKey: queryKeys.tests() });
    },
  });
}

