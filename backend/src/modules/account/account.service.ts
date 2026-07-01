import type { Repository } from 'typeorm';
import { UserPreference } from '../../infra/database/entities/user-preference.entity.js';
import { UserConsent } from '../../infra/database/entities/user-consent.entity.js';
import { User } from '../../infra/database/entities/user.entity.js';
import type {
  PreferencesDto,
  UpdatePreferencesInput,
  RecordConsentInput,
  ConsentDto,
} from './account.schemas.js';

interface AccountDeps {
  preferences: Repository<UserPreference>;
  consents: Repository<UserConsent>;
}

const DEFAULT_PREFERENCES = {
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  email_notifications: true,
  push_notifications: true,
  sms_notifications: false,
};

export class AccountService {
  constructor(private readonly deps: AccountDeps) {}

  async getPreferences(userId: string): Promise<PreferencesDto> {
    let prefs = await this.deps.preferences.findOne({ where: { user: { id: userId } } });
    if (!prefs) {
      prefs = await this.deps.preferences.save(
        this.deps.preferences.create({ user: { id: userId } as User, ...DEFAULT_PREFERENCES }),
      );
    }
    return this.toPrefsDto(prefs);
  }

  async updatePreferences(userId: string, input: UpdatePreferencesInput): Promise<PreferencesDto> {
    const existing = await this.deps.preferences.findOne({ where: { user: { id: userId } } });
    const base =
      existing ?? this.deps.preferences.create({ user: { id: userId } as User, ...DEFAULT_PREFERENCES });
    if (input.language !== undefined) base.language = input.language;
    if (input.timezone !== undefined) base.timezone = input.timezone;
    if (input.emailNotifications !== undefined) base.email_notifications = input.emailNotifications;
    if (input.pushNotifications !== undefined) base.push_notifications = input.pushNotifications;
    if (input.smsNotifications !== undefined) base.sms_notifications = input.smsNotifications;
    const saved = await this.deps.preferences.save(base);
    return this.toPrefsDto(saved);
  }

  async listConsents(userId: string): Promise<ConsentDto[]> {
    const rows = await this.deps.consents.find({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' },
    });
    return rows.map((c) => this.toConsentDto(c));
  }

  async recordConsent(userId: string, input: RecordConsentInput): Promise<ConsentDto> {
    const entity = this.deps.consents.create({
      user: { id: userId } as User,
      consent_type: input.type,
      granted: input.granted,
      version: input.version,
      granted_at: new Date(),
    });
    const saved = await this.deps.consents.save(entity);
    return this.toConsentDto(saved);
  }

  private toPrefsDto(p: UserPreference): PreferencesDto {
    return {
      language: p.language,
      timezone: p.timezone,
      emailNotifications: p.email_notifications,
      pushNotifications: p.push_notifications,
      smsNotifications: p.sms_notifications,
    };
  }

  private toConsentDto(c: UserConsent): ConsentDto {
    return {
      id: c.id,
      type: c.consent_type,
      granted: c.granted,
      version: c.version,
      grantedAt: c.granted_at.toISOString(),
      createdAt: c.created_at.toISOString(),
    };
  }
}
