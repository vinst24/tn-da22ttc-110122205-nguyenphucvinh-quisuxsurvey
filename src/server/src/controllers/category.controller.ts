import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { categoryService } from '../services/category.service.js';
import { created, noContent, ok } from '../utils/response.js';

export const listCategories: RequestHandler = asyncHandler(async (req, res) => {
  const items = await categoryService.listBySurvey(req.query.surveyId as string);
  const { status, body } = ok(items);
  res.status(status).json(body);
});

export const getCategoryById: RequestHandler = asyncHandler(async (req, res) => {
  const item = await categoryService.getById(req.params.id as string);
  const { status, body } = ok(item);
  res.status(status).json(body);
});

export const createCategory: RequestHandler = asyncHandler(async (req, res) => {
  const item = await categoryService.create(req.body);
  const { status, body } = created(item);
  res.status(status).json(body);
});

export const updateCategory: RequestHandler = asyncHandler(async (req, res) => {
  const item = await categoryService.update(req.params.id as string, req.body);
  const { status, body } = ok(item);
  res.status(status).json(body);
});

export const deleteCategory: RequestHandler = asyncHandler(async (req, res) => {
  await categoryService.delete(req.params.id as string);
  const { status } = noContent();
  res.status(status).end();
});
