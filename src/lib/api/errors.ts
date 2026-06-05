import axios, { isAxiosError, type AxiosError } from 'axios';

export interface ApiFieldError {
  type?: string;
  value?: unknown;
  msg?: string;
  path?: string;
  location?: string;
}

export interface ApiErrorBody {
  status?: string;
  message?: string;
  error?: string;
  errors?: Record<string, string[]> | ApiFieldError[];
  statusCode?: number;
  success?: boolean;
}

export interface ApiError {
  message: string;
  status: number | null;
  code: string | null;
  data: ApiErrorBody | null;
  fieldErrors: ApiFieldError[];
  isNetworkError: boolean;
  isUnauthorized: boolean;
  originalError: unknown;
}

function isGenericAxiosMessage(message: string): boolean {
  return /^Request failed with status code \d+$/i.test(message.trim());
}

function extractFieldErrors(body: ApiErrorBody | null): ApiFieldError[] {
  if (!body?.errors) {
    return [];
  }

  if (Array.isArray(body.errors)) {
    return body.errors.filter(
      (entry): entry is ApiFieldError =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as ApiFieldError).msg === 'string' &&
        (entry as ApiFieldError).msg!.length > 0,
    );
  }

  return Object.entries(body.errors).flatMap(([path, messages]) =>
    (Array.isArray(messages) ? messages : []).map((msg) => ({
      path,
      msg,
    })),
  );
}

function extractMessageFromBody(body: ApiErrorBody | null): string | null {
  const fieldErrors = extractFieldErrors(body);

  if (fieldErrors.length > 0) {
    const specific = fieldErrors.find(
      (e) => e.msg && e.msg.trim().length > 0 && e.msg !== 'Validation failed',
    );
    if (specific?.msg) {
      return specific.msg;
    }
    return fieldErrors[0]?.msg ?? null;
  }

  if (typeof body?.message === 'string' && body.message.length > 0) {
    return body.message;
  }

  if (typeof body?.error === 'string' && body.error.length > 0) {
    return body.error;
  }

  return null;
}

function parseAxiosError(error: AxiosError<ApiErrorBody>): ApiError {
  const status = error.response?.status ?? null;
  const data = error.response?.data ?? null;
  const fieldErrors = extractFieldErrors(data);
  const fromBody = extractMessageFromBody(data);

  let message = fromBody;
  if (!message && error.message && !isGenericAxiosMessage(error.message)) {
    message = error.message;
  }
  if (!message) {
    message = status ? `Request failed (${status})` : 'Request failed';
  }

  return {
    message,
    status,
    code: error.code ?? null,
    data,
    fieldErrors,
    isNetworkError: !error.response,
    isUnauthorized: status === 401,
    originalError: error,
  };
}

export function parseApiError(error: unknown): ApiError {
  if (isAxiosError<ApiErrorBody>(error)) {
    return parseAxiosError(error);
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      status: null,
      code: null,
      data: null,
      fieldErrors: [],
      isNetworkError: false,
      isUnauthorized: false,
      originalError: error,
    };
  }

  return {
    message: 'An unexpected error occurred',
    status: null,
    code: null,
    data: null,
    fieldErrors: [],
    isNetworkError: false,
    isUnauthorized: false,
    originalError: error,
  };
}

export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  return parseApiError(error).message || fallback;
}

export function getFieldErrorMessage(
  error: unknown,
  fieldPath: string,
): string | null {
  const parsed = parseApiError(error);
  const match = parsed.fieldErrors.find((e) => e.path === fieldPath);
  return match?.msg ?? null;
}

/** Duplicate test name errors are returned on `subject` path but refer to the test name. */
export function isDuplicateTestNameError(error: unknown): boolean {
  const message = getErrorMessage(error, '').toLowerCase();
  return message.includes('name already exists');
}

export function getCreateTestNameError(error: unknown): string | null {
  const byName = getFieldErrorMessage(error, 'name');
  if (byName) return byName;

  if (isDuplicateTestNameError(error)) {
    return getErrorMessage(error);
  }

  const bySubject = getFieldErrorMessage(error, 'subject');
  if (bySubject?.toLowerCase().includes('name already exists')) {
    return bySubject;
  }

  return null;
}

export function isUnauthorizedError(error: unknown): boolean {
  return parseApiError(error).isUnauthorized;
}

export function isNetworkError(error: unknown): boolean {
  return parseApiError(error).isNetworkError;
}

export function assertAxiosError(
  error: unknown,
): asserts error is AxiosError<ApiErrorBody> {
  if (!axios.isAxiosError(error)) {
    throw new TypeError('Expected an Axios error');
  }
}
