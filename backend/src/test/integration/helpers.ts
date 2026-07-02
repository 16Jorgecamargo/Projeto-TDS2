import type { FastifyInstance } from 'fastify';
import { truncateAll } from '../database.js';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  role: 'client' | 'professional' | 'admin';
}

export interface Session {
  accessToken: string;
  user: AuthenticatedUser;
}

export async function resetDatabase(): Promise<void> {
  await truncateAll();
}

export async function loginAs(
  app: FastifyInstance,
  credentials: LoginCredentials,
): Promise<Session> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: credentials,
  });
  if (response.statusCode !== 200) {
    throw new Error(`login failed: ${response.statusCode} ${response.body}`);
  }
  const body = response.json() as { accessToken: string; user: AuthenticatedUser };
  return { accessToken: body.accessToken, user: body.user };
}
