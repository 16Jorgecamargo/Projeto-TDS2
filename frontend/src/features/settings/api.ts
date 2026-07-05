import { http } from '../../lib/http';

export interface Preferences {
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  city: string | null;
  state: string | null;
}

export type ConsentType = 'terms' | 'privacy' | 'marketing' | 'data_processing';

export interface Consent {
  id: string;
  type: ConsentType;
  granted: boolean;
  version: string;
  grantedAt: string;
  createdAt: string;
}

export type DeletionStatus = 'pending' | 'cancelled' | 'completed';

export interface DeletionRequest {
  id: string;
  status: DeletionStatus;
  requestedAt: string;
  scheduledFor: string;
}

export const settingsApi = {
  async getPreferences(): Promise<Preferences> {
    const { data } = await http.get<Preferences>('/account/preferences');
    return data;
  },
  async updatePreferences(payload: Partial<Preferences>): Promise<Preferences> {
    const { data } = await http.patch<Preferences>('/account/preferences', payload);
    return data;
  },
  async listConsents(): Promise<Consent[]> {
    const { data } = await http.get<Consent[]>('/account/consents');
    return data;
  },
  async recordConsent(payload: { type: ConsentType; granted: boolean; version: string }): Promise<Consent> {
    const { data } = await http.post<Consent>('/account/consents', payload);
    return data;
  },
  async requestDeletion(): Promise<DeletionRequest> {
    const { data } = await http.post<DeletionRequest>('/account/deletion');
    return data;
  },
  async cancelDeletion(): Promise<void> {
    await http.delete('/account/deletion');
  },
  async getDeletionStatus(): Promise<DeletionRequest | null> {
    const { data } = await http.get<DeletionRequest | null>('/account/deletion');
    return data;
  },
};
