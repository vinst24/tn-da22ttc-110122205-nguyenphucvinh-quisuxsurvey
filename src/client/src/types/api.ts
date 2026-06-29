export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const unwrap = <T>(res: ApiResponse<T>): T => {
  if (res.success) return res.data;
  throw new ApiError(res.error.code, res.error.message, res.error.details);
};

type ValidationIssue = { path?: string; message?: string };

const formatIssues = (details: unknown): string => {
  if (!details || typeof details !== 'object') return '';
  const issues = (details as { issues?: unknown }).issues;
  if (!Array.isArray(issues) || issues.length === 0) return '';
  return issues
    .map((raw) => {
      const i = raw as ValidationIssue;
      const path = i?.path ? String(i.path) : '';
      const msg = i?.message ? String(i.message) : '';
      if (path && msg) return `${path} – ${msg}`;
      return msg || path;
    })
    .filter(Boolean)
    .join('; ');
};

export const extractApiErrorMessage = (e: unknown, fallback: string): string => {
  if (e instanceof ApiError) {
    const detail = formatIssues(e.details);
    return detail ? `${e.message}: ${detail}` : e.message;
  }
  if (e && typeof e === 'object') {
    const anyErr = e as { response?: { data?: unknown }; message?: string };
    const body = anyErr.response?.data;
    if (body && typeof body === 'object' && 'error' in body) {
      const errObj = (body as { error?: { message?: string; details?: unknown } }).error;
      if (errObj?.message) {
        const detail = formatIssues(errObj.details);
        return detail ? `${errObj.message}: ${detail}` : errObj.message;
      }
    }
    if (anyErr.message) return anyErr.message;
  }
  return fallback;
};

