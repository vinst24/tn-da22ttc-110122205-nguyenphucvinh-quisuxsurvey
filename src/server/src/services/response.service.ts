import type { Specialty } from '@prisma/client';
import { participantRepo } from '../repositories/participant.repo.js';
import { quisRepo } from '../repositories/quis.repo.js';
import { responseRepo } from '../repositories/response.repo.js';
import { tokenRepo } from '../repositories/token.repo.js';
import { parsePagination } from '../types/pagination.js';
import { badRequest, conflict, notFound, unauthorized } from '../utils/errors.js';
import { surveyService } from './survey.service.js';

type DraftDetail = { questionId: string; score: number };
type GuestPayload = { token?: string; fullName?: string; email?: string; specialty?: Specialty };
type AuthPayload = { userId: string };

type SubmitInput = {
  surveyId: string;
  details: DraftDetail[];
  overallFeedback?: string;
  guest?: GuestPayload;
  auth?: AuthPayload;
  guestCode?: string;
};

type SaveDraftInput = {
  surveyId: string;
  details: DraftDetail[];
  overallFeedback?: string;
  guest?: GuestPayload;
  auth?: AuthPayload;
  guestCode?: string;
};

type CompleteInput = {
  responseId: string;
  surveyId: string;
  details: DraftDetail[];
  overallFeedback?: string;
  guest?: GuestPayload;
  auth?: AuthPayload;
  guestCode?: string;
};

type DraftQuery = {
  surveyId: string;
  auth?: AuthPayload;
  guestCode?: string;
};

const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / (nums.length || 1);

const buildQuestionIndex = (
  survey: Awaited<ReturnType<typeof surveyService.getById>>,
) => {
  const idx = new Map<number, { categoryId: number; categoryName: string; isRequired: boolean }>();
  for (const cat of survey.categories) {
    for (const q of cat.questions) {
      idx.set(q.id, { categoryId: cat.id, categoryName: cat.name, isRequired: q.isRequired });
    }
  }
  return idx;
};

const validateDetails = (
  details: DraftDetail[],
  questionIndex: Map<number, { categoryId: number; categoryName: string; isRequired: boolean }>,
) => {
  const uniqueQuestionIds = new Set<number>();
  for (const d of details) {
    const questionId = Number(d.questionId);
    if (!Number.isInteger(questionId)) throw badRequest('\u004d\u00e3 c\u00e2u h\u1ecfi kh\u00f4ng h\u1ee3p l\u1ec7', { questionId: d.questionId });
    if (uniqueQuestionIds.has(questionId)) throw badRequest('Duplicate questionId in details');
    uniqueQuestionIds.add(questionId);
    const q = questionIndex.get(questionId);
    if (!q) throw badRequest('Question does not belong to survey', { questionId: d.questionId });
    if (!Number.isInteger(d.score) || d.score < 1 || d.score > 9)
      throw badRequest('Score must be an integer between 1 and 9', { questionId: d.questionId });
  }
  return uniqueQuestionIds;
};

const calcCompletionPercent = (
  answeredIds: Set<number>,
  questionIndex: Map<number, unknown>,
) => {
  const total = questionIndex.size;
  if (total === 0) return 0;
  return Math.min(100, Math.round((answeredIds.size / total) * 100));
};

const assertSurveyOpen = (survey: { expiresAt: Date | null }) => {
  if (survey.expiresAt && survey.expiresAt.getTime() < Date.now()) {
    throw conflict('Survey expired');
  }
};

type ResolvedParticipant = {
  participantId: string;
  guestCodeToSet?: string;
};

