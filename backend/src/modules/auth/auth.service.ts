import bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { User } from '../../infra/database/entities/user.entity.js';
import { RefreshToken } from '../../infra/database/entities/refresh-token.entity.js';
import { EmailVerificationToken } from '../../infra/database/entities/email-verification-token.entity.js';
import { PhoneVerificationToken } from '../../infra/database/entities/phone-verification-token.entity.js';
import { PasswordResetToken } from '../../infra/database/entities/password-reset-token.entity.js';
import { UserOauthAccount } from '../../infra/database/entities/user-oauth-account.entity.js';
import {
  signAccessToken,
  generateOpaqueToken,
  hashToken,
} from '../../shared/security/token.js';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../../shared/errors.js';
import { getConfig } from '../../config/index.js';
import type { RegisterInput, LoginInput, AuthResult, PublicUser, OauthInput } from './auth.schemas.js';

interface MailQueue {
  add(name: string, data: unknown): Promise<unknown>;
}

interface AuthDeps {
  users: Repository<User>;
  refreshTokens: Repository<RefreshToken>;
  emailTokens: Repository<EmailVerificationToken>;
  phoneTokens: Repository<PhoneVerificationToken>;
  resetTokens: Repository<PasswordResetToken>;
  mailQueue: MailQueue;
  oauthAccounts: Repository<UserOauthAccount>;
}

const TOKEN_TTL_MS = 1000 * 60 * 60;

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

  async refresh(rawToken: string): Promise<AuthResult> {
    const record = await this.findValidRefresh(rawToken);
    record.revoked_at = new Date();
    await this.deps.refreshTokens.save(record);
    const user = record.user ?? (await this.deps.users.findOne({ where: { id: record.user_id } }));
    if (!user) {
      throw new UnauthorizedError('Sessao invalida');
    }
    return this.issueTokens(user);
  }

  async logout(rawToken: string): Promise<void> {
    const record = await this.findValidRefresh(rawToken);
    record.revoked_at = new Date();
    await this.deps.refreshTokens.save(record);
  }

  private async findValidRefresh(rawToken: string): Promise<RefreshToken> {
    const record = await this.deps.refreshTokens.findOne({
      where: { token_hash: hashToken(rawToken) },
      relations: { user: true },
    });
    if (!record || record.revoked_at || record.expires_at.getTime() < Date.now()) {
      throw new UnauthorizedError('Sessao invalida');
    }
    return record;
  }

  async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.deps.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('Usuario nao encontrado');
    }
    const { raw, hash } = generateOpaqueToken();
    const record = this.deps.emailTokens.create({
      user: { id: userId } as User,
      token_hash: hash,
      expires_at: new Date(Date.now() + TOKEN_TTL_MS),
    });
    await this.deps.emailTokens.save(record);
    await this.deps.mailQueue.add('email-verification', { email: user.email, token: raw });
  }

  async confirmEmailVerification(rawToken: string): Promise<void> {
    const record = await this.deps.emailTokens.findOne({
      where: { token_hash: hashToken(rawToken) },
      relations: { user: true },
    });
    if (!record || record.used_at || record.expires_at.getTime() < Date.now()) {
      throw new BadRequestError('Token invalido ou expirado');
    }
    record.used_at = new Date();
    await this.deps.emailTokens.save(record);
    await this.deps.users.update(record.user.id, { email_verified_at: new Date() });
  }

  async skipEmailVerification(userId: string): Promise<void> {
    await this.deps.users.update(userId, { email_verified_at: new Date() });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.deps.users.findOne({ where: { email } });
    if (!user) {
      return;
    }
    const { raw, hash } = generateOpaqueToken();
    const record = this.deps.resetTokens.create({
      user: { id: user.id } as User,
      token_hash: hash,
      expires_at: new Date(Date.now() + TOKEN_TTL_MS),
    });
    await this.deps.resetTokens.save(record);
    await this.deps.mailQueue.add('password-reset', { email: user.email, token: raw });
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const record = await this.deps.resetTokens.findOne({
      where: { token_hash: hashToken(rawToken) },
      relations: { user: true },
    });
    if (!record || record.used_at || record.expires_at.getTime() < Date.now()) {
      throw new BadRequestError('Token invalido ou expirado');
    }
    const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    record.used_at = new Date();
    await this.deps.resetTokens.save(record);
    await this.deps.users.update(record.user.id, { password_hash });
    await this.deps.refreshTokens.update(
      { user: { id: record.user.id } },
      { revoked_at: new Date() },
    );
  }

  async linkOrLoginOauth(input: OauthInput): Promise<AuthResult> {
    const linked = await this.deps.oauthAccounts.findOne({
      where: { provider: input.provider, provider_account_id: input.providerUserId },
      relations: { user: true },
    });
    if (linked) {
      return this.issueTokens(linked.user);
    }
    let user = await this.deps.users.findOne({ where: { email: input.email } });
    if (!user) {
      const password_hash = await bcrypt.hash(generateOpaqueToken().raw, BCRYPT_ROUNDS);
      user = await this.deps.users.save(
        this.deps.users.create({
          full_name: input.name,
          email: input.email,
          phone: null,
          password_hash,
          role: 'client',
          email_verified_at: new Date(),
        }),
      );
    }
    await this.deps.oauthAccounts.save(
      this.deps.oauthAccounts.create({
        user: { id: user.id } as User,
        provider: input.provider,
        provider_account_id: input.providerUserId,
      }),
    );
    return this.issueTokens(user);
  }

  private toPublic(user: User): PublicUser {
    return { id: user.id, email: user.email, name: user.full_name, role: user.role };
  }
}
