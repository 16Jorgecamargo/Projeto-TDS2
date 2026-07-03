import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { DeleteAccountPanel } from './components/DeleteAccountPanel';
import { ConsentsPanel } from './components/ConsentsPanel';
import { settingsApi } from './api';

vi.mock('./api', () => ({
  settingsApi: {
    getDeletionStatus: vi.fn(),
    requestDeletion: vi.fn(),
    cancelDeletion: vi.fn(),
    listConsents: vi.fn(),
    recordConsent: vi.fn(),
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
    const button = await screen.findByRole('button', { name: /solicitar exclusão/i });
    fireEvent.click(button);
    const confirmButton = await screen.findByRole('button', { name: /confirmar exclusão/i });
    fireEvent.click(confirmButton);
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
    const cancel = await screen.findByRole('button', { name: /cancelar exclusão/i });
    fireEvent.click(cancel);
    await waitFor(() => expect(settingsApi.cancelDeletion).toHaveBeenCalled());
  });
});

describe('ConsentsPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('usa o registro mais recente por tipo quando a lista vem em ordem decrescente', async () => {
    vi.mocked(settingsApi.listConsents).mockResolvedValue([
      {
        id: 'c-2',
        type: 'marketing',
        granted: false,
        version: '2026-07-01',
        grantedAt: '2026-06-15T00:00:00.000Z',
        createdAt: '2026-06-15T00:00:00.000Z',
      },
      {
        id: 'c-1',
        type: 'marketing',
        granted: true,
        version: '2026-01-01',
        grantedAt: '2026-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    render(<ConsentsPanel />, { wrapper });
    const checkbox = await screen.findByRole('checkbox', { name: /comunicações de marketing/i });
    await waitFor(() => expect(checkbox).not.toBeChecked());
  });
});
