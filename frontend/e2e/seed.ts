import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { request, type APIRequestContext } from '@playwright/test';

export type Role = 'client' | 'professional' | 'admin';

export interface SeededUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  accessToken: string;
}

const API_BASE_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(currentDir, '../../backend');

function buildUniquePhone(unique: number): string {
  return `+5551${String(unique).padStart(9, '0').slice(-9)}`;
}

async function seedAdminInDatabase(email: string, password: string, name: string, phone: string): Promise<string> {
  const output = execFileSync('npx', ['tsx', 'src/scripts/seed-e2e-admin.ts', email, password, name, phone], {
    cwd: backendDir,
    encoding: 'utf-8',
  });
  const parsed = JSON.parse(output) as { id: string };
  return parsed.id;
}

export async function seedUser(
  role: Role,
  overrides: Partial<{ email: string; name: string }> = {},
): Promise<SeededUser> {
  const unique = Date.now() + Math.floor(Math.random() * 1000);
  const email = overrides.email ?? `e2e-${role}-${unique}@example.com`;
  const name = overrides.name ?? `E2E ${role} ${unique}`;
  const password = 'Senha123!';
  const phone = buildUniquePhone(unique);

  const context: APIRequestContext = await request.newContext({ baseURL: API_BASE_URL });

  try {
    if (role === 'admin') {
      const id = await seedAdminInDatabase(email, password, name, phone);
      const loginResponse = await context.post('/api/auth/login', { data: { email, password } });
      if (!loginResponse.ok()) {
        throw new Error(`seed admin login failed: ${loginResponse.status()} ${await loginResponse.text()}`);
      }
      const body = (await loginResponse.json()) as { accessToken: string };
      return { id, email, password, name, role, accessToken: body.accessToken };
    }

    const registerResponse = await context.post('/api/auth/register', {
      data: { name, email, password, role, phone },
    });
    if (!registerResponse.ok()) {
      throw new Error(`seed register failed: ${registerResponse.status()} ${await registerResponse.text()}`);
    }

    const loginResponse = await context.post('/api/auth/login', { data: { email, password } });
    if (!loginResponse.ok()) {
      throw new Error(`seed login failed: ${loginResponse.status()} ${await loginResponse.text()}`);
    }
    const body = (await loginResponse.json()) as { accessToken: string; user: { id: string } };
    return { id: body.user.id, email, password, name, role, accessToken: body.accessToken };
  } finally {
    await context.dispose();
  }
}
