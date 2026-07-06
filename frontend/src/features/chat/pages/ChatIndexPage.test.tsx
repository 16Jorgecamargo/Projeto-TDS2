import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ChatIndexPage } from './ChatIndexPage';

describe('ChatIndexPage', () => {
  it('mostra o estado vazio explicando como abrir uma conversa', () => {
    renderWithProviders(<ChatIndexPage />);
    expect(screen.getByText('Nenhuma conversa selecionada')).toBeInTheDocument();
  });

  it('mostra o botao de voltar', () => {
    renderWithProviders(<ChatIndexPage />);
    expect(screen.getByRole('link', { name: /voltar/i })).toBeInTheDocument();
  });
});
