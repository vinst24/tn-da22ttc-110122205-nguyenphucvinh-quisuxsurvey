import { Router } from 'express';
import {
  cleanupDrafts,
  completeResponse,
  discardDraft,
  getDraft,
  listMyResponses,
  listMySurveyHistory,
  listResponses,
  saveDraft,
  submitResponse,
} from '../controllers/response.controller.js';
import { attachAuthIfPresent, requireAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  cleanupDraftsBody,
  completeResponseBody,
  draftQuery,
  listMyResponsesQuery,
  myResponseHistoryParams,
  listResponsesQuery,
  saveDraftBody,
  submitResponseBody,
} from '../validations/response.validation.js';

export const responseRouter = Router();

responseRouter.get(
  '/responses/me/:surveyId/history',
  requireAuth,
  validate({ params: myResponseHistoryParams }),
  listMySurveyHistory,
);

responseRouter.get('/responses/me', requireAuth, validate({ query: listMyResponsesQuery }), listMyResponses);

responseRouter.get(
  '/responses',
  requireAuth,
  requireRole('ADMIN'),
  validate({ query: listResponsesQuery }),
  listResponses,
);

responseRouter.get(
  '/responses/draft',
  attachAuthIfPresent,
  validate({ query: draftQuery }),
  getDraft,
);

responseRouter.post(
  '/responses/draft',
  attachAuthIfPresent,
  validate({ body: saveDraftBody }),
  saveDraft,
);

responseRouter.delete(
  '/responses/draft',
  attachAuthIfPresent,
  validate({ query: draftQuery }),
  discardDraft,
);

responseRouter.post(
  '/responses/complete',
  attachAuthIfPresent,
  validate({ body: completeResponseBody }),
  completeResponse,
);

responseRouter.delete(
  '/admin/responses/drafts/cleanup',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: cleanupDraftsBody }),
  cleanupDrafts,
);

responseRouter.post('/responses', attachAuthIfPresent, validate({ body: submitResponseBody }), submitResponse);
