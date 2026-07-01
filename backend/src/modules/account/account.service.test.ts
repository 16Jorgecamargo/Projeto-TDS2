import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { AccountService } from './account.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import type { UserPreference } from '../../infra/database/entities/user-preference.entity.js';
import type { UserConsent } from '../../infra/database/entities/user-consent.entity.js';
import type { AccountDeletionRequest } from '../../infra/database/entities/account-deletion-request.entity.js';

describe('AccountService', () => {
  let preferences: ReturnType<typeof mockRepo<UserPreference>>;
  let consents: ReturnType<typeof mockRepo<UserConsent>>;
  let deletionRequests: ReturnType<typeof mockRepo<AccountDeletionRequest>>;
  let service: AccountService;

  beforeEach(() => {
    preferences = mockRepo<UserPreference>();
    consents = mockRepo<UserConsent>();
    deletionRequests = mockRepo<AccountDeletionRequest>();
    service = new AccountService({
      preferences: preferences as unknown as Repository<UserPreference>,
      consents: consents as unknown as Repository<UserConsent>,
      deletionRequests: deletionRequests as unknown as Repository<AccountDeletionRequest>,
    });
  });

  it('cria preferencias padrao quando inexistentes', async () => {
    preferences.findOne.mockResolvedValue(null);

    const prefs = await service.getPreferences('user-1');

    expect(prefs.language).toBe('pt-BR');
    expect(prefs.timezone).toBe('America/Sao_Paulo');
    expect(prefs.smsNotifications).toBe(false);
    expect(preferences.save).toHaveBeenCalled();
  });

  it('registra consentimento com versao e data (rastreado)', async () => {
    consents.save.mockImplementation(async (v) => ({ ...v, id: 'c-1', created_at: new Date() }) as UserConsent);

    const consent = await service.recordConsent('user-1', {
      type: 'marketing',
      granted: true,
      version: '2026-07-01',
    });

    const saved = consents.save.mock.calls[0]![0] as UserConsent;
    expect(saved.user).toEqual({ id: 'user-1' });
    expect(saved.consent_type).toBe('marketing');
    expect(saved.granted_at).toBeInstanceOf(Date);
    expect(consent.type).toBe('marketing');
    expect(consent.granted).toBe(true);
  });

  it('atualiza somente preferencias enviadas', async () => {
    preferences.findOne.mockResolvedValue({
      user: { id: 'user-1' },
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
    } as UserPreference);

    const prefs = await service.updatePreferences('user-1', { smsNotifications: true });

    expect(prefs.smsNotifications).toBe(true);
    expect(prefs.language).toBe('pt-BR');
    expect(prefs.emailNotifications).toBe(true);
  });

  it('lista consentimentos ordenados', async () => {
    consents.find.mockResolvedValue([
      {
        id: 'c-1',
        consent_type: 'privacy',
        granted: true,
        version: '2026-07-01',
        granted_at: new Date('2026-07-01T12:00:00.000Z'),
        created_at: new Date('2026-07-01T12:00:00.000Z'),
      } as UserConsent,
    ]);

    const list = await service.listConsents('user-1');

    expect(list).toHaveLength(1);
    expect(list[0]!.type).toBe('privacy');
  });
});

describe('AccountService exclusao com carencia', () => {
  let preferences: ReturnType<typeof mockRepo<UserPreference>>;
  let consents: ReturnType<typeof mockRepo<UserConsent>>;
  let deletionRequests: ReturnType<typeof mockRepo<AccountDeletionRequest>>;
  let service: AccountService;

  beforeEach(() => {
    preferences = mockRepo<UserPreference>();
    consents = mockRepo<UserConsent>();
    deletionRequests = mockRepo<AccountDeletionRequest>();
    service = new AccountService({
      preferences: preferences as unknown as Repository<UserPreference>,
      consents: consents as unknown as Repository<UserConsent>,
      deletionRequests: deletionRequests as unknown as Repository<AccountDeletionRequest>,
    });
  });

  it('cria solicitacao com data agendada no futuro (carencia)', async () => {
    deletionRequests.findOne.mockResolvedValue(null);
    deletionRequests.create.mockImplementation((v) => v as AccountDeletionRequest);
    deletionRequests.save.mockImplementation(async (v) => ({ ...v, id: 'd-1' }) as AccountDeletionRequest);

    const req = await service.requestDeletion('user-1');
    const saved = deletionRequests.save.mock.calls[0]![0] as AccountDeletionRequest;
    expect(saved.status).toBe('pending');
    expect(saved.scheduled_purge_at.getTime()).toBeGreaterThan(Date.now());
    expect(req.status).toBe('pending');
  });

  it('rejeita segunda solicitacao pendente', async () => {
    deletionRequests.findOne.mockResolvedValue({ id: 'd-1', status: 'pending' } as AccountDeletionRequest);
    await expect(service.requestDeletion('user-1')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('cancela solicitacao pendente', async () => {
    deletionRequests.findOne.mockResolvedValue({ id: 'd-1', status: 'pending' } as AccountDeletionRequest);
    deletionRequests.save.mockImplementation(async (v) => v as AccountDeletionRequest);

    await service.cancelDeletion('user-1');
    const saved = deletionRequests.save.mock.calls[0]![0] as AccountDeletionRequest;
    expect(saved.status).toBe('cancelled');
  });

  it('cancel lanca 404 sem solicitacao pendente', async () => {
    deletionRequests.findOne.mockResolvedValue(null);
    await expect(service.cancelDeletion('user-1')).rejects.toMatchObject({ statusCode: 404 });
  });
});
