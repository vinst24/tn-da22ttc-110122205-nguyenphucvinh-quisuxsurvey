import { HTTP_STATUS } from '../constants/http.js';

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(opts: { status: number; code: string; message: string; details?: unknown }) {
    super(opts.message);
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError({ status: HTTP_STATUS.BAD_REQUEST, code: 'BAD_REQUEST', message, details });

export const unauthorized = (message = 'Không được phép') =>
  new AppError({ status: HTTP_STATUS.UNAUTHORIZED, code: 'UNAUTHORIZED', message });

export const forbidden = (message = 'Không có quyền truy cập') =>
  new AppError({ status: HTTP_STATUS.FORBIDDEN, code: 'FORBIDDEN', message });

export const notFound = (message = 'Không tìm thấy') =>
  new AppError({ status: HTTP_STATUS.NOT_FOUND, code: 'NOT_FOUND', message });

export const conflict = (message: string) =>
  new AppError({ status: HTTP_STATUS.CONFLICT, code: 'CONFLICT', message });

