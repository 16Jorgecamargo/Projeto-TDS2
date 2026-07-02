import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renderiza título e descrição', () => {
    render(<EmptyState title="Nenhum contrato" description="Seus contratos aparecerão aqui." />);
    expect(screen.getByText('Nenhum contrato')).toBeInTheDocument();
    expect(screen.getByText('Seus contratos aparecerão aqui.')).toBeInTheDocument();
  });

  it('renderiza a ação quando informada', () => {
    render(<EmptyState title="Nenhuma demanda" action={<button>Publicar demanda</button>} />);
    expect(screen.getByRole('button', { name: 'Publicar demanda' })).toBeInTheDocument();
  });

  it('não quebra sem descrição nem ação', () => {
    render(<EmptyState title="Vazio" />);
    expect(screen.getByText('Vazio')).toBeInTheDocument();
  });
});
