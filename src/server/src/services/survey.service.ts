import type { Prisma } from '@prisma/client';
import { surveyRepo } from '../repositories/survey.repo.js';
import { tokenRepo } from '../repositories/token.repo.js';
import { parsePagination } from '../types/pagination.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';

const SURVEY_SLUG_MAX = 240;

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SURVEY_SLUG_MAX);

const normalizeSurveyTitle = (value: string) => value.trim();
const normalizeSurveyDescription = (value?: string | null) => value?.trim() ?? '';
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isSurveyExpired = (expiresAt: Date | null, now = Date.now()) =>
  expiresAt !== null && expiresAt.getTime() < now;

const isTitleInFamily = (title: string, baseTitle: string) => {
  if (title === baseTitle) return true;
  const pattern = new RegExp(`^${escapeRegex(baseTitle)} \\((\\d+)\\)$`);
  return pattern.test(title);
};

const extractTitleFamilySuffix = (title: string, baseTitle: string) => {
  if (title === baseTitle) return 0;
  const pattern = new RegExp(`^${escapeRegex(baseTitle)} \\((\\d+)\\)$`);
  const match = pattern.exec(title);
  if (!match) return null;
  return Number(match[1]);
};

const generateUniqueSlug = async (base: string, excludeId?: number): Promise<string> => {
  const clean = base || 'survey';
  let slug = clean.slice(0, 234);
  let attempt = 0;

  while (true) {
    const existing = await surveyRepo.findSlug(slug);
    if (!existing || existing.id === excludeId) return slug;

    if (attempt >= 10) {
      return `${clean.slice(0, 224)}-${Date.now().toString(36)}`;
    }

    const suffix = Math.random().toString(36).substring(2, 7);
    slug = `${clean.slice(0, 234)}-${suffix}`;
    attempt += 1;
  }
};

type SurveyDuplicateCandidate = {
  id: number;
  title: string;
  description: string | null;
  expiresAt: Date | null;
};

export const surveyServiceInternals = {
  normalizeSurveyTitle,
  normalizeSurveyDescription,
  isSurveyExpired,
  isTitleInFamily,
  extractTitleFamilySuffix,
  resolveSurveyTitleForPersistence: ({
    requestedTitle,
    requestedDescription,
    candidates,
    now = Date.now(),
  }: {
    requestedTitle: string;
    requestedDescription?: string | null;
    candidates: SurveyDuplicateCandidate[];
    now?: number;
  }) => {
    const normalizedTitle = normalizeSurveyTitle(requestedTitle);
    const normalizedDescription = normalizeSurveyDescription(requestedDescription);

    const familyCandidates = candidates.filter(
      (candidate) =>
        normalizeSurveyDescription(candidate.description) === normalizedDescription &&
        isTitleInFamily(normalizeSurveyTitle(candidate.title), normalizedTitle),
    );

    const exactDuplicates = familyCandidates.filter(
      (candidate) => normalizeSurveyTitle(candidate.title) === normalizedTitle,
    );

    if (exactDuplicates.some((candidate) => !isSurveyExpired(candidate.expiresAt, now))) {
      return { title: normalizedTitle, hasActiveDuplicate: true };
    }

    if (exactDuplicates.length === 0) {
      return { title: normalizedTitle, hasActiveDuplicate: false };
    }

    let nextSuffix = 1;
    for (const candidate of familyCandidates) {
      const suffix = extractTitleFamilySuffix(normalizeSurveyTitle(candidate.title), normalizedTitle);
      if (suffix !== null) {
        nextSuffix = Math.max(nextSuffix, suffix + 1);
      }
    }

    return {
      title: `${normalizedTitle} (${nextSuffix})`,
      hasActiveDuplicate: false,
    };
  },
};

