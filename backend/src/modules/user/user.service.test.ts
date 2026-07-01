import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { UserService } from './user.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import type { User } from '../../infra/database/entities/user.entity.js';

describe('UserService', () => {
  let users: ReturnType<typeof mockRepo<User>>;
  let service: UserService;

  beforeEach(() => {
    users = mockRepo<User>();
    service = new UserService({ users: users as unknown as Repository<User> });
  });

  it('retorna perfil serializando datas', async () => {
    users.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'm@e.com',
      full_name: 'M',
      phone: '+5551',
      role: 'client',
      email_verified_at: new Date('2026-01-01T00:00:00.000Z'),
      avatar_url: null,
    } as unknown as User);

    const profile = await service.getProfile('user-1');
    expect(profile.emailVerifiedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('lanca 404 quando usuario ausente', async () => {
    users.findOne.mockResolvedValue(null);
    await expect(service.getProfile('x')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('atualiza somente campos enviados', async () => {
    users.findOne
      .mockResolvedValueOnce({ id: 'user-1', full_name: 'Old', phone: 'p', email: 'e', role: 'client', email_verified_at: null, avatar_url: null } as unknown as User)
      .mockResolvedValueOnce({ id: 'user-1', full_name: 'New', phone: 'p', email: 'e', role: 'client', email_verified_at: null, avatar_url: null } as unknown as User);
    users.update.mockResolvedValue({ affected: 1 } as never);

    const profile = await service.updateProfile('user-1', { name: 'New' });
    expect(users.update).toHaveBeenCalledWith('user-1', { full_name: 'New' });
    expect(profile.name).toBe('New');
  });
});
