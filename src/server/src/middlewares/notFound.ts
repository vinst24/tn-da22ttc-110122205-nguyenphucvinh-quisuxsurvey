import type { RequestHandler } from 'express';
import { notFound } from '../utils/errors.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound());
};