type ListSurveysQuery = {
  page?: string;
  pageSize?: string;
  q?: string;
  status?: 'active' | 'blocked';
  access?: 'public' | 'token';
  sortBy?: 'title' | 'isActive' | 'responses' | 'expiresAt' | 'createdAt';
  sortDir?: 'asc' | 'desc';
};

const buildSurveyWhere = (query: ListSurveysQuery): Prisma.SurveyWhereInput | undefined => {
  const where: Prisma.SurveyWhereInput = {};
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { description: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  if (query.status === 'active') where.isActive = true;
  else if (query.status === 'blocked') where.isActive = false;
  if (query.access === 'public') where.isPublic = true;
  else if (query.access === 'token') where.isPublic = false;
  return Object.keys(where).length > 0 ? where : undefined;
};

const buildSurveyOrderBy = (
  query: ListSurveysQuery,
): Prisma.SurveyOrderByWithRelationInput | undefined => {
  if (!query.sortBy) return undefined;
  const dir: 'asc' | 'desc' = query.sortDir ?? 'asc';
  if (query.sortBy === 'responses') return { responses: { _count: dir } };
  return { [query.sortBy]: dir } as Prisma.SurveyOrderByWithRelationInput;
};

const resolvePersistedDescription = (
  payload: { description?: string },
  fallback?: string | null,
) => {
  if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
    const normalized = normalizeSurveyDescription(payload.description);
    return normalized.length > 0 ? normalized : null;
  }

  if (fallback === undefined) return undefined;

  const normalizedFallback = normalizeSurveyDescription(fallback);
  return normalizedFallback.length > 0 ? normalizedFallback : null;
};

const prepareSurveyPersistence = async ({
  title,
  description,
  excludeId,
}: {
  title: string;
  description?: string | null;
  excludeId?: number;
}) => {
  const normalizedTitle = normalizeSurveyTitle(title);
  const candidates = await surveyRepo.findByTitleFamily(normalizedTitle, excludeId);
  const resolution = surveyServiceInternals.resolveSurveyTitleForPersistence({
    requestedTitle: normalizedTitle,
    requestedDescription: description,
    candidates,
  });

  if (resolution.hasActiveDuplicate) {
    throw conflict('\u0110\u00e3 t\u1ed3n t\u1ea1i m\u1ed9t kh\u1ea3o s\u00e1t ch\u01b0a h\u1ebft h\u1ea1n v\u1edbi c\u00f9ng ti\u00eau \u0111\u1ec1 v\u00e0 m\u00f4 t\u1ea3. Vui l\u00f2ng \u0111i\u1ec1u ch\u1ec9nh.');
  }

  const slug = await generateUniqueSlug(normalizeSlug(resolution.title), excludeId);
  return { title: resolution.title, slug };
};

