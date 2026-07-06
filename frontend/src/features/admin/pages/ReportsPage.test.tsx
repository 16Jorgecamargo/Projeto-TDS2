import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportsPage } from './ReportsPage';

vi.mock('../components/ReportsTable', () => ({ ReportsTable: () => <div>reports-table</div> }));

describe('ReportsPage', () => {
  it('mostra titulo e a tabela de denuncias', () => {
    render(<ReportsPage />);
    expect(screen.getByRole('heading', { name: 'Denúncias' })).toBeInTheDocument();
    expect(screen.getByText('reports-table')).toBeInTheDocument();
  });
});
