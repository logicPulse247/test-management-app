const TRACKING_UPDATED_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

/** Human-readable timestamp for Test Tracking (display only). */
export function formatTrackingUpdatedAt(
  value: string | undefined | null,
): string {
  if (!value?.trim() || value === '—') return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-IN', TRACKING_UPDATED_FORMAT)
    .format(date)
    .replace(/\b(am|pm)\b/g, (match) => match.toUpperCase());
}
