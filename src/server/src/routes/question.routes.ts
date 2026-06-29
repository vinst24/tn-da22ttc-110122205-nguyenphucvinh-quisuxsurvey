import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  listQuestions,
  updateQuestion,
} from '../controllers/question.controller.js';
import {
  createQuestionBody,
  listByCategoryQuery,
  questionIdParams,
  updateQuestionBody,
} from '../validations/question.validation.js';

export const questionRouter = Router();

questionRouter.get('/questions', validate({ query: listByCategoryQuery }), listQuestions);
questionRouter.get('/questions/:id', validate({ params: questionIdParams }), getQuestionById);

questionRouter.post(
  '/questions',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createQuestionBody }),
  createQuestion,
);

questionRouter.put(
  '/questions/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: questionIdParams, body: updateQuestionBody }),
  updateQuestion,
);

questionRouter.delete(
  '/questions/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: questionIdParams }),
  deleteQuestion,
);

