export const queryKeys = {
  subjects: () => ['subjects'] as const,
  topicsBySubject: (subjectId: string) => ['topics', 'subject', subjectId] as const,
  subTopicsByTopics: (topicIds: string[]) =>
    ['sub-topics', 'topics', [...topicIds].sort()] as const,
  tests: () => ['tests'] as const,
  testById: (testId: string) => ['tests', testId] as const,
  questionsByIds: (questionIdsKey: string) =>
    ['questions', 'ids', questionIdsKey] as const,
};

