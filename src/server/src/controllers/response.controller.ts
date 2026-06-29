import type { RequestHandler } from 'express';
import { GUEST_PARTICIPANT_COOKIE } from '../constants/guestCookie.js';
import { responseRepo } from '../repositories/response.repo.js';
import { responseService } from '../services/response.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { clearGuestCookie, setGuestCookie } from '../utils/guestCookies.js';
import { created, ok } from '../utils/response.js';

const buildGuestPayload = (body: any) => {
  const hasToken = typeof body.token === 'string' && body.token.length > 0;
  const hasGuest = body.guest && typeof body.guest === 'object';
  if (!hasToken && !hasGuest) return undefined;
  return {
    token: hasToken ? body.token : undefined,
    fullName: body.guest?.fullName,
    email: body.guest?.email,
    specialty: body.guest?.specialty ?? body.guest?.major,
  };
};

const readGuestCode = (req: Parameters<RequestHandler>[0], fallbackFromBody?: string): string | undefined => {
  // Ưu tiên guestCode từ body (sessionStorage backup cho Safari iPhone)
  const bodyCode = typeof fallbackFromBody === 'string' && fallbackFromBody.length > 0 ? fallbackFromBody : undefined;
  const cookieCode = typeof req.cookies?.[GUEST_PARTICIPANT_COOKIE] === 'string' ? req.cookies[GUEST_PARTICIPANT_COOKIE] : undefined;
  return bodyCode ?? cookieCode;
};

export const submitResponse: RequestHandler = asyncHandler(async (req, res) => {
  const result = await responseService.submit({
    surveyId: req.body.surveyId,
    details: req.body.details,
    overallFeedback: req.body.overallFeedback,
    guest: buildGuestPayload(req.body),
    auth: req.auth ? { userId: req.auth.userId } : undefined,
    guestCode: readGuestCode(req, req.body.guestCode),
  });

  if (result.guestCodeToSet) setGuestCookie(res, result.guestCodeToSet);

  const { guestCodeToSet, ...payload } = result;
  void guestCodeToSet;
  const { status, body } = created(payload);
  res.status(status).json(body);
});

export const listMyResponses: RequestHandler = asyncHandler(async (req, res) => {
  const result = await responseService.listMine({ userId: req.auth!.userId }, req.query as { page?: string; pageSize?: string });
  const { status, body } = ok(result.items, result.meta);
  res.status(status).json(body);
});

export const listMySurveyHistory: RequestHandler = asyncHandler(async (req, res) => {
  const result = await responseService.listMySurveyHistory({ userId: req.auth!.userId }, req.params.surveyId as string);
  const { status, body } = ok(result);
  res.status(status).json(body);
});

export const listResponses: RequestHandler = asyncHandler(async (req, res) => {
  const query = req.query as unknown as {
    surveyId: string;
    page?: string;
    pageSize?: string;
    includePartial?: string;
  };
  const result = await responseService.listBySurvey({
    surveyId: query.surveyId,
    page: query.page,
    pageSize: query.pageSize,
    includePartial: query.includePartial === 'true',
  });
  const { status, body } = ok(result.items, result.meta);
  res.status(status).json(body);
});

export const getDraft: RequestHandler = asyncHandler(async (req, res) => {
  const surveyId = req.query.surveyId as string;
  const draft = await responseService.findExistingDraft({
    surveyId,
    auth: req.auth ? { userId: req.auth.userId } : undefined,
    guestCode: readGuestCode(req),
  });
  const { status, body } = ok(draft);
  res.status(status).json(body);
});

export const saveDraft: RequestHandler = asyncHandler(async (req, res) => {
  const result = await responseService.saveDraft({
    surveyId: req.body.surveyId,
    details: req.body.details,
    overallFeedback: req.body.overallFeedback,
    guest: buildGuestPayload(req.body),
    auth: req.auth ? { userId: req.auth.userId } : undefined,
    guestCode: readGuestCode(req),
  });

  if (result.guestCodeToSet) setGuestCookie(res, result.guestCodeToSet);

  const { guestCodeToSet, ...payload } = result;
  void guestCodeToSet;
  const { status, body } = ok(payload);
  res.status(status).json(body);
});

export const completeResponse: RequestHandler = asyncHandler(async (req, res) => {
  const result = await responseService.complete({
    responseId: req.body.responseId ?? '0',
    surveyId: req.body.surveyId,
    details: req.body.details,
    overallFeedback: req.body.overallFeedback,
    guest: buildGuestPayload(req.body),
    auth: req.auth ? { userId: req.auth.userId } : undefined,
    guestCode: readGuestCode(req),
  });

  if (result.guestCodeToSet) setGuestCookie(res, result.guestCodeToSet);

  const { guestCodeToSet, ...payload } = result;
  void guestCodeToSet;
  const { status, body } = created(payload);
  res.status(status).json(body);
});

export const discardDraft: RequestHandler = asyncHandler(async (req, res) => {
  const surveyId = req.query.surveyId as string;
  const result = await responseService.discardDraft({
    surveyId,
    auth: req.auth ? { userId: req.auth.userId } : undefined,
    guestCode: readGuestCode(req),
  });

  if (result.wasGuest) clearGuestCookie(res);

  const { status, body } = ok({ discarded: result.discarded });
  res.status(status).json(body);
});

export const cleanupDrafts: RequestHandler = asyncHandler(async (req, res) => {
  const { surveyId, minAgeDays } = req.body as { surveyId?: string; minAgeDays?: number };
  const beforeDate =
    typeof minAgeDays === 'number' && minAgeDays > 0
      ? new Date(Date.now() - minAgeDays * 24 * 60 * 60 * 1000)
      : undefined;

  const result = await responseRepo.deleteStaleDraftsBelow80({
    surveyId: surveyId ? Number(surveyId) : undefined,
    beforeDate,
  });

  const { status, body } = ok(result);
  res.status(status).json(body);
});
