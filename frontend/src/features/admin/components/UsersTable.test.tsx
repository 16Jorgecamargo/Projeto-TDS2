import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersTable } from './UsersTable';
import { useUsers, useSetUserStatus } from '../queries';

vi.mock('../queries', () => ({ useUsers: vi.fn(), useSetUserStatus: vi.fn() }));

function usersFixture() {
  return {
    data: {
      items: [
        {
          id: 'u1',
          full_name: 'Joao Silva',
          email: 'joao@example.com',
          role: 'client' as const,
          status: 'active' as const,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    },
    isLoading: false,
  };
}

describe('UsersTable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista usuarios com nome, email e status', () => {
    vi.mocked(useUsers).mockReturnValue(usersFixture() as never);
    vi.mocked(useSetUserStatus).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

    render(<UsersTable />);

    expect(screen.getByText('Joao Silva')).toBeInTheDocument();
    expect(screen.getByText('joao@example.com')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('abre modal, exige motivo e confirma mudanca de status', async () => {
    const mutate = vi.fn();
    vi.mocked(useUsers).mockReturnValue(usersFixture() as never);
    vi.mocked(useSetUserStatus).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<UsersTable />);
    await user.click(screen.getByRole('button', { name: 'Mudar status' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Novo status'), 'suspended');
    await user.type(screen.getByLabelText('Motivo'), 'Violacao das diretrizes');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(mutate).toHaveBeenCalledWith({ id: 'u1', status: 'suspended', reason: 'Violacao das diretrizes' });
  });

  it('nao confirma sem motivo preenchido', async () => {
    const mutate = vi.fn();
    vi.mocked(useUsers).mockReturnValue(usersFixture() as never);
    vi.mocked(useSetUserStatus).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<UsersTable />);
    await user.click(screen.getByRole('button', { name: 'Mudar status' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(mutate).not.toHaveBeenCalled();
  });
});
