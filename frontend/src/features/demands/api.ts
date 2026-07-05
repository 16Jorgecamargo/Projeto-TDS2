import { http } from '../../lib/http';
import type { DemandFormValues, QuoteFormValues } from './schemas';

export type DemandStatus = 'open' | 'in_progress' | 'closed' | 'cancelled';

export interface DemandImage {
  url: string;
  position: number;
}

export interface Demand {
  id: string;
  clientId: string;
  categoryId: string;
  title: string;
  description: string;
  budgetMin: number | null;
  budgetMax: number | null;
  status: DemandStatus;
  city: string;
  state: string;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  zipCode: string | null;
  images: DemandImage[];
  tagIds: string[];
  createdAt: string;
}

export interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface Quote {
  id: string;
  demandId: string;
  professionalId: string;
  message: string | null;
  total: number;
  status: QuoteStatus;
  validUntil: string | null;
  items: QuoteItem[];
  createdAt: string;
}

export type ContractStatus = 'active' | 'completed' | 'cancelled' | 'disputed';

export type ScheduleStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

export interface Schedule {
  id: string;
  scheduledDate: string;
  durationMinutes: number | null;
  notes: string | null;
  status: ScheduleStatus;
}

export interface Contract {
  id: string;
  demandId: string;
  quoteId: string;
  clientId: string;
  professionalId: string;
  total: number;
  status: ContractStatus;
  cancelledBy: string | null;
  cancellationReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  schedule: Schedule | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export async function fetchDemands(params: { page?: number; mine?: boolean }): Promise<Paginated<Demand>> {
  const { data } = await http.get<Paginated<Demand>>('/demands', { params });
  return data;
}

export async function fetchDemand(id: string): Promise<Demand> {
  const { data } = await http.get<Demand>(`/demands/${id}`);
  return data;
}

export async function publishDemand(values: DemandFormValues, images: string[] = []): Promise<Demand> {
  const { data } = await http.post<Demand>('/demands', {
    ...values,
    tagIds: [],
    images: images.map((url, position) => ({ url, position })),
  });
  return data;
}

export async function fetchDemandQuotes(demandId: string): Promise<Quote[]> {
  const { data } = await http.get<Quote[]>(`/demands/${demandId}/quotes`);
  return data;
}

export async function acceptQuote(quoteId: string): Promise<Contract> {
  const { data } = await http.post<Contract>(`/quotes/${quoteId}/accept`, { schedule: null });
  return data;
}

export async function inviteProfessional(demandId: string, professionalId: string): Promise<void> {
  await http.post(`/demands/${demandId}/invitations`, { professionalId });
}

export async function createQuote(demandId: string, values: QuoteFormValues): Promise<Quote> {
  const { data } = await http.post<Quote>(`/demands/${demandId}/quotes`, {
    message: values.message,
    validUntil: values.validUntil ? new Date(values.validUntil).toISOString() : null,
    items: values.items,
  });
  return data;
}