const resolveParticipantForSave = async (input: {
  survey: { id: number; isPublic: boolean };
  auth?: AuthPayload;
  guest?: GuestPayload;
  guestCode?: string;
}): Promise<ResolvedParticipant> => {
  const privateTokenRecord = !input.survey.isPublic
    ? await (async () => {
        if (!input.guest?.token) throw badRequest('\u004b\u0068\u1ea3o s\u00e1t n\u00e0y c\u1ea7n m\u00e3 truy c\u1eadp.');
        const token = await tokenRepo.findValidToken(input.guest.token);
        if (!token) throw notFound('\u004d\u00e3 kh\u1ea3o s\u00e1t kh\u00f4ng h\u1ee3p l\u1ec7');
        if (token.surveyId !== input.survey.id) throw badRequest('\u004d\u00e3 n\u00e0y kh\u00f4ng thu\u1ed9c kh\u1ea3o s\u00e1t b\u1ea1n \u0111\u00e3 ch\u1ecdn.');
        if (token.validFrom && token.validFrom.getTime() > Date.now()) throw conflict('\u004d\u00e3 kh\u1ea3o s\u00e1t ch\u01b0a \u0111\u01b0\u1ee3c k\u00edch ho\u1ea1t.');
        if (token.validTo && token.validTo.getTime() < Date.now()) throw conflict('\u004d\u00e3 kh\u1ea3o s\u00e1t \u0111\u00e3 h\u1ebft h\u1ea1n.');
        return token;
      })()
    : null;
  // 1. Authenticated user
  if (input.auth?.userId) {
    const participant = await participantRepo.findByUserId(Number(input.auth.userId));
    if (!participant) throw unauthorized('Participant profile missing');
    return { participantId: String(participant.id) };
  }

  // 2. Guest with existing cookie -> reuse participant
  if (input.guestCode) {
    const participant = await participantRepo.findByParticipantCode(input.guestCode);
    if (participant) {
      // Cập nhật nickname và specialty nếu có thông tin mới (fix bug ghi đè tên)
      const needsNicknameUpdate = input.guest?.fullName !== undefined && input.guest?.fullName !== participant.nickname;
      const needsSpecialtyUpdate = input.guest?.specialty !== undefined && input.guest?.specialty !== participant.specialty;
      if (needsNicknameUpdate || needsSpecialtyUpdate) {
        await participantRepo.updateGuestInfo(participant.participantCode, {
          nickname: input.guest?.fullName,
          specialty: input.guest?.specialty,
        });
      }
      return { participantId: String(participant.id) };
    }
    // Cookie không khớp record -> rơi xuống tạo mới
  }

  // 3. Guest mới
  if (!input.survey.isPublic) {
    if (!privateTokenRecord) throw badRequest('\u004b\u0068\u1ea3o s\u00e1t n\u00e0y c\u1ea7n m\u00e3 truy c\u1eadp.');
    if (privateTokenRecord.maxUsage !== null) {
      if (privateTokenRecord.usageCount >= privateTokenRecord.maxUsage) throw conflict('\u004d\u00e3 kh\u1ea3o s\u00e1t \u0111\u00e3 h\u1ebft l\u01b0\u1ee3t s\u1eed d\u1ee5ng.');
    }

    const participant = await participantRepo.createGuest({
      nickname: input.guest?.fullName,
      specialty: input.guest?.specialty,
    });
    await tokenRepo.incrementUsage(privateTokenRecord.id);
    return { participantId: String(participant.id), guestCodeToSet: participant.participantCode };
  }
  // Public survey guest
  const participant = await participantRepo.createGuest({
    nickname: input.guest?.fullName,
    specialty: input.guest?.specialty,
  });
  return { participantId: String(participant.id), guestCodeToSet: participant.participantCode };
};

const resolveParticipantForLookup = async (input: {
  auth?: AuthPayload;
  guestCode?: string;
}): Promise<{ participantId: string } | null> => {
  if (input.auth?.userId) {
    const participant = await participantRepo.findByUserId(Number(input.auth.userId));
    if (!participant) return null;
    return { participantId: String(participant.id) };
  }
  if (input.guestCode) {
    const participant = await participantRepo.findByParticipantCode(input.guestCode);
    if (!participant) return null;
    return { participantId: String(participant.id) };
  }
  return null;
};

type ParticipantHistoryRow = Awaited<ReturnType<typeof responseRepo.listParticipantHistoryRows>>[number];
type ParticipantSurveyHistoryRow = Awaited<ReturnType<typeof responseRepo.listParticipantSurveyHistoryRows>>[number];

type AttemptLike = ParticipantHistoryRow | ParticipantSurveyHistoryRow;

const attemptTime = (row: AttemptLike) => {
  const value = row.submittedAt ?? row.lastSavedAt ?? row.createdAt;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
};

const toAttemptDto = (row: AttemptLike, attemptNumber: number) => {
  return {
    responseId: String(row.id),
    attemptNumber,
    isComplete: row.isComplete,
    completionPercent: row.completionPercent,
    submittedAt: row.submittedAt,
    lastSavedAt: row.lastSavedAt,
    createdAt: row.createdAt,
  };
};

const byAttemptAscending = (a: AttemptLike, b: AttemptLike) => {
  const timeDiff = attemptTime(a) - attemptTime(b);
  return timeDiff !== 0 ? timeDiff : a.id - b.id;
};

