import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchWallet,
  fetchTransactions,
  fetchWithdrawals,
  requestWithdrawal,
  type WithdrawInput,
} from './api';

export const walletKeys = {
  wallet: ['wallet'] as const,
  transactions: (page: number) => ['wallet', 'transactions', page] as const,
  withdrawals: ['wallet', 'withdrawals'] as const,
};

export function useWallet() {
  return useQuery({ queryKey: walletKeys.wallet, queryFn: fetchWallet });
}

export function useTransactions(page: number) {
  return useQuery({
    queryKey: walletKeys.transactions(page),
    queryFn: () => fetchTransactions(page),
  });
}

export function useWithdrawals() {
  return useQuery({ queryKey: walletKeys.withdrawals, queryFn: fetchWithdrawals });
}

export function useRequestWithdrawal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: WithdrawInput) => requestWithdrawal(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: walletKeys.wallet });
      void client.invalidateQueries({ queryKey: walletKeys.withdrawals });
    },
  });
}
