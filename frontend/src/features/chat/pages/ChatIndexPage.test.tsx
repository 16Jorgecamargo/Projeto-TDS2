import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatIndexPage } from './ChatIndexPage';

describe('ChatIndexPage', () => {
  it('mostra o estado vazio explicando como abrir uma conversa', () => {
    render(<ChatIndexPage />);
    expect(screen.getByText('Nenhuma conversa selecionada')).toBeInTheDocument();
  });
});
