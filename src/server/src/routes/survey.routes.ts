import { Router } from 'express';
import {
  createSurvey,
  deleteSurvey,
  getSurveyById,
  getSurveyBySlug,
  getSurveyForTaking,
  listSurveys,
  updateSurvey,
} from '../controllers/survey.controller.js';
import { createSurveyToken, deleteSurveyToken, listSurveyTokens, validateSurveyToken } from '../controllers/token.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createSurveyBody,
  listSurveysQuery,
  surveyIdParams,
  surveySlugParams,
  takeSurveyQuery,
  updateSurveyBody,
} from '../validations/survey.validation.js';
import { createTokenBody, tokenCodeParams, validateSurveyTokenQuery } from '../validations/token.validation.js';

export const surveyRouter = Router();

surveyRouter.delete(
  '/tokens/:id',
  requireAuth,
  requireRole('ADMIN'),
  deleteSurveyToken,
);

surveyRouter.get(
  '/survey-tokens/:code',
  validate({ params: tokenCodeParams, query: validateSurveyTokenQuery }),
  validateSurveyToken,
);

surveyRouter.get('/surveys', validate({ query: listSurveysQuery }), listSurveys);
surveyRouter.get('/surveys/:slug/take', validate({ params: surveySlugParams, query: takeSurveyQuery }), getSurveyForTaking);
surveyRouter.get('/surveys/:slug', validate({ params: surveySlugParams }), getSurveyBySlug);
surveyRouter.get('/surveys/admin/:id', requireAuth, requireRole('ADMIN'), validate({ params: surveyIdParams }), getSurveyById);

surveyRouter.post(
  '/surveys',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createSurveyBody }),
  createSurvey,
);

surveyRouter.put(
  '/surveys/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: surveyIdParams, body: updateSurveyBody }),
  updateSurvey,
);

surveyRouter.delete(
  '/surveys/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: surveyIdParams }),
  deleteSurvey,
);

surveyRouter.post(
  '/surveys/:id/tokens',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: surveyIdParams, body: createTokenBody }),
  createSurveyToken,
);

surveyRouter.get(
  '/surveys/:id/tokens',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: surveyIdParams }),
  listSurveyTokens,
);
