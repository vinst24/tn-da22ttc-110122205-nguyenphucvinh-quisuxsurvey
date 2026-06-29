import type { RequestHandler } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { badRequest } from '../utils/errors.js';

export const validate =
  (schema: { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny }): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schema.body) req.body = schema.body.parse(req.body);
      if (schema.query) Object.assign(req.query as object, schema.query.parse(req.query));
      if (schema.params) Object.assign(req.params as object, schema.params.parse(req.params));
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
        return next(badRequest('\u0044\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7', { issues }));
      }
      next(badRequest('\u0044\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7', err));
    }
  };
