import type { ParticipantDto, UserDto } from '../../types/auth';

export type AuthMeResult = {
  user: UserDto | null;
  participant: ParticipantDto | null;
};

export type LoginInput = { email: string; password: string };
export type RegisterInput = { email: string; password: string; fullName?: string };

export interface AuthRepository {
  login(input: LoginInput): Promise<{ user: UserDto }>;
  register(input: RegisterInput): Promise<{ user: UserDto }>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  me(): Promise<AuthMeResult>;
}