const byAttemptDescending = (a: { submittedAt: Date | null; lastSavedAt: Date | null; createdAt: Date }, b: { submittedAt: Date | null; lastSavedAt: Date | null; createdAt: Date }) => {
  const timeA = new Date(a.submittedAt ?? a.lastSavedAt ?? a.createdAt).getTime();
  const timeB = new Date(b.submittedAt ?? b.lastSavedAt ?? b.createdAt).getTime();
  return timeB - timeA;
};
export const responseService = {
  listMine: async (auth: AuthPayload, query: { page?: string; pageSize?: string } = {}) => {
    const { skip, take, page, pageSize } = parsePagination(query);
    const participant = await participantRepo.findByUserId(Number(auth.userId));
    if (!participant) return { items: [], meta: { page, pageSize, total: 0 } };

    const rows = await responseRepo.listParticipantHistoryRows(participant.id);
    const rowsBySurvey = new Map<string, ParticipantHistoryRow[]>();
    for (const row of rows) {
      const surveyId = String(row.surveyId);
      const current = rowsBySurvey.get(surveyId) ?? [];
      current.push(row);
      rowsBySurvey.set(surveyId, current);
    }

    const groups = Array.from(rowsBySurvey.values())
      .flatMap((surveyRows) => {
        const firstRow = surveyRows[0];
        if (!firstRow) return [];
        const sortedRows = [...surveyRows].sort(byAttemptAscending);
        const attempts = sortedRows.map((row, index) => toAttemptDto(row, index + 1));
        const latestAttempt = [...attempts].sort(byAttemptDescending)[0];
        if (!latestAttempt) return [];
        const survey = firstRow.survey;
        return [{
          surveyId: String(survey.id),
          surveySlug: survey.slug,
          surveyTitle: survey.title,
          surveyDescription: survey.description,
          surveyIsActive: survey.isActive,
          surveyIsPublic: survey.isPublic,
          attemptCount: attempts.length,
          hasOpenDraft: attempts.some((attempt) => !attempt.isComplete),
          latestAttempt,
        }];
      })
      .sort((a, b) => byAttemptDescending(a.latestAttempt, b.latestAttempt));

    const items = groups.slice(skip, skip + take);
    return { items, meta: { page, pageSize, total: groups.length } };
  },

  listMySurveyHistory: async (auth: AuthPayload, surveyId: string) => {
    const participant = await participantRepo.findByUserId(Number(auth.userId));
    if (!participant) return [];

    let resolvedSurveyId = surveyId;
    if (!/^\d+$/.test(surveyId)) {
      const survey = await surveyService.getById(surveyId);
      resolvedSurveyId = String(survey.id);
    }

    const rows = await responseRepo.listParticipantSurveyHistoryRows(participant.id, Number(resolvedSurveyId));
    return rows.sort(byAttemptAscending).map((row, index) => toAttemptDto(row, index + 1));
  },

  listBySurvey: async (query: {
    surveyId: string;
    page?: string;
    pageSize?: string;
    includePartial?: boolean;
  }) => {
    const { skip, take, page, pageSize } = parsePagination(query);
    const [items, total] = await Promise.all([
      responseRepo.listBySurvey(query.surveyId, { skip, take, includePartial: query.includePartial }),
      responseRepo.countBySurvey(query.surveyId, { includePartial: query.includePartial }),
    ]);
    return { items, meta: { page, pageSize, total } };
  },

  findExistingDraft: async (query: DraftQuery) => {
    const resolved = await resolveParticipantForLookup({ auth: query.auth, guestCode: query.guestCode });
    if (!resolved) return null;

    // Resolve slug → numeric ID if needed
    let resolvedSurveyId = query.surveyId;
    if (!/^\d+$/.test(query.surveyId)) {
      try {
        const survey = await surveyService.getById(query.surveyId);
        resolvedSurveyId = String(survey.id);
      } catch {
        return null; // survey not found → no draft
      }
    }

    const draft = await responseRepo.findOpenDraft(resolvedSurveyId, resolved.participantId);
    if (!draft) return null;

    return {
      responseId: String(draft.id),
      completionPercent: draft.completionPercent,
      lastSavedAt: draft.lastSavedAt,
      details: draft.responseDetails.map((d) => ({
        questionId: String(d.questionId),
        score: d.score,
      })),
    };
  },

  saveDraft: async (input: SaveDraftInput): Promise<{
    responseId: string;
    completionPercent: number;
    guestCodeToSet?: string;
  }> => {
    const survey = await surveyService.getById(input.surveyId);
    const questionIndex = buildQuestionIndex(survey);
    if (questionIndex.size === 0) throw badRequest('Survey has no questions');

    const answeredIds = validateDetails(input.details, questionIndex);
    assertSurveyOpen(survey);

    const resolved = await resolveParticipantForSave({
      survey: { id: survey.id, isPublic: survey.isPublic },
      auth: input.auth,
      guest: input.guest,
      guestCode: input.guestCode,
    });

    const completionPercent = calcCompletionPercent(answeredIds, questionIndex);

    const existing = await responseRepo.findOpenDraft(String(survey.id), resolved.participantId);
    let responseId: number;
    if (existing) {
      const updated = await responseRepo.replaceDraftDetails(existing.id, input.details, completionPercent, input.overallFeedback);
      responseId = updated.id;
    } else {
      const created = await responseRepo.createDraft({
        surveyId: String(survey.id),
        participantId: resolved.participantId,
        details: input.details,
        completionPercent,
        overallFeedback: input.overallFeedback,
      });
      responseId = created.id;
    }

    return {
      responseId: String(responseId),
      completionPercent,
      guestCodeToSet: resolved.guestCodeToSet,
    };
  },

  complete: async (input: CompleteInput) => {
    const survey = await surveyService.getById(input.surveyId);
    const questionIndex = buildQuestionIndex(survey);
    if (questionIndex.size === 0) throw badRequest('Survey has no questions');

    const answeredIds = validateDetails(input.details, questionIndex);

    const missingRequired: number[] = [];
    for (const [questionId, q] of questionIndex.entries()) {
      if (q.isRequired && !answeredIds.has(questionId)) missingRequired.push(questionId);
    }
    if (missingRequired.length) throw badRequest('Missing required questions', { missingRequired });

    assertSurveyOpen(survey);

    const resolved = await resolveParticipantForSave({
      survey: { id: survey.id, isPublic: survey.isPublic },
      auth: input.auth,
      guest: input.guest,
      guestCode: input.guestCode,
    });

    const completionPercent = calcCompletionPercent(answeredIds, questionIndex);

    // Tìm draft hiện có; nếu responseId truyền vào khớp owner thì dùng, không thì
    // dùng draft đang mở của participant.
    const draft = await responseRepo.findOpenDraft(String(survey.id), resolved.participantId);
    let responseRow;
    if (draft) {
      responseRow = await responseRepo.markComplete(draft.id, input.details, completionPercent, input.overallFeedback);
    } else {
      responseRow = await responseRepo.createResponse({
        surveyId: String(survey.id),
        participantId: resolved.participantId,
        details: input.details,
        overallFeedback: input.overallFeedback,
      });
    }

    const scores = input.details.map((d) => d.score);
    const overallAverage = avg(scores);

    const byCategory = new Map<number, { name: string; scores: number[] }>();
    for (const d of input.details) {
      const q = questionIndex.get(Number(d.questionId))!;
      const curr = byCategory.get(q.categoryId) ?? { name: q.categoryName, scores: [] };
      curr.scores.push(d.score);
      byCategory.set(q.categoryId, curr);
    }

    const categoryAverages: Record<string, { categoryName: string; average: number }> = {};
    for (const [categoryId, v] of byCategory.entries()) {
      categoryAverages[categoryId] = { categoryName: v.name, average: Number(avg(v.scores).toFixed(2)) };
    }

    const interpretation = quisRepo.findInterpretationByScore(overallAverage);

    return {
      responseId: String(responseRow.id),
      overallAverage: Number(overallAverage.toFixed(2)),
      categoryAverages,
      interpretation,
      guestCodeToSet: resolved.guestCodeToSet,
    };
  },

  discardDraft: async (query: DraftQuery): Promise<{ discarded: boolean; wasGuest: boolean }> => {
    const resolved = await resolveParticipantForLookup({ auth: query.auth, guestCode: query.guestCode });
    if (!resolved) return { discarded: false, wasGuest: Boolean(query.guestCode) };

    // Resolve slug → numeric ID if needed
    let resolvedSurveyId = query.surveyId;
    if (!/^\d+$/.test(query.surveyId)) {
      try {
        const survey = await surveyService.getById(query.surveyId);
        resolvedSurveyId = String(survey.id);
      } catch {
        return { discarded: false, wasGuest: Boolean(query.guestCode) };
      }
    }

    const draft = await responseRepo.findOpenDraft(resolvedSurveyId, resolved.participantId);
    if (!draft) return { discarded: false, wasGuest: Boolean(query.guestCode) };

    await responseRepo.deleteDraft(draft.id);
    return { discarded: true, wasGuest: Boolean(query.guestCode) };
  },

  submit: async (input: SubmitInput) => {
    // Backwards compatible single-shot submit: hoàn thành ngay không qua draft.
    return responseService.complete({
      responseId: '0',
      surveyId: input.surveyId,
      details: input.details,
      overallFeedback: input.overallFeedback,
      guest: input.guest,
      auth: input.auth,
    });
  },
};
