import type { SubmitResponseResultDto } from '../../types/response';

export type SubmitResponseInput = {
  surveyId: string;
  details: { questionId: string; score: number }[];
  guest?: { token: string; fullName?: string; email?: string };
};

export interface ResponseRepository {
  submit(input: SubmitResponseInput): Promise<SubmitResponseResultDto>;
  listBySurvey(surveyId: string, query?: { page?: number; pageSize?: number }): Promise<{ items: unknown[]; meta?: unknown }>;
}

