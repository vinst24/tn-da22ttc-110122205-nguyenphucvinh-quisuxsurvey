import { HTTP_STATUS } from '../constants/http.js';

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export const ok = <T>(data: T, meta?: Record<string, unknown>) => {
  return { status: HTTP_STATUS.OK, body: { success: true, data, meta } satisfies ApiSuccess<T> };
};

export const created = <T>(data: T, meta?: Record<string, unknown>) => {
  return {
    status: HTTP_STATUS.CREATED,
    body: { success: true, data, meta } satisfies ApiSuccess<T>,
  };
};

export const noContent = () => {
  return { status: HTTP_STATUS.NO_CONTENT, body: undefined };
};

export const fail = (code: string, message: string, details?: unknown) => {
  return {
    status: HTTP_STATUS.BAD_REQUEST,
    body: { success: false, error: { code, message, details } } satisfies ApiError,
  };
};

