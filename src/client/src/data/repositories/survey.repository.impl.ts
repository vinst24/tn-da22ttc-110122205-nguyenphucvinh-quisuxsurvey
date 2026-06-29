import { api } from '../../api/http';
import type {
    CreateSurveyInput,
    SurveyRepository,
    UpdateSurveyInput,
} from '../../domain/repositories/survey.repository';
import { unwrap } from '../../types/api';

import type {
    SurveyDetailDto,
    SurveyDto,
    SurveyListItemDto,
    SurveyTokenDto,
} from '../../types/survey';

export class HttpSurveyRepository implements SurveyRepository {
  async list(): Promise<{ items: SurveyListItemDto[]; meta?: unknown }> {
    const { data } = await api.get(`/surveys`);
    const res = unwrap(data) as { items: SurveyListItemDto[]; meta?: unknown };
    return res;
  }

  async getById(id: string): Promise<SurveyDetailDto> {
    const { data } = await api.get(`/surveys/${id}`);
    return unwrap(data);
  }

  async create(input: CreateSurveyInput): Promise<SurveyDto> {
    const { data } = await api.post(`/surveys`, input);
    return unwrap(data);
  }

  async update(id: string, input: UpdateSurveyInput): Promise<SurveyDto> {
    const { data } = await api.put(`/surveys/${id}`, input);
    return unwrap(data);
  }

  async remove(id: string): Promise<void> {
    await api.delete(`/surveys/${id}`);
  }

  async createToken(
    id: string,
    opts?: { expiresAt?: string; codePrefix?: string },
  ): Promise<{ id: string; token: string; expiresAt: string | null }> {
    const { data } = await api.post(
      `/surveys/${id}/tokens`,
      {
        ...(opts?.expiresAt ? { expiresAt: opts.expiresAt } : {}),
        ...(opts?.codePrefix ? { codePrefix: opts.codePrefix } : {}),
      },
    );
    return unwrap(data);
  }

  async listTokens(id: string): Promise<SurveyTokenDto[]> {
    const { data } = await api.get(`/surveys/${id}/tokens`);
    return unwrap(data) as SurveyTokenDto[];
  }
}
