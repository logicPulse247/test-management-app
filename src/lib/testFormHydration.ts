import {
  extractTestCatalogItems,
  isValidCatalogId,
  parseTestRefList,
  resolveSubjectId,
} from '@/lib/catalog';
import {
  resolveSubTopicIdsFromTestEntity,
  resolveTopicIdsFromTestEntity,
} from '@/lib/testEntity';
import type { TestMeta } from '@/store/testCreation.store';
import type { TestEntity } from '@/types/test.types';

export type TestCreationFormValues = {
  nameOfTest: string;
  testType: string;
  subjectId: string;
  topicIds: string[];
  subTopicIds: string[];
  durationMinutes: number;
  difficulty: 'easy' | 'medium' | 'difficult';
  correctMarks: number;
  wrongMarks: number;
  unattemptMarks: number;
  totalQuestions: number;
  totalMarks: number;
};

export function mapApiDifficultyToForm(
  value: unknown,
): TestCreationFormValues['difficulty'] {
  const d = String(value ?? 'easy').toLowerCase();
  if (d === 'hard' || d === 'difficult') return 'difficult';
  if (d === 'medium') return 'medium';
  return 'easy';
}

function resolveTopicIdsForForm(
  test: TestEntity,
  topicCatalog: Array<{ id: string; name: string }>,
): string[] {
  const embedded = extractTestCatalogItems(test.topics).map((t) => t.id);
  const resolved = resolveTopicIdsFromTestEntity(test, topicCatalog);
  if (resolved.length) return resolved;
  if (embedded.length) return embedded;
  return parseTestRefList(test.topics).filter(isValidCatalogId);
}

function resolveSubTopicIdsForForm(
  test: TestEntity,
  subTopicCatalog: Array<{ id: string; name: string }>,
): string[] {
  const embedded = extractTestCatalogItems(test.sub_topics).map((t) => t.id);
  const resolved = resolveSubTopicIdsFromTestEntity(test, subTopicCatalog);
  if (resolved.length) return resolved;
  if (embedded.length) return embedded;
  return parseTestRefList(test.sub_topics).filter(isValidCatalogId);
}

/** Build react-hook-form values from GET /tests/:id (works before catalog queries finish). */
export function buildCreateTestFormValuesFromEntity(
  test: TestEntity,
  options: {
    subjects: Array<{ id: string; name: string }>;
    topicCatalog?: Array<{ id: string; name: string }>;
    subTopicCatalog?: Array<{ id: string; name: string }>;
    fallbackTestType?: string;
  },
): TestCreationFormValues {
  const subjectId =
    resolveSubjectId(test.subject, options.subjects) ?? '';
  const topicIds = resolveTopicIdsForForm(
    test,
    options.topicCatalog ?? [],
  );
  const subTopicIds = resolveSubTopicIdsForForm(
    test,
    options.subTopicCatalog ?? [],
  );

  return {
    nameOfTest: test.name ?? '',
    testType: String(test.type ?? options.fallbackTestType ?? ''),
    subjectId,
    topicIds,
    subTopicIds,
    durationMinutes: Number(test.total_time ?? 60),
    difficulty: mapApiDifficultyToForm(test.difficulty),
    correctMarks: Number(test.correct_marks ?? 5),
    wrongMarks: Number(test.wrong_marks ?? -1),
    unattemptMarks: Number(test.unattempt_marks ?? 0),
    totalQuestions: Number(test.total_questions ?? 50),
    totalMarks: Number(test.total_marks ?? 0),
  };
}

export function testFormValuesToMetaPatch(
  values: TestCreationFormValues,
): Partial<TestMeta> {
  return {
    nameOfTest: values.nameOfTest,
    testType: values.testType,
    subjectId: values.subjectId,
    topicIds: values.topicIds,
    subTopicIds: values.subTopicIds,
    durationMinutes: values.durationMinutes,
    difficulty: values.difficulty,
    markingScheme: {
      wrongAnswer: values.wrongMarks,
      unattempted: values.unattemptMarks,
      correctAnswer: values.correctMarks,
      noOfQuestions: values.totalQuestions,
      totalMarks: values.totalMarks,
    },
  };
}
