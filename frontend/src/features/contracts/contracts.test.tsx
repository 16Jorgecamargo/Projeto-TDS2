import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContractProgress } from './components/ContractProgress';

describe('ContractProgress', () => {
  it('renderiza atualizações em ordem com percentual', () => {
    render(
      <ContractProgress
        updates={[
          {
            id: 'p1',
            contractId: 'c1',
            authorId: 'pro1',
            description: 'Fase 1',
            percentage: 50,
            images: [],
            createdAt: '2026-07-01T12:00:00Z',
          },
        ]}
      />,
    );
    expect(screen.getByText('Fase 1')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('não exibe percentual quando ausente', () => {
    render(
      <ContractProgress
        updates={[
          {
            id: 'p2',
            contractId: 'c1',
            authorId: 'pro1',
            description: 'Fase sem percentual',
            percentage: null,
            images: [],
            createdAt: '2026-07-01T12:00:00Z',
          },
        ]}
      />,
    );
    expect(screen.getByText('Fase sem percentual')).toBeInTheDocument();
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });
});
