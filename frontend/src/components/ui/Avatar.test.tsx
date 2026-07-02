import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renderiza as iniciais quando não há imagem', () => {
    render(<Avatar name="Maria Souza" />);
    expect(screen.getByRole('img', { name: 'Maria Souza' })).toHaveTextContent('MS');
  });

  it('renderiza a imagem quando src é informado', () => {
    render(<Avatar name="João Silva" src="https://example.com/joao.jpg" />);
    const img = screen.getByRole('img', { name: 'João Silva' }) as HTMLImageElement;
    expect(img.tagName).toBe('IMG');
    expect(img.src).toBe('https://example.com/joao.jpg');
  });

  it('usa apenas a primeira inicial para nome de uma palavra', () => {
    render(<Avatar name="Admin" />);
    expect(screen.getByRole('img', { name: 'Admin' })).toHaveTextContent('A');
  });
});
