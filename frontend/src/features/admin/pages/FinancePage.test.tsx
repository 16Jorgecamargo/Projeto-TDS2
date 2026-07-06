import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinancePage } from './FinancePage';

vi.mock('../components/FinanceManager', () => ({ FinanceManager: () => <div>finance-manager</div> }));

describe('FinancePage', () => {
  it('mostra titulo e o gerenciador financeiro', () => {
    render(<FinancePage />);
    expect(screen.getByRole('heading', { name: 'Financeiro' })).toBeInTheDocument();
    expect(screen.getByText('finance-manager')).toBeInTheDocument();
  });
});
