import type { MultiSelectOption } from '@/components/ui/multi-select';
import type { Subject, SubTopic, Topic } from '@/types/catalog.types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function looksLikeGarbage(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return true;
  if (v.includes('://') || v.startsWith('http') || v.startsWith('/')) return true;
  if (v.includes('assign-test') || v.includes('test-creation')) return true;
  if (v.includes('localhost')) return true;
  return false;
}

export function isValidCatalogId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const trimmed = id.trim();
  if (!trimmed || looksLikeGarbage(trimmed)) return false;
  return UUID_RE.test(trimmed);
}

export function isValidCatalogName(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (!trimmed || looksLikeGarbage(trimmed)) return false;
  return true;
}

/** Unwrap catalog list from API body (supports nested `data` arrays). */
export function unwrapCatalogList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object') {
    const inner = (payload as { data?: unknown }).data;
    if (Array.isArray(inner)) {
      return inner;
    }
  }
  return [];
}

export function normalizeSubjects(raw: unknown): Subject[] {
  return unwrapCatalogList(raw)
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const id = row.id;
      const name = row.name;
      if (!isValidCatalogId(id) || !isValidCatalogName(name)) return null;
      return { id: id.trim(), name: name.trim() };
    })
    .filter((x): x is Subject => x !== null);
}

export function normalizeTopics(raw: unknown): Topic[] {
  return unwrapCatalogList(raw)
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const id = row.id;
      const name = row.name;
      const subject_id = row.subject_id;
      if (!isValidCatalogId(id) || !isValidCatalogName(name)) return null;
      return {
        id: id.trim(),
        name: name.trim(),
        subject_id:
          typeof subject_id === 'string' && subject_id.trim()
            ? subject_id.trim()
            : '',
      };
    })
    .filter((x): x is Topic => x !== null);
}

export function normalizeSubTopics(raw: unknown): SubTopic[] {
  const seen = new Set<string>();
  const result: SubTopic[] = [];

  for (const item of unwrapCatalogList(raw)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = row.id;
    const name = row.name;
    const topic_id = row.topic_id;
    if (!isValidCatalogId(id) || !isValidCatalogName(name)) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    const entry: SubTopic = {
      id: id.trim(),
      name: name.trim(),
    };
    if (typeof topic_id === 'string' && topic_id.trim()) {
      entry.topic_id = topic_id.trim();
    }
    result.push(entry);
  }

  return result;
}

export function toMultiSelectOptions(
  items: Array<{ id: string; name: string }>,
): MultiSelectOption[] {
  return items
    .filter((item) => isValidCatalogId(item.id) && isValidCatalogName(item.name))
    .map((item) => ({
      value: item.id,
      label: item.name,
    }));
}

export function resolveSubjectId(
  subjectValue: string | undefined,
  subjects: Subject[],
): string | null {
  if (!subjectValue?.trim()) return null;
  const v = subjectValue.trim();
  const byId = subjects.find((s) => s.id === v);
  if (byId) return byId.id;
  const byName = subjects.find(
    (s) => s.name.toLowerCase() === v.toLowerCase(),
  );
  return byName?.id ?? (isValidCatalogId(v) ? v : null);
}

/** Resolve subject name for APIs that expect a display name (e.g. bulk questions). */
export function resolveSubjectName(
  subjectValue: string | undefined,
  subjects: Subject[],
): string {
  if (!subjectValue?.trim()) return '';
  const v = subjectValue.trim();
  const byId = subjects.find((s) => s.id === v);
  if (byId) return byId.name;
  const byName = subjects.find(
    (s) => s.name.toLowerCase() === v.toLowerCase(),
  );
  if (byName) return byName.name;
  if (!isValidCatalogId(v)) return v;
  return v;
}

/** Topics/sub_topics returned as populated objects on GET /tests/:id */
export function extractTestCatalogItems(
  raw: unknown,
): Array<{ id: string; name: string }> {
  if (!Array.isArray(raw)) return [];
  const items: Array<{ id: string; name: string }> = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const id = row.id;
    const name = row.name;
    if (!isValidCatalogId(id) || !isValidCatalogName(name)) continue;
    items.push({ id: id.trim(), name: name.trim() });
  }

  return items;
}

/** Normalize test.topics / test.sub_topics from API (strings or objects). */
export function parseTestRefList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const v = item.trim();
      if (v && !looksLikeGarbage(v)) out.push(v);
      continue;
    }
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>;
      if (typeof row.id === 'string' && row.id.trim()) {
        out.push(row.id.trim());
      } else if (typeof row.name === 'string' && row.name.trim()) {
        out.push(row.name.trim());
      }
    }
  }
  return out;
}

/**
 * Build dropdown options from test-stored refs (ids or names) + catalog for labels/ids.
 */
export function buildCatalogOptionsFromRefs(
  refs: string[],
  catalog: Array<{ id: string; name: string }>,
): MultiSelectOption[] {
  const options: MultiSelectOption[] = [];
  const seen = new Set<string>();

  for (const rawRef of refs) {
    const ref = rawRef.trim();
    if (!ref || looksLikeGarbage(ref)) continue;

    let value = ref;
    let label = ref;

    if (isValidCatalogId(ref)) {
      const match = catalog.find((c) => c.id === ref);
      label = match?.name ?? ref;
      value = ref;
      if (!seen.has(value)) {
        seen.add(value);
        options.push({ value, label });
      }
      continue;
    }

    const refLower = rawRef.toLowerCase();
    const match = catalog.find((c) => c.name.toLowerCase() === refLower);
    if (match) {
      value = match.id;
      label = match.name;
    }

    if (!isValidCatalogId(value) || !isValidCatalogName(label)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label });
  }

  return options;
}

export function mergeSelectOptions(
  ...groups: MultiSelectOption[][]
): MultiSelectOption[] {
  const seen = new Set<string>();
  const merged: MultiSelectOption[] = [];
  for (const group of groups) {
    for (const opt of group) {
      if (!opt.value?.trim() || !opt.label?.trim()) continue;
      if (seen.has(opt.value)) continue;
      seen.add(opt.value);
      merged.push(opt);
    }
  }
  return merged;
}
