import { http } from '../../lib/http';

export interface ProfessionalProfile {
  id: string;
  userId: string;
  headline: string;
  bio: string | null;
  yearsExperience: number | null;
  hourlyRate: number | null;
  serviceRadiusKm: number | null;
  ratingAverage: number;
  ratingCount: number;
  isAvailable: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export interface CategoryOption {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
}

export interface TagOption {
  id: string;
  name: string;
  slug: string;
}

export const professionalApi = {
  async getMyProfile(): Promise<ProfessionalProfile> {
    const { data } = await http.get<ProfessionalProfile>('/professionals/me');
    return data;
  },
  async upsertProfile(payload: {
    headline: string;
    bio: string | null;
    yearsExperience: number | null;
    hourlyRate: number | null;
    serviceRadiusKm: number | null;
  }): Promise<ProfessionalProfile> {
    const { data } = await http.put<ProfessionalProfile>('/professionals/me', payload);
    return data;
  },
  async listPublicCategories(): Promise<CategoryOption[]> {
    const { data } = await http.get<CategoryOption[]>('/categories');
    return data;
  },
  async listPublicTags(): Promise<TagOption[]> {
    const { data } = await http.get<TagOption[]>('/tags');
    return data;
  },
  async setCategories(ids: string[]): Promise<void> {
    await http.put('/professionals/me/categories', { ids });
  },
  async setTags(ids: string[]): Promise<void> {
    await http.put('/professionals/me/tags', { ids });
  },
};
