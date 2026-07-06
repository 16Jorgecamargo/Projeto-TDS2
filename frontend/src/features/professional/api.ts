import { http } from '../../lib/http';

export interface ProfessionalProfile {
  id: string;
  userId: string;
  fullName: string;
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

export interface PortfolioImage {
  id: string;
  imageUrl: string;
  position: number;
}

export interface PortfolioItem {
  id: string;
  categoryId: string | null;
  title: string;
  description: string | null;
  completedAt: string | null;
  images: PortfolioImage[];
}

export interface AvailabilitySlot {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface ServiceArea {
  id: string;
  city: string;
  state: string;
  radiusKm: number | null;
}

export interface PublicProfile extends ProfessionalProfile {
  categories: { id: string; name: string; slug: string }[];
  experiences: unknown[];
  education: unknown[];
  certifications: unknown[];
  serviceAreas: ServiceArea[];
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
  }): Promise<ProfessionalProfile> {
    const { data } = await http.put<ProfessionalProfile>('/professionals/me', { ...payload, serviceRadiusKm: null });
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
  async getPublicProfile(id: string): Promise<PublicProfile> {
    const { data } = await http.get<PublicProfile>(`/professionals/${id}`);
    return data;
  },
  async listPortfolio(professionalId: string): Promise<PortfolioItem[]> {
    const { data } = await http.get<PortfolioItem[]>(`/portfolio/${professionalId}/items`);
    return data;
  },
  async createPortfolioItem(payload: {
    categoryId: string | null;
    title: string;
    description: string | null;
    completedAt: string | null;
  }): Promise<PortfolioItem> {
    const { data } = await http.post<PortfolioItem>('/portfolio/me/items', payload);
    return data;
  },
  async removePortfolioItem(id: string): Promise<void> {
    await http.delete(`/portfolio/me/items/${id}`);
  },
  async addPortfolioImage(itemId: string, payload: { imageUrl: string; position: number }): Promise<PortfolioImage> {
    const { data } = await http.post<PortfolioImage>(`/portfolio/me/items/${itemId}/images`, payload);
    return data;
  },
  async removePortfolioImage(id: string): Promise<void> {
    await http.delete(`/portfolio/me/images/${id}`);
  },
  async listSlots(professionalId: string): Promise<AvailabilitySlot[]> {
    const { data } = await http.get<AvailabilitySlot[]>(`/availability/${professionalId}/slots`);
    return data;
  },
  async addSlot(payload: { weekday: number; startTime: string; endTime: string }): Promise<AvailabilitySlot> {
    const { data } = await http.post<AvailabilitySlot>('/availability/me/slots', payload);
    return data;
  },
  async removeSlot(id: string): Promise<void> {
    await http.delete(`/availability/me/slots/${id}`);
  },
  async addServiceArea(payload: { city: string; state: string; radiusKm: number | null }): Promise<ServiceArea> {
    const { data } = await http.post<ServiceArea>('/professionals/me/service-areas', payload);
    return data;
  },
  async removeServiceArea(id: string): Promise<void> {
    await http.delete(`/professionals/me/service-areas/${id}`);
  },
};
