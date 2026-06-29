import type {
    CreateSurveyInput,
    SurveyRepository,
    UpdateSurveyInput,
} from '../../domain/repositories/survey.repository';

export type SurveyUseCases = {
  list(): Promise<{ items: Awaited<ReturnType<SurveyRepository['list']>>['items']; meta?: unknown }>;
  getById(id: string): Promise<Awaited<ReturnType<SurveyRepository['getById']>>>;
  create(input: CreateSurveyInput): Promise<Awaited<ReturnType<SurveyRepository['create']>>>;
  update(id: string, input: UpdateSurveyInput): Promise<Awaited<ReturnType<SurveyRepository['update']>>>;
  remove(id: string): Promise<void>;
  createToken(id: string, opts?: { expiresAt?: string; codePrefix?: string }): Promise<{ id: string; token: string; expiresAt: string | null }>;
  listTokens(id: string): Promise<Awaited<ReturnType<SurveyRepository['listTokens']>>>;
};

export const createSurveyUseCases = (repo: SurveyRepository): SurveyUseCases => {
  return {
    list: () => repo.list(),
    getById: (id) => repo.getById(id),
    create: (input) => repo.create(input),
    update: (id, input) => repo.update(id, input),
    remove: (id) => repo.remove(id),
    createToken: (id, opts) => repo.createToken(id, opts),
    listTokens: (id) => repo.listTokens(id),
  };
};
