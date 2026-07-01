import { User } from './user.entity.js';
import { RefreshToken } from './refresh-token.entity.js';
import { PasswordResetToken } from './password-reset-token.entity.js';
import { EmailVerificationToken } from './email-verification-token.entity.js';
import { PhoneVerificationToken } from './phone-verification-token.entity.js';
import { UserOauthAccount } from './user-oauth-account.entity.js';
import { UserPreference } from './user-preference.entity.js';
import { AccountDeletionRequest } from './account-deletion-request.entity.js';
import { UserConsent } from './user-consent.entity.js';
import { PushDeviceToken } from './push-device-token.entity.js';

export {
  User,
  RefreshToken,
  PasswordResetToken,
  EmailVerificationToken,
  PhoneVerificationToken,
  UserOauthAccount,
  UserPreference,
  AccountDeletionRequest,
  UserConsent,
  PushDeviceToken,
};

export const entities = [
  User,
  RefreshToken,
  PasswordResetToken,
  EmailVerificationToken,
  PhoneVerificationToken,
  UserOauthAccount,
  UserPreference,
  AccountDeletionRequest,
  UserConsent,
  PushDeviceToken,
];
