import { apiClient } from '@/lib/api';
import { normalizeTestEntity } from '@/lib/testEntity';
import type { ApiResponse } from '@/types/api.types';
import type {
  CreateTestPayload,
  TestEntity,
  UpdateTestPayload,
} from '@/types/test.types';

export async function fetchTests(): Promise<TestEntity[]> {
  const { data } = await apiClient.get<ApiResponse<unknown>>('/tests');
  const list = Array.isArray(data.data) ? data.data : [];
  return list.map((item) => normalizeTestEntity(item));
}

type TestApiBody = {
  success?: boolean;
  status?: string;
  data?: TestEntity;
};

export async function fetchTestById(testId: string): Promise<TestEntity> {
  const { data } = await apiClient.get<TestApiBody>(`/tests/${testId}`);
  if (data.status === 'success' || data.success === true) {
    if (!data.data) {
      throw new Error('Test not found in response');
    }
    return normalizeTestEntity(data.data);
  }
  throw new Error('Failed to load test');
}

export async function createTest(
  payload: CreateTestPayload,
): Promise<TestEntity> {
  const { data } = await apiClient.post<ApiResponse<TestEntity>>(
    '/tests',
    payload,
  );
  return normalizeTestEntity(data.data);
}

export async function updateTest(
  testId: string,
  payload: UpdateTestPayload,
): Promise<TestEntity> {
  const { data } = await apiClient.put<ApiResponse<TestEntity>>(
    `/tests/${testId}`,
    payload,
  );
  return normalizeTestEntity(data.data);
}

export async function attachQuestionsToTest(
  testId: string,
  questionIds: string[],
  options?: { mergeWithExisting?: boolean },
): Promise<TestEntity> {
  let ids = questionIds.map((id) => id.trim()).filter(Boolean);

  if (options?.mergeWithExisting) {
    const existing = await fetchTestById(testId);
    const existingIds = existing.questions ?? [];
    ids = [...new Set([...existingIds, ...ids])];
  }

  const payload: UpdateTestPayload = { questions: ids };
  return updateTest(testId, payload);
}

export async function deleteTest(testId: string): Promise<void> {
  await apiClient.delete(`/tests/${testId}`);
}

