import type { RequestHandler } from 'express';
import { tokenRepo } from '../repositories/token.repo.js';
import { surveyService } from '../services/survey.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { randomSurveyTokenCode } from '../utils/random.js';
import { created, ok } from '../utils/response.js';

export const createSurveyToken: RequestHandler = asyncHandler(async (req, res) => {
  const survey = await surveyService.getById(req.params.id as string);
  const surveyId = String(survey.id);

  const now = Date.now();
  if (survey.expiresAt && survey.expiresAt.getTime() < now) {
    throw badRequest('Khảo sát đã hết hạn, không thể tạo mã mới');
  }

  const tokenExpiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
  const tokenValidFrom = req.body.validFrom ? new Date(req.body.validFrom) : null;

  if (
    tokenExpiresAt &&
    survey.expiresAt &&
    tokenExpiresAt.getTime() > survey.expiresAt.getTime()
  ) {
    throw badRequest('Thời gian hết hạn của mã không được vượt quá thời gian hết hạn của khảo sát');
  }

  if (tokenValidFrom && tokenExpiresAt && tokenValidFrom.getTime() >= tokenExpiresAt.getTime()) {
    throw badRequest('Thời gian hiệu lực phải trước thời gian hết hạn');
  }

  const prefix = typeof req.body.codePrefix === 'string' ? req.body.codePrefix : '';
  const quantity = Number(req.body.quantity ?? 1);
  const records = [];
  const generated = new Set<string>();

  for (let i = 0; i < quantity; i += 1) {
    let token = randomSurveyTokenCode(9, prefix);
    let attempts = 0;

    while ((generated.has(token) || (await tokenRepo.findByCode(token))) && attempts < 20) {
      token = randomSurveyTokenCode(9, prefix);
      attempts += 1;
    }

    if (generated.has(token) || (await tokenRepo.findByCode(token))) {
      throw conflict('Không thể tạo mã khảo sát mới, vui lòng thử lại');
    }

    generated.add(token);
    records.push(await tokenRepo.create({
      surveyId,
      token,
      validFrom: tokenValidFrom,
      validTo: tokenExpiresAt,
      maxUsage: req.body.maxUsage ?? null,
    }));
  }

  const first = records[0];
  const { status, body } = created({
    id: first ? String(first.id) : '',
    token: first?.code ?? '',
    tokens: records.map((record) => ({
      id: String(record.id),
      token: record.code,
      expiresAt: record.validTo?.toISOString() ?? null,
    })),
    expiresAt: first?.validTo?.toISOString() ?? null,
  });
  res.status(status).json(body);
});

export const deleteSurveyToken: RequestHandler = asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const existing = await tokenRepo.findById(id);
  if (!existing) throw notFound('Mã khảo sát không tồn tại');
  await tokenRepo.remove(id);
  const { status, body } = ok({ deleted: true });
  res.status(status).json(body);
});

export const listSurveyTokens: RequestHandler = asyncHandler(async (req, res) => {
  const surveyId = req.params.id as string;
  await surveyService.getById(surveyId);
  const items = await surveyService.listTokensBySurvey(surveyId);
  const { status, body } = ok(
    items.map((item) => ({
      id: String(item.id),
      surveyId: String(item.surveyId),
      code: item.code,
      maxUsage: item.maxUsage,
      usageCount: item.usageCount,
      validFrom: item.validFrom?.toISOString() ?? null,
      validTo: item.validTo?.toISOString() ?? null,
      usedAt: null,
      participantId: null,
      createdAt: item.createdAt.toISOString(),
      participant: null,
    })),
  );
  res.status(status).json(body);
});

export const validateSurveyToken: RequestHandler = asyncHandler(async (req, res) => {
  const code = String(req.params.code).trim();
  const selectedSurveyId = String(req.query.surveyId).trim();

  const record = await tokenRepo.findValidToken(code);
  if (!record) throw notFound('Mã khảo sát không hợp lệ');
  if (record.validFrom && record.validFrom.getTime() > Date.now()) {
    throw conflict('Mã khảo sát chưa được kích hoạt');
  }
  if (record.validTo && record.validTo.getTime() < Date.now()) {
    throw conflict('Mã khảo sát đã hết hạn');
  }
  if (record.maxUsage !== null && record.usageCount >= record.maxUsage) {
    throw conflict('Mã khảo sát đã hết lượt sử dụng');
  }
  if (record.surveyId !== Number(selectedSurveyId)) {
    throw badRequest('Mã này không thuộc khảo sát bạn đã chọn.');
  }

  const survey = await surveyService.getById(String(record.surveyId));
  const result = {
    surveyId: String(survey.id),
    surveySlug: survey.slug,
    title: survey.title,
    description: survey.description ?? undefined,
    questionCount: survey.categories.reduce((sum, category) => sum + category.questions.length, 0),
    isActive: survey.isActive,
  };
  const response = ok(result);
  res.status(response.status).json(response.body);
});
