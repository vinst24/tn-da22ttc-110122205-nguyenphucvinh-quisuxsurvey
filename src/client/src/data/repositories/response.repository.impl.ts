import { api } from '../../api/http';
import type {
    ResponseRepository,
    SubmitResponseInput,
} from '../../domain/repositories/response.repository';
import { unwrap } from '../../types/api';

import type {
    ResponseListItemDto,
    SubmitResponseResultDto,
} from '../../types/response';

export class HttpResponseRepository implements ResponseRepository {
  async submit(input: SubmitResponseInput): Promise<SubmitResponseResultDto> {
    const { data } = await api.post(`/responses`, input);
    return unwrap(data);
  }

  async listBySurvey(
    surveyId: string,
    query?: { page?: number; pageSize?: number },
  ): Promise<{ items: ResponseListItemDto[]; meta?: unknown }> {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const { data } = await api.get(`/responses`, {
      params: { surveyId, page, pageSize },
    });

    type ApiListResponse = {
      success: boolean;
      meta?: unknown;
    };

    const unwrapped = unwrap(data) as ResponseListItemDto[];
    const meta = (data as ApiListResponse).success
      ? (data as ApiListResponse).meta
      : undefined;

    return { items: unwrapped, meta };
  }
}


