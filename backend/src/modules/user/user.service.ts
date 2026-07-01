import type { Repository } from 'typeorm';
import { User } from '../../infra/database/entities/user.entity.js';
import { NotFoundError } from '../../shared/errors.js';
import type { UserProfile, UpdateProfileInput } from './user.schemas.js';

interface UserDeps {
  users: Repository<User>;
}

export class UserService {
  constructor(private readonly deps: UserDeps) {}

  async getProfile(id: string): Promise<UserProfile> {
    const user = await this.deps.users.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundError('Usuario nao encontrado');
    }
    return this.toProfile(user);
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<UserProfile> {
    const user = await this.deps.users.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundError('Usuario nao encontrado');
    }
    const patch: Partial<User> = {};
    if (input.name !== undefined) patch.full_name = input.name;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
    if (Object.keys(patch).length > 0) {
      await this.deps.users.update(id, patch);
    }
    return this.getProfile(id);
  }

  private toProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.full_name,
      phone: user.phone,
      role: user.role,
      emailVerifiedAt: user.email_verified_at ? user.email_verified_at.toISOString() : null,
      avatarUrl: user.avatar_url ?? null,
    };
  }
}
