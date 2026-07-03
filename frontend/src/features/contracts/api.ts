import axios from 'axios';
import { http } from '../../lib/http';

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
  clientName: string;
  professionalHeadline: string;
  professionalUserId: string;
  createdAt: string;
}

export interface ProgressUpdate {
  id: string;
  contractId: string;
  authorId: string;
  description: string;
  percentage: number | null;
  images: string[];
  createdAt: string;
}

export type PaymentMethod = 'wallet' | 'credit_card' | 'pix' | 'boleto';
export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  contractId: string;
  payerId: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  paidAt: string | null;
  createdAt: string;
}

export async function fetchContracts(): Promise<Contract[]> {
  const { data } = await http.get<Contract[]>('/contracts');
  return data;
}

export async function fetchContract(id: string): Promise<Contract> {
  const { data } = await http.get<Contract>(`/contracts/${id}`);
  return data;
}

export async function fetchProgress(id: string): Promise<ProgressUpdate[]> {
  const { data } = await http.get<ProgressUpdate[]>(`/contracts/${id}/progress`);
  return data;
}

export async function addProgress(
  id: string,
  values: { description: string; percentage: number },
): Promise<ProgressUpdate> {
  const { data } = await http.post<ProgressUpdate>(`/contracts/${id}/progress`, { ...values, images: [] });
  return data;
}

export async function startContract(id: string): Promise<Contract> {
  const { data } = await http.post<Contract>(`/contracts/${id}/start`, {});
  return data;
}

export async function completeContract(id: string): Promise<Contract> {
  const { data } = await http.post<Contract>(`/contracts/${id}/complete`, {});
  return data;
}

export async function openDispute(id: string, reason: string): Promise<void> {
  await http.post(`/contracts/${id}/disputes`, { reason });
}

export async function fetchPayment(contractId: string): Promise<Payment | null> {
  try {
    const { data } = await http.get<Payment>(`/contracts/${contractId}/payment`);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function payContract(contractId: string, method: PaymentMethod): Promise<Payment> {
  const { data } = await http.post<Payment>(`/contracts/${contractId}/payment`, { method });
  return data;
}
