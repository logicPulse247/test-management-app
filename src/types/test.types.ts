import type { Difficulty } from '@/store/testCreation.store';
import type { TestStatus } from '@/constants/testStatus';

export interface TestEntity {
  id: string;
  name: string;
  type?: string;
  subject: string; // can be subject id or name depending on backend
  topics?: string[]; // ids or names
  sub_topics?: string[]; // ids or names
  difficulty?: Difficulty | string;
  correct_marks?: number;
  wrong_marks?: number;
  unattempt_marks?: number;
  total_time?: number;
  total_marks?: number;
  total_questions?: number;
  questions?: string[];
  status?: TestStatus | string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTestPayload {
  name: string;
  type: string;
  subject: string;
  topics: string[];
  sub_topics: string[];
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  difficulty: string;
  total_time: number;
  total_marks: number;
  total_questions: number;
  status: TestStatus;
}

export type UpdateTestPayload = Partial<CreateTestPayload> & {
  questions?: string[];
};

