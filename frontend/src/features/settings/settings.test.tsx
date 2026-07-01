import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { DeleteAccountPanel } from './components/DeleteAccountPanel';
import { settingsApi } from './api';

vi.mock('./api', () => ({
  settingsApi: {
    getDeletionStatus: vi.fn(),
    requestDeletion: vi.fn(),
    cancelDeletion: vi.fn(),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('DeleteAccountPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('solicita exclusao quando nao ha pendencia', async () => {
    vi.mocked(settingsApi.getDeletionStatus).mockResolvedValue(null);
    vi.mocked(settingsApi.requestDeletion).mockResolvedValue({
      id: 'd-1',
      status: 'pending',
      requestedAt: '2026-07-01T00:00:00.000Z',
      scheduledFor: '2026-07-31T00:00:00.000Z',
    });

    render(<DeleteAccountPanel />, { wrapper });
    const button = await screen.findByRole('button', { name: /solicitar exclusao/i });
    fireEvent.click(button);
    await waitFor(() => expect(settingsApi.requestDeletion).toHaveBeenCalled());
  });

  it('mostra carencia e permite cancelar quando pendente', async () => {
    vi.mocked(settingsApi.getDeletionStatus).mockResolvedValue({
      id: 'd-1',
      status: 'pending',
      requestedAt: '2026-07-01T00:00:00.000Z',
      scheduledFor: '2026-07-31T00:00:00.000Z',
    });
    render(<DeleteAccountPanel />, { wrapper });
    const cancel = await screen.findByRole('button', { name: /cancelar exclusao/i });
    fireEvent.click(cancel);
    await waitFor(() => expect(settingsApi.cancelDeletion).toHaveBeenCalled());
  });
});
