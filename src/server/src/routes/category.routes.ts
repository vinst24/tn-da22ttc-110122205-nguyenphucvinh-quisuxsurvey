import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from '../controllers/category.controller.js';
import {
  categoryIdParams,
  createCategoryBody,
  listBySurveyQuery,
  updateCategoryBody,
} from '../validations/category.validation.js';

export const categoryRouter = Router();

categoryRouter.get('/categories', validate({ query: listBySurveyQuery }), listCategories);
categoryRouter.get('/categories/:id', validate({ params: categoryIdParams }), getCategoryById);

categoryRouter.post(
  '/categories',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createCategoryBody }),
  createCategory,
);

categoryRouter.put(
  '/categories/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: categoryIdParams, body: updateCategoryBody }),
  updateCategory,
);

categoryRouter.delete(
  '/categories/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: categoryIdParams }),
  deleteCategory,
);

