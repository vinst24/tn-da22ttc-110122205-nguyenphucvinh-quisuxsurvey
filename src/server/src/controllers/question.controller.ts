import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { questionService } from '../services/question.service.js';
import { created, noContent, ok } from '../utils/response.js';

export const listQuestions: RequestHandler = asyncHandler(async (req, res) => {
  const items = await questionService.listByCategory(req.query.categoryId as string);
  const { status, body } = ok(items);
  res.status(status).json(body);
});

export const getQuestionById: RequestHandler = asyncHandler(async (req, res) => {
  const item = await questionService.getById(req.params.id as string);
  const { status, body } = ok(item);
  res.status(status).json(body);
});

export const createQuestion: RequestHandler = asyncHandler(async (req, res) => {
  const item = await questionService.create(req.body);
  const { status, body } = created(item);
  res.status(status).json(body);
});

export const updateQuestion: RequestHandler = asyncHandler(async (req, res) => {
  const item = await questionService.update(req.params.id as string, req.body);
  const { status, body } = ok(item);
  res.status(status).json(body);
});

export const deleteQuestion: RequestHandler = asyncHandler(async (req, res) => {
  await questionService.delete(req.params.id as string);
  const { status } = noContent();
  res.status(status).end();
});
