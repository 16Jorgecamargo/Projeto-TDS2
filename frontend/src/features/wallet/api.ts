import { http } from '../../lib/http';
import type { WithdrawFormInput } from './schemas';

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  pendingBalance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'credit' | 'debit' | 'hold' | 'release';
  amount: number;
  balanceAfter: number;
  referenceType: 'payment' | 'withdrawal' | 'refund' | 'fee' | 'adjustment' | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  walletId: string;
  amount: number;
  paymentMethod: 'pix' | 'bank_transfer';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  destination: string;
  processedAt: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export type WithdrawInput = WithdrawFormInput;

export async function fetchWallet(): Promise<Wallet> {
  const { data } = await http.get<Wallet>('/wallet');
  return data;
}

export async function fetchTransactions(page: number): Promise<Paginated<WalletTransaction>> {
  const { data } = await http.get<Paginated<WalletTransaction>>('/wallet/transactions', {
    params: { page },
  });
  return data;
}

export async function fetchWithdrawals(): Promise<Withdrawal[]> {
  const { data } = await http.get<Withdrawal[]>('/withdrawals');
  return data;
}

export async function requestWithdrawal(input: WithdrawInput): Promise<Withdrawal> {
  const { data } = await http.post<Withdrawal>('/withdrawals', input);
  return data;
}
