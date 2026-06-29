import type { ResponseRepository, SubmitResponseInput } from '../../domain/repositories/response.repository';

export type ResponseUseCases = {
  submit(input: SubmitResponseInput): Promise<Awaited<ReturnType<ResponseRepository['submit']>>>;
  listBySurvey(
    surveyId: string,
    query?: { page?: number; pageSize?: number },
  ): Promise<Awaited<ReturnType<ResponseRepository['listBySurvey']>>>;
};

export const createResponseUseCases = (repo: ResponseRepository): ResponseUseCases => {
  return {
    submit: (input) => repo.submit(input),
    listBySurvey: (surveyId, query) => repo.listBySurvey(surveyId, query),
  };
};

