import bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { User } from '../../infra/database/entities/user.entity.js';
import { RefreshToken } from '../../infra/database/entities/refresh-token.entity.js';
import {
  signAccessToken,
  generateOpaqueToken,
} from '../../shared/security/token.js';
import { ConflictError, UnauthorizedError } from '../../shared/errors.js';
import { getConfig } from '../../config/index.js';
import type { RegisterInput, LoginInput, AuthResult, PublicUser } from './auth.schemas.js';

interface AuthDeps {
  users: Repository<User>;
  refreshTokens: Repository<RefreshToken>;
}

const BCRYPT_ROUNDS = 12;

function parseTtlMs(str: string): number {
  const m = /^(\d+)([smhd])$/.exec(str);
  if (!m || !m[1] || !m[2]) return 7 * 86_400_000;
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(m[1]) * (multipliers[m[2]] ?? 86_400_000);
}

export class AuthService {
  constructor(private readonly deps: AuthDeps) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.deps.users.findOne({ where: { email: input.email } });
    if (existing) {
      throw new ConflictError('E-mail ja cadastrado');
    }
    const password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const entity = this.deps.users.create({
      full_name: input.name,
      email: input.email,
      phone: input.phone,
      password_hash,
      role: input.role,
    });
    const user = await this.deps.users.save(entity);
    return this.issueTokens(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.deps.users.findOne({ where: { email: input.email } });
    if (!user) {
      throw new UnauthorizedError('Credenciais invalidas');
    }
    const matches = await bcrypt.compare(input.password, user.password_hash);
    if (!matches) {
      throw new UnauthorizedError('Credenciais invalidas');
    }
    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const { raw, hash } = generateOpaqueToken();
    const cfg = getConfig();
    const expiresAt = new Date(Date.now() + parseTtlMs(cfg.JWT_REFRESH_EXPIRES_IN));
    const record = this.deps.refreshTokens.create({
      user: { id: user.id } as User,
      token_hash: hash,
      expires_at: expiresAt,
    });
    await this.deps.refreshTokens.save(record);
    return { accessToken, refreshToken: raw, user: this.toPublic(user) };
  }

  private toPublic(user: User): PublicUser {
    return { id: user.id, email: user.email, name: user.full_name, role: user.role };
  }
}
