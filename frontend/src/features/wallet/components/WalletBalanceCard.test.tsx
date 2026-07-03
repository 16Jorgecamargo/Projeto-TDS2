import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WalletBalanceCard } from './WalletBalanceCard';

describe('WalletBalanceCard', () => {
  it('mostra saldo disponivel e pendente formatados em reais', () => {
    render(<WalletBalanceCard balance={270} pendingBalance={30} />);

    expect(screen.getByText('R$ 270,00')).toBeInTheDocument();
    expect(screen.getByText('Pendente: R$ 30,00')).toBeInTheDocument();
  });
});