export const surveyService = {
  list: async (query: ListSurveysQuery) => {
    const { skip, take, page, pageSize } = parsePagination(query);
    const where = buildSurveyWhere(query);
    const orderBy = buildSurveyOrderBy(query);
    const [items, total] = await Promise.all([
      surveyRepo.list({ skip, take, where, orderBy }),
      surveyRepo.count(where),
    ]);
    return { items, meta: { page, pageSize, total } };
  },

  getById: async (id: string) => {
    const isNumeric = /^\d+$/.test(id);
    const survey = isNumeric
      ? await surveyRepo.findByIdWithCategories(Number(id))
      : await surveyRepo.findBySlug(id);
    if (!survey) throw notFound('\u004b\u0068\u00f4ng t\u00ecm th\u1ea5y kh\u1ea3o s\u00e1t.');
    return survey;
  },

  listTokensBySurvey: async (surveyId: string) => {
    const survey = await surveyService.getById(surveyId);
    return tokenRepo.listBySurvey(String(survey.id));
  },

  getBySlug: async (slug: string) => {
    if (/^\d+$/.test(slug)) throw notFound('\u004b\u0068\u00f4ng t\u00ecm th\u1ea5y kh\u1ea3o s\u00e1t.');
    const survey = await surveyRepo.findBySlug(slug);
    if (!survey) throw notFound('\u004b\u0068\u00f4ng t\u00ecm th\u1ea5y kh\u1ea3o s\u00e1t.');
    return survey;
  },

  getForTaking: async (slug: string, token?: string) => {
    const survey = await surveyService.getBySlug(slug);
    if (survey.isPublic) return survey;

    const trimmedToken = token?.trim();
    if (!trimmedToken) {
      throw badRequest('\u004b\u0068\u1ea3o s\u00e1t n\u00e0y c\u1ea7n m\u00e3 truy c\u1eadp. Vui l\u00f2ng nh\u1eadp m\u00e3 tr\u01b0\u1edbc khi l\u00e0m b\u00e0i.');
    }

    const record = await tokenRepo.findValidToken(trimmedToken);
    if (!record) throw notFound('\u004d\u00e3 kh\u1ea3o s\u00e1t kh\u00f4ng h\u1ee3p l\u1ec7.');
    if (record.surveyId !== survey.id) {
      throw badRequest('\u004d\u00e3 n\u00e0y kh\u00f4ng thu\u1ed9c kh\u1ea3o s\u00e1t b\u1ea1n \u0111\u00e3 ch\u1ecdn.');
    }
    if (record.validFrom && record.validFrom.getTime() > Date.now()) {
      throw conflict('\u004d\u00e3 kh\u1ea3o s\u00e1t ch\u01b0a \u0111\u01b0\u1ee3c k\u00edch ho\u1ea1t.');
    }
    if (record.validTo && record.validTo.getTime() < Date.now()) {
      throw conflict('\u004d\u00e3 kh\u1ea3o s\u00e1t \u0111\u00e3 h\u1ebft h\u1ea1n.');
    }
    if (record.maxUsage !== null && record.usageCount >= record.maxUsage) {
      throw conflict('\u004d\u00e3 kh\u1ea3o s\u00e1t \u0111\u00e3 h\u1ebft l\u01b0\u1ee3t s\u1eed d\u1ee5ng.');
    }

    return survey;
  },
  create: async (
    data: { title: string; description?: string; isActive?: boolean; isPublic?: boolean; expiresAt?: string },
  ) => {
    const normalizedDescription = resolvePersistedDescription(data);
    const prepared = await prepareSurveyPersistence({
      title: data.title,
      description: normalizedDescription,
    });

    return surveyRepo.createWithAllCategories({
      title: prepared.title,
      description: normalizedDescription ?? undefined,
      isActive: data.isActive ?? true,
      isPublic: data.isPublic ?? false,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      slug: prepared.slug,
    });
  },

  update: async (
    id: string,
    data: { title?: string; description?: string; isActive?: boolean; isPublic?: boolean; expiresAt?: string },
  ) => {
    const survey = await surveyService.getById(id);
    const nextTitle = data.title !== undefined ? normalizeSurveyTitle(data.title) : normalizeSurveyTitle(survey.title);
    const nextDescription = resolvePersistedDescription(data, survey.description);
    const prepared = await prepareSurveyPersistence({
      title: nextTitle,
      description: nextDescription,
      excludeId: survey.id,
    });

    return surveyRepo.update(survey.id, {
      title: prepared.title,
      description: Object.prototype.hasOwnProperty.call(data, 'description') ? nextDescription : undefined,
      isActive: data.isActive,
      isPublic: data.isPublic,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      slug: prepared.slug,
    });
  },

  delete: async (id: string) => {
    const isNumeric = /^\d+$/.test(id);
    const survey = isNumeric
      ? await surveyRepo.findById(Number(id))
      : await surveyRepo.findBySlug(id);
    if (!survey) throw notFound('\u004b\u0068\u00f4ng t\u00ecm th\u1ea5y kh\u1ea3o s\u00e1t.');
    await surveyRepo.delete(survey.id);
  },
};
