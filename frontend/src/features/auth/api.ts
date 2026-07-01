import { http } from '../../lib/http';
import type { Role } from '../../stores/auth';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

export const authApi = {
  async login(payload: { email: string; password: string }): Promise<AuthResult> {
    const { data } = await http.post<AuthResult>('/auth/login', payload);
    return data;
  },
  async register(payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'client' | 'professional';
  }): Promise<AuthResult> {
    const { data } = await http.post<AuthResult>('/auth/register', payload);
    return data;
  },
  async refresh(refreshToken: string): Promise<AuthResult> {
    const { data } = await http.post<AuthResult>('/auth/refresh', { refreshToken });
    return data;
  },
  async logout(refreshToken: string): Promise<void> {
    await http.post('/auth/logout', { refreshToken });
  },
  async forgotPassword(email: string): Promise<void> {
    await http.post('/auth/password/forgot', { email });
  },
  async resetPassword(payload: { token: string; password: string }): Promise<void> {
    await http.post('/auth/password/reset', payload);
  },
  async verifyEmail(token: string): Promise<void> {
    await http.post('/auth/verify-email', { token });
  },
};
