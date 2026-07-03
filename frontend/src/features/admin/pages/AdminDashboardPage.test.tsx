import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminDashboardPage } from './AdminDashboardPage';

vi.mock('../components/ReportsTable', () => ({ ReportsTable: () => <div>reports-table</div> }));
vi.mock('../components/DisputesTable', () => ({ DisputesTable: () => <div>disputes-table</div> }));

describe('AdminDashboardPage', () => {
  it('mostra titulo, secao de denuncias e secao de disputas dentro de cards', () => {
    render(<AdminDashboardPage />);

    expect(screen.getByRole('heading', { name: 'Moderação' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Denúncias' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Disputas' })).toBeInTheDocument();
    expect(screen.getByText('reports-table')).toBeInTheDocument();
    expect(screen.getByText('disputes-table')).toBeInTheDocument();
  });
});
