import type { Specialty } from '@prisma/client';
import type { RequestHandler } from 'express';
import { GUEST_PARTICIPANT_COOKIE } from '../constants/guestCookie.js';
import { participantRepo } from '../repositories/participant.repo.js';
import { participantService } from '../services/participant.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { clearGuestCookie } from '../utils/guestCookies.js';
import { ok } from '../utils/response.js';

type ParticipantQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  isGuest?: boolean;
  specialty?: Specialty;
  major?: Specialty;
  surveyId?: number | string;
  createdFrom?: string;
  createdTo?: string;
};

const readParticipantFilters = (query: ParticipantQuery) => {
  const surveyId =
    typeof query.surveyId === 'string'
      ? Number(query.surveyId)
      : typeof query.surveyId === 'number'
        ? query.surveyId
        : undefined;

  return {
    specialty: query.specialty ?? query.major,
    surveyId: Number.isFinite(surveyId) ? surveyId : undefined,
  };
};

export const listParticipants: RequestHandler = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ParticipantQuery;
  const filters = readParticipantFilters(query);

  const result = await participantService.list({
    page: query.page,
    pageSize: query.pageSize,
    q: query.q,
    isGuest: query.isGuest,
    specialty: filters.specialty,
    surveyId: filters.surveyId,
    createdFrom: query.createdFrom,
    createdTo: query.createdTo,
  });

  const { status, body } = ok(result.items, result.meta);
  res.status(status).json(body);
});

export const participantSpecialtyStats: RequestHandler = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ParticipantQuery;
  const filters = readParticipantFilters(query);

  const result = await participantService.specialtyStats({
    q: query.q,
    isGuest: query.isGuest,
    specialty: filters.specialty,
    surveyId: filters.surveyId,
    createdFrom: query.createdFrom,
    createdTo: query.createdTo,
  });

  const { status, body } = ok(result.items, { total: result.total });
  res.status(status).json(body);
});

export const exportParticipants: RequestHandler = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ParticipantQuery;
  const filters = readParticipantFilters(query);

  const items = await participantService.exportCsv({
    q: query.q,
    isGuest: query.isGuest,
    specialty: filters.specialty,
    surveyId: filters.surveyId,
    createdFrom: query.createdFrom,
    createdTo: query.createdTo,
  });

  const escapeCsv = (value: unknown) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (/["\n\r,]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const headers = [
    'ID',
    'Nickname',
    'Email',
    'Guest',
    'Participant Code',
    'Specialty',
    'Created At',
    'Updated At',
  ];

  const rows = items.map((item) => [
    item.id,
    item.nickname ?? '',
    item.user?.email ?? '',
    item.isGuest ? 'Yes' : 'No',
    item.participantCode,
    item.specialty ?? '',
    item.createdAt,
    item.updatedAt,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="participants.csv"');
  res.send(csv);
});

export const getParticipantById: RequestHandler = asyncHandler(async (req, res) => {
  const item = await participantService.getById(req.params.id as string);
  const { status, body } = ok(item);
  res.status(status).json(body);
});

export const deleteParticipant: RequestHandler = asyncHandler(async (req, res) => {
  await participantService.delete(req.params.id as string);
  res.status(204).end();
});

export const getGuestInfo: RequestHandler = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[GUEST_PARTICIPANT_COOKIE];
  if (typeof raw !== 'string' || raw.length === 0) {
    const { status, body } = ok(null);
    res.status(status).json(body);
    return;
  }

  const participant = await participantRepo.findByParticipantCode(raw);
  if (!participant) {
    clearGuestCookie(res);
    const { status, body } = ok(null);
    res.status(status).json(body);
    return;
  }

  const { status, body } = ok({
    nickname: participant.nickname,
    specialty: participant.specialty,
  });
  res.status(status).json(body);
});
