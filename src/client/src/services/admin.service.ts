import { api } from '../api/http';
import type { SpecialtyValue } from '../constants/specialties';

export type ParticipantDto = {
  id: number;
  participantCode: string;
  nickname?: string | null;
  isGuest: boolean;
  major?: SpecialtyValue | null;
  specialty?: SpecialtyValue | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; email: string; fullname?: string | null } | null;
  // chỉ có khi lọc theo khảo sát: phản hồi cho khảo sát đang chọn
  responses?: { surveyId: number; submittedAt: string }[] | null;
};

export type ParticipantResponseDetailDto = {
  id: number;
  surveyId: number;
  isComplete: boolean;
  completionPercent: number;
  overallFeedback?: string | null;
  lastSavedAt?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  survey?: { id: number; title: string; slug?: string | null } | null;
};

export type ParticipantDetailDto = Omit<ParticipantDto, 'responses'> & {
  responses: ParticipantResponseDetailDto[];
};

export type SpecialtyStatDto = {
  specialty: SpecialtyValue;
  count: number;
};

export type ParticipantFilters = {
  page?: number;
  pageSize?: number;
  q?: string;
  isGuest?: boolean;
  major?: SpecialtyValue;
  surveyId?: number;
  createdFrom?: string;
  createdTo?: string;
};

const normalizeParticipant = (participant: ParticipantDto): ParticipantDto => ({
  ...participant,
  major: participant.major ?? participant.specialty ?? null,
});

export const adminService = {
  async listParticipants(opts?: ParticipantFilters) {
    const res = await api.get('/admin/participants', {
      params: {
        page: opts?.page ?? 1,
        pageSize: opts?.pageSize ?? 20,
        q: opts?.q,
        isGuest: opts?.isGuest,
        major: opts?.major,
        surveyId: opts?.surveyId,
        createdFrom: opts?.createdFrom,
        createdTo: opts?.createdTo,
      },
    });

    const items = (res.data.data as ParticipantDto[]).map(normalizeParticipant);
    return { items, meta: res.data.meta };
  },


  async participantSpecialtyStats(opts?: Omit<ParticipantFilters, 'page' | 'pageSize'>) {
    const res = await api.get('/admin/participants/specialty-stats', {
      params: {
        q: opts?.q,
        isGuest: opts?.isGuest,
        major: opts?.major,
        surveyId: opts?.surveyId,
        createdFrom: opts?.createdFrom,
        createdTo: opts?.createdTo,
      },
    });

    return {
      items: res.data.data as SpecialtyStatDto[],
      total: Number(res.data.meta?.total ?? 0),
    };
  },
  async getParticipantById(id: number) {
    const res = await api.get(`/admin/participants/${id}`);
    const raw = res.data.data as ParticipantDetailDto;
    return normalizeParticipant(raw as ParticipantDto) as ParticipantDetailDto;
  },

  async deleteParticipant(id: number) {
    const res = await api.delete(`/admin/participants/${id}`);
    return res.status === 204;
  },

  async exportParticipants(opts?: Omit<ParticipantFilters, 'page' | 'pageSize'>) {
    const res = await api.get('/admin/participants/export', {
      responseType: 'blob',
      params: {
        q: opts?.q,
        isGuest: opts?.isGuest,
        major: opts?.major,
        surveyId: opts?.surveyId,
        createdFrom: opts?.createdFrom,
        createdTo: opts?.createdTo,
      },
    });
    return res.data as Blob;
  },
};
