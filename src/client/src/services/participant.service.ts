import { api } from '../api/http';
import type { SpecialtyValue } from '../constants/specialties';
import type { ApiResponse } from '../types/api';
import { unwrap } from '../types/api';

export type GuestInfoDto = {
  nickname: string | null;
  specialty: SpecialtyValue | null;
} | null;

export const participantService = {
  getGuestInfo: async (): Promise<GuestInfoDto> => {
    const { data } = await api.get<ApiResponse<GuestInfoDto>>('/participants/guest/info');
    return unwrap(data);
  },
};