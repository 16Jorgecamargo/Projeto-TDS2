import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditPage } from './AuditPage';

vi.mock('../components/AuditTable', () => ({ AuditTable: () => <div>audit-table</div> }));

describe('AuditPage', () => {
  it('mostra titulo e a tabela de auditoria', () => {
    render(<AuditPage />);
    expect(screen.getByRole('heading', { name: 'Auditoria' })).toBeInTheDocument();
    expect(screen.getByText('audit-table')).toBeInTheDocument();
  });
});
