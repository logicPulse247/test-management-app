import Papa from 'papaparse';
import type { QuestionDraftV2, QuestionDifficulty } from '@/store/addQuestions.store';

export const CSV_QUESTION_HEADERS = [
  'type',
  'question',
  'option1',
  'option2',
  'option3',
  'option4',
  'correct_option',
  'explanation',
  'difficulty',
] as const;

export type CsvQuestionHeader = (typeof CSV_QUESTION_HEADERS)[number];

export type CsvImportSuccess = {
  ok: true;
  drafts: QuestionDraftV2[];
  importedCount: number;
};

export type CsvImportFailure = {
  ok: false;
  errors: string[];
};

export type CsvImportResult = CsvImportSuccess | CsvImportFailure;

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function normalizeHeaderKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_');
}

function mapDifficulty(raw: unknown): QuestionDifficulty | null {
  const d = String(raw ?? '').trim().toLowerCase();
  if (!d) return 'easy';
  if (d === 'easy') return 'easy';
  if (d === 'medium') return 'medium';
  if (d === 'hard' || d === 'difficult') return 'hard';
  return null;
}

function mapCorrectIndex(raw: unknown): 0 | 1 | 2 | 3 | null {
  const key = String(raw ?? '').trim().toLowerCase();
  switch (key) {
    case 'option1':
    case '1':
    case 'a':
      return 0;
    case 'option2':
    case '2':
    case 'b':
      return 1;
    case 'option3':
    case '3':
    case 'c':
      return 2;
    case 'option4':
    case '4':
    case 'd':
      return 3;
    default:
      return null;
  }
}

function rowToRecord(row: unknown): Record<string, string> {
  if (!row || typeof row !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    out[normalizeHeaderKey(k)] = String(v ?? '').trim();
  }
  return out;
}

function validateHeaders(fields: string[] | undefined): string[] {
  const errors: string[] = [];
  if (!fields?.length) {
    errors.push('CSV is empty or missing a header row.');
    return errors;
  }
  const normalized = fields.map(normalizeHeaderKey);
  const missing = CSV_QUESTION_HEADERS.filter((h) => !normalized.includes(h));
  if (missing.length) {
    errors.push(
      `CSV is missing required column(s): ${missing.join(', ')}. Expected: ${CSV_QUESTION_HEADERS.join(', ')}.`,
    );
  }
  return errors;
}

function parseRow(
  record: Record<string, string>,
  rowNumber: number,
): { draft: QuestionDraftV2 } | { error: string } {
  const type = record.type || 'mcq';
  if (type.toLowerCase() !== 'mcq') {
    return { error: `Row ${rowNumber}: type must be "mcq" (got "${type}").` };
  }

  const question = record.question?.trim() ?? '';
  if (!question) {
    return { error: `Row ${rowNumber}: question is required.` };
  }

  const options = [
    record.option1 ?? '',
    record.option2 ?? '',
    record.option3 ?? '',
    record.option4 ?? '',
  ] as [string, string, string, string];

  if (options.some((o) => !o.trim())) {
    return { error: `Row ${rowNumber}: option1–option4 are all required.` };
  }

  const correctIndex = mapCorrectIndex(record.correct_option);
  if (correctIndex === null) {
    return {
      error: `Row ${rowNumber}: correct_option must be option1, option2, option3, or option4.`,
    };
  }

  const difficulty = mapDifficulty(record.difficulty);
  if (!difficulty) {
    return {
      error: `Row ${rowNumber}: difficulty must be easy, medium, or hard/difficult.`,
    };
  }

  const topicId = String(record.topic ?? record.topic_id ?? '').trim();
  const subTopicId = String(
    record.sub_topic ?? record.subtopic ?? record.sub_topic_id ?? '',
  ).trim();

  return {
    draft: {
      id: uid('qd'),
      questionHtml: question,
      options: options.map((o) => o.trim()) as [string, string, string, string],
      correctIndex,
      explanation: record.explanation ?? '',
      difficulty,
      topicId,
      subTopicId,
      isSaved: false,
    },
  };
}

function isRowEmpty(record: Record<string, string>): boolean {
  return CSV_QUESTION_HEADERS.every((h) => !record[h]);
}

export function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.csv');
}

export function parseQuestionsCsvText(csvText: string): CsvImportResult {
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => normalizeHeaderKey(h),
  });

  const errors: string[] = [];

  if (parsed.errors.length) {
    for (const err of parsed.errors) {
      const row = err.row != null ? err.row + 1 : '?';
      errors.push(`CSV parse error (row ${row}): ${err.message}`);
    }
  }

  errors.push(...validateHeaders(parsed.meta.fields));

  if (errors.length) {
    return { ok: false, errors };
  }

  const dataRows = (parsed.data ?? [])
    .map(rowToRecord)
    .filter((r) => !isRowEmpty(r));

  if (!dataRows.length) {
    return { ok: false, errors: ['CSV has no question rows.'] };
  }

  const drafts: QuestionDraftV2[] = [];

  dataRows.forEach((record, index) => {
    const rowNumber = index + 2;
    const result = parseRow(record, rowNumber);
    if ('error' in result) {
      errors.push(result.error);
    } else {
      drafts.push(result.draft);
    }
  });

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, drafts, importedCount: drafts.length };
}

export async function parseQuestionsCsvFile(file: File): Promise<CsvImportResult> {
  if (!isCsvFile(file)) {
    return {
      ok: false,
      errors: ['Unsupported file type. Please upload a .csv file.'],
    };
  }

  if (file.size === 0) {
    return { ok: false, errors: ['CSV file is empty.'] };
  }

  const text = await file.text();
  if (!text.trim()) {
    return { ok: false, errors: ['CSV file is empty.'] };
  }

  return parseQuestionsCsvText(text);
}
