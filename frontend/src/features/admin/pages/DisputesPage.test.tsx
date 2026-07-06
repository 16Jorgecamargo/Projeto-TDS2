import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DisputesPage } from './DisputesPage';

vi.mock('../components/DisputesTable', () => ({ DisputesTable: () => <div>disputes-table</div> }));

describe('DisputesPage', () => {
  it('mostra titulo e a tabela de disputas', () => {
    render(<DisputesPage />);
    expect(screen.getByRole('heading', { name: 'Disputas' })).toBeInTheDocument();
    expect(screen.getByText('disputes-table')).toBeInTheDocument();
  });
});
