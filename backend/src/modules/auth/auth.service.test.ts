import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { AuthService } from './auth.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { hashToken } from '../../shared/security/token.js';
import type { User } from '../../infra/database/entities/user.entity.js';
import type { RefreshToken } from '../../infra/database/entities/refresh-token.entity.js';
import type { EmailVerificationToken } from '../../infra/database/entities/email-verification-token.entity.js';
import type { PhoneVerificationToken } from '../../infra/database/entities/phone-verification-token.entity.js';
import type { PasswordResetToken } from '../../infra/database/entities/password-reset-token.entity.js';

describe('AuthService register/login', () => {
  let users: ReturnType<typeof mockRepo<User>>;
  let refreshTokens: ReturnType<typeof mockRepo<RefreshToken>>;
  let service: AuthService;

  beforeEach(() => {
    users = mockRepo<User>();
    refreshTokens = mockRepo<RefreshToken>();
    service = new AuthService({
      users: users as unknown as Repository<User>,
      refreshTokens: refreshTokens as unknown as Repository<RefreshToken>,
      emailTokens: mockRepo() as unknown as Repository<EmailVerificationToken>,
      phoneTokens: mockRepo() as unknown as Repository<PhoneVerificationToken>,
      resetTokens: mockRepo() as unknown as Repository<PasswordResetToken>,
      mailQueue: { add: vi.fn() },
    });
  });

  it('registra usuario com senha hasheada e retorna tokens', async () => {
    users.findOne.mockResolvedValue(null);
    users.create.mockImplementation((v) => v as User);
    users.save.mockImplementation(async (v) => ({ ...v, id: 'user-1' }) as User);
    refreshTokens.create.mockImplementation((v) => v as RefreshToken);
    refreshTokens.save.mockImplementation(async (v) => v as RefreshToken);

    const result = await service.register({
      name: 'Maria',
      email: 'maria@example.com',
      phone: '+5551999998888',
      password: 'S3nh@Forte',
      role: 'client',
    });

    const saved = users.save.mock.calls[0]![0] as User;
    expect(saved.password_hash).not.toBe('S3nh@Forte');
    await expect(bcrypt.compare('S3nh@Forte', saved.password_hash)).resolves.toBe(true);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.email).toBe('maria@example.com');
  });

  it('rejeita registro com e-mail existente', async () => {
    users.findOne.mockResolvedValue({ id: 'x' } as User);
    await expect(
      service.register({
        name: 'Maria',
        email: 'maria@example.com',
        phone: '+5551999998888',
        password: 'S3nh@Forte',
        role: 'client',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('faz login com credenciais validas', async () => {
    const password_hash = await bcrypt.hash('S3nh@Forte', 10);
    users.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'maria@example.com',
      full_name: 'Maria',
      role: 'client',
      password_hash,
    } as User);
    refreshTokens.create.mockImplementation((v) => v as RefreshToken);
    refreshTokens.save.mockImplementation(async (v) => v as RefreshToken);

    const result = await service.login({ email: 'maria@example.com', password: 'S3nh@Forte' });
    expect(result.user.id).toBe('user-1');
    expect(result.accessToken).toBeTruthy();
  });

  it('rejeita login com senha errada', async () => {
    const password_hash = await bcrypt.hash('S3nh@Forte', 10);
    users.findOne.mockResolvedValue({ id: 'user-1', password_hash, role: 'client' } as User);
    await expect(
      service.login({ email: 'maria@example.com', password: 'errada' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('AuthService refresh/logout', () => {
  let users: ReturnType<typeof mockRepo<User>>;
  let refreshTokens: ReturnType<typeof mockRepo<RefreshToken>>;
  let service: AuthService;

  beforeEach(() => {
    users = mockRepo<User>();
    refreshTokens = mockRepo<RefreshToken>();
    service = new AuthService({
      users: users as unknown as Repository<User>,
      refreshTokens: refreshTokens as unknown as Repository<RefreshToken>,
      emailTokens: mockRepo() as unknown as Repository<EmailVerificationToken>,
      phoneTokens: mockRepo() as unknown as Repository<PhoneVerificationToken>,
      resetTokens: mockRepo() as unknown as Repository<PasswordResetToken>,
      mailQueue: { add: vi.fn() },
    });
  });

  it('rotaciona refresh: revoga antigo e emite novo', async () => {
    const raw = 'rawtoken';
    refreshTokens.findOne.mockResolvedValue({
      id: 'rt-1',
      token_hash: hashToken(raw),
      revoked_at: null,
      expires_at: new Date(Date.now() + 100000),
      user: { id: 'user-1', email: 'm@e.com', full_name: 'M', role: 'client' },
    } as unknown as RefreshToken);
    users.findOne.mockResolvedValue({ id: 'user-1', email: 'm@e.com', full_name: 'M', role: 'client' } as User);
    refreshTokens.create.mockImplementation((v) => v as RefreshToken);
    refreshTokens.save.mockImplementation(async (v) => v as RefreshToken);

    const result = await service.refresh(raw);

    const oldSaved = refreshTokens.save.mock.calls.find(
      (c) => (c[0] as RefreshToken).id === 'rt-1',
    );
    expect((oldSaved?.[0] as RefreshToken).revoked_at).toBeInstanceOf(Date);
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(raw);
  });

  it('rejeita refresh revogado', async () => {
    refreshTokens.findOne.mockResolvedValue({
      id: 'rt-1',
      token_hash: hashToken('x'),
      revoked_at: new Date(),
      expires_at: new Date(Date.now() + 100000),
    } as unknown as RefreshToken);
    await expect(service.refresh('x')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejeita refresh expirado', async () => {
    refreshTokens.findOne.mockResolvedValue({
      id: 'rt-1',
      token_hash: hashToken('x'),
      revoked_at: null,
      expires_at: new Date(Date.now() - 1000),
    } as unknown as RefreshToken);
    await expect(service.refresh('x')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('logout revoga o token atual', async () => {
    refreshTokens.findOne.mockResolvedValue({
      id: 'rt-1',
      token_hash: hashToken('x'),
      revoked_at: null,
      expires_at: new Date(Date.now() + 100000),
    } as unknown as RefreshToken);
    refreshTokens.save.mockImplementation(async (v) => v as RefreshToken);

    await service.logout('x');
    const saved = refreshTokens.save.mock.calls[0]![0] as RefreshToken;
    expect(saved.revoked_at).toBeInstanceOf(Date);
  });
});

describe('AuthService verificacao e reset', () => {
  let users: ReturnType<typeof mockRepo<User>>;
  let refreshTokens: ReturnType<typeof mockRepo<RefreshToken>>;
  let emailTokens: ReturnType<typeof mockRepo<EmailVerificationToken>>;
  let resetTokens: ReturnType<typeof mockRepo<PasswordResetToken>>;
  let mailQueue: { add: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    users = mockRepo<User>();
    refreshTokens = mockRepo<RefreshToken>();
    emailTokens = mockRepo<EmailVerificationToken>();
    resetTokens = mockRepo<PasswordResetToken>();
    mailQueue = { add: vi.fn().mockResolvedValue(undefined) };
    service = new AuthService({
      users: users as unknown as Repository<User>,
      refreshTokens: refreshTokens as unknown as Repository<RefreshToken>,
      emailTokens: emailTokens as unknown as Repository<EmailVerificationToken>,
      phoneTokens: mockRepo() as unknown as Repository<PhoneVerificationToken>,
      resetTokens: resetTokens as unknown as Repository<PasswordResetToken>,
      mailQueue,
    });
  });

  it('cria token de verificacao de e-mail e enfileira envio', async () => {
    users.findOne.mockResolvedValue({ id: 'user-1', email: 'm@e.com' } as User);
    emailTokens.create.mockImplementation((v) => v as EmailVerificationToken);
    emailTokens.save.mockImplementation(async (v) => v as EmailVerificationToken);

    await service.requestEmailVerification('user-1');

    expect(emailTokens.save).toHaveBeenCalled();
    expect(mailQueue.add).toHaveBeenCalledWith('email-verification', expect.objectContaining({ email: 'm@e.com' }));
  });

  it('confirma verificacao e marca e-mail como verificado', async () => {
    const raw = 'verifytoken';
    emailTokens.findOne.mockResolvedValue({
      id: 'ev-1',
      token_hash: hashToken(raw),
      used_at: null,
      expires_at: new Date(Date.now() + 100000),
      user: { id: 'user-1' },
    } as unknown as EmailVerificationToken);
    emailTokens.save.mockImplementation(async (v) => v as EmailVerificationToken);
    users.update.mockResolvedValue({ affected: 1 } as never);

    await service.confirmEmailVerification(raw);

    expect(users.update).toHaveBeenCalledWith('user-1', { email_verified_at: expect.any(Date) });
  });

  it('rejeita confirmacao com token consumido', async () => {
    emailTokens.findOne.mockResolvedValue({
      token_hash: hashToken('x'),
      used_at: new Date(),
      expires_at: new Date(Date.now() + 100000),
    } as unknown as EmailVerificationToken);
    await expect(service.confirmEmailVerification('x')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('nao vaza existencia da conta no requestPasswordReset', async () => {
    users.findOne.mockResolvedValue(null);
    await expect(service.requestPasswordReset('naoexiste@e.com')).resolves.toBeUndefined();
    expect(resetTokens.save).not.toHaveBeenCalled();
    expect(mailQueue.add).not.toHaveBeenCalled();
  });

  it('reseta senha, revoga token e invalida refresh tokens', async () => {
    const raw = 'resettoken';
    resetTokens.findOne.mockResolvedValue({
      id: 'pr-1',
      token_hash: hashToken(raw),
      used_at: null,
      expires_at: new Date(Date.now() + 100000),
      user: { id: 'user-1' },
    } as unknown as PasswordResetToken);
    resetTokens.save.mockImplementation(async (v) => v as PasswordResetToken);
    users.update.mockResolvedValue({ affected: 1 } as never);
    refreshTokens.update.mockResolvedValue({ affected: 2 } as never);

    await service.resetPassword(raw, 'N0v@Senha');

    const updateArg = users.update.mock.calls[0]![1] as { password_hash: string };
    await expect(bcrypt.compare('N0v@Senha', updateArg.password_hash)).resolves.toBe(true);
    expect(refreshTokens.update).toHaveBeenCalled();
  });
});
