import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionList } from './TransactionList';

describe('TransactionList', () => {
  it('mostra estado vazio quando nao ha transacoes', () => {
    render(<TransactionList transactions={[]} />);
    expect(screen.getByText('Nenhuma movimentação ainda')).toBeInTheDocument();
  });

  it('lista transacoes com sinal e cor conforme o tipo', () => {
    render(
      <TransactionList
        transactions={[
          {
            id: 't1', walletId: 'w1', type: 'credit', amount: 270, balanceAfter: 270,
            referenceType: 'payment', referenceId: null, description: 'Recebimento de contrato',
            createdAt: '2026-07-01T12:00:00Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('Recebimento de contrato')).toBeInTheDocument();
    expect(screen.getByText('+R$ 270,00')).toBeInTheDocument();
  });
});
