import type { SurveyDetailDto, SurveyDto, SurveyListItemDto } from '../../types/survey';

export type CreateSurveyInput = { title: string; description?: string; isActive?: boolean; isPublic?: boolean; expiresAt?: string | null };
export type UpdateSurveyInput = { title?: string; description?: string; isActive?: boolean; isPublic?: boolean; expiresAt?: string | null };

export interface SurveyRepository {
  list(): Promise<{ items: SurveyListItemDto[]; meta?: unknown }>;
  getById(id: string): Promise<SurveyDetailDto>;
  create(input: CreateSurveyInput): Promise<SurveyDto>;
  update(id: string, input: UpdateSurveyInput): Promise<SurveyDto>;
  remove(id: string): Promise<void>;
  createToken(id: string, opts?: { expiresAt?: string; codePrefix?: string }): Promise<{ id: string; token: string; expiresAt: string | null }>;
  listTokens(id: string): Promise<Array<{
    id: string;
    surveyId: string;
    participantId: string | null;
    code: string;
    maxUsage: number | null;
    validFrom: string | null;
    validTo: string | null;
    usedAt: string | null;
    createdAt: string;
    participant: null | { id: string; nickname?: string | null; participantCode: string };
  }>>;
}
