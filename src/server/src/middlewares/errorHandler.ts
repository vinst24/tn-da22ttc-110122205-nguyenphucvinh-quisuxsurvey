import type { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/errors.js';
import { HTTP_STATUS } from '../constants/http.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const isAppError = err instanceof AppError;
  const status = isAppError ? err.status : HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const code = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = isAppError ? err.message : '\u004c\u1ed7i m\u00e1y ch\u1ee7 n\u1ed9i b\u1ed9';

  const details = isAppError ? err.details : undefined;

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
};

