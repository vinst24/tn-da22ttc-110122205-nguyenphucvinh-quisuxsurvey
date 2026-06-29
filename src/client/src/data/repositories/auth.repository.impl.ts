import { api, rawApi } from '../../api/http';
import type { AuthMeResult, AuthRepository, LoginInput, RegisterInput } from '../../domain/repositories/auth.repository';
import { unwrap } from '../../types/api';
import type { UserDto } from '../../types/auth';

export class HttpAuthRepository implements AuthRepository {
  async login(input: LoginInput): Promise<{ user: UserDto }> {
    const { data } = await api.post(`/auth/login`, input);
    return unwrap(data);
  }

  async register(input: RegisterInput): Promise<{ user: UserDto }> {
    const { data } = await api.post(`/auth/register`, input);
    return unwrap(data);
  }

  async logout(): Promise<void> {
    await api.post(`/auth/logout`);
  }

  async refresh(): Promise<void> {
    await rawApi.post(`/auth/refresh`);
  }

  async me(): Promise<AuthMeResult> {
    const { data } = await api.get(`/auth/me`);
    return unwrap(data);
  }
}
