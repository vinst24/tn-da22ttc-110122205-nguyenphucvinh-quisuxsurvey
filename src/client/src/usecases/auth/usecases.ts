import type { AuthMeResult, AuthRepository, LoginInput, RegisterInput } from '../../domain/repositories/auth.repository';
import type { UserDto } from '../../types/auth';

export type AuthUseCases = {
  login(input: LoginInput): Promise<{ user: UserDto }>;
  register(input: RegisterInput): Promise<{ user: UserDto }>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  me(): Promise<AuthMeResult>;
};

export const createAuthUseCases = (repo: AuthRepository): AuthUseCases => {
  return {
    login: (input) => repo.login(input),
    register: (input) => repo.register(input),
    logout: () => repo.logout(),
    refresh: () => repo.refresh(),
    me: () => repo.me(),
  };
};
