import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renderiza titulo, subtitulo e acao', () => {
    render(<PageHeader title="Resultados da busca" subtitle="42 profissionais encontrados" action={<button>Ação</button>} />);
    expect(screen.getByRole('heading', { name: 'Resultados da busca' })).toBeInTheDocument();
    expect(screen.getByText('42 profissionais encontrados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ação' })).toBeInTheDocument();
  });

  it('subtitulo tem aria-live polite para anunciar mudanca de contagem', () => {
    render(<PageHeader title="Resultados" subtitle="10 resultados" />);
    expect(screen.getByText('10 resultados')).toHaveAttribute('aria-live', 'polite');
  });

  it('renderiza sem subtitulo/acao quando nao informados', () => {
    render(<PageHeader title="Resultados" />);
    expect(screen.getByRole('heading', { name: 'Resultados' })).toBeInTheDocument();
  });
});
