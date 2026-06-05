export type TestFlowMode = 'create' | 'edit' | 'view';

/** Test is published and should not be re-published from the create workflow. */
export function isTestPublished(status: unknown): boolean {
  const s = String(status ?? '').toLowerCase().trim();
  return s === 'live' || s === 'published';
}

export function canPublishTest(
  flowMode: TestFlowMode,
  status: unknown,
): boolean {
  return flowMode === 'create' && !isTestPublished(status);
}

export function questionsReturnPath(testId: string): string {
  return `/questions/${testId}`;
}

/** Edit opened from Add Questions (pencil / exit) — cancel must not wipe question drafts. */
export function isQuestionsReturnPath(path: string | null | undefined): boolean {
  return !!path && /^\/questions\/[^/]+$/.test(path);
}
