import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditTable } from './AuditTable';
import { useAudit } from '../queries';

vi.mock('../queries', () => ({ useAudit: vi.fn() }));

describe('AuditTable', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista entradas de auditoria com acao e data', () => {
    vi.mocked(useAudit).mockReturnValue({
      data: {
        items: [
          {
            id: 'a1',
            userId: 'admin-1',
            action: 'admin.user.status_changed',
            entityType: 'user',
            entityId: 'u1',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      },
      isLoading: false,
    } as never);

    render(<AuditTable />);

    expect(screen.getByText('admin.user.status_changed')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('mostra vazio quando nao ha registros', () => {
    vi.mocked(useAudit).mockReturnValue({
      data: { items: [], page: 1, limit: 20, total: 0 },
      isLoading: false,
    } as never);

    render(<AuditTable />);

    expect(screen.getByText('Nenhum registro de auditoria encontrado.')).toBeInTheDocument();
  });
});
