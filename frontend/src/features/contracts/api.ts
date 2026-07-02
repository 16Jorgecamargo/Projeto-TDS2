import { http } from '../../lib/http';

export type ContractStatus = 'active' | 'completed' | 'cancelled' | 'disputed';

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

export async function completeContract(id: string): Promise<Contract> {
  const { data } = await http.post<Contract>(`/contracts/${id}/complete`, {});
  return data;
}

export async function openDispute(id: string, reason: string): Promise<void> {
  await http.post(`/contracts/${id}/disputes`, { reason });
}
