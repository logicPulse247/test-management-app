export const TEST_STATUS = {
  DRAFT: 'draft',
  LIVE: 'live',
  UNPUBLISHED: 'unpublished',
  SCHEDULED: 'scheduled',
  EXPIRED: 'expired',
} as const;

export type TestStatus = (typeof TEST_STATUS)[keyof typeof TEST_STATUS];

