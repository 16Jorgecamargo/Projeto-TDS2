import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renderiza iniciais quando não há src', () => {
    render(<Avatar name="Maria Silva" />);
    expect(screen.getByText('MS')).toBeInTheDocument();
  });

  it('renderiza imagem quando há src', () => {
    render(<Avatar name="Maria Silva" src="https://example.com/foto.jpg" />);
    expect(screen.getByRole('img', { name: 'Maria Silva' })).toHaveAttribute(
      'src',
      'https://example.com/foto.jpg',
    );
  });

  it('cai para iniciais quando a imagem falha ao carregar', () => {
    render(<Avatar name="Maria Silva" src="https://example.com/quebrada.jpg" />);
    const img = screen.getByRole('img', { name: 'Maria Silva' });
    fireEvent.error(img);
    expect(screen.getByText('MS')).toBeInTheDocument();
  });

  it('aplica o tamanho xl', () => {
    render(<Avatar name="Maria Silva" size="xl" />);
    expect(screen.getByText('MS')).toHaveClass('h-20');
  });

  it('renderiza o indicador de status', () => {
    render(<Avatar name="Maria Silva" status="online" />);
    expect(document.querySelector('[aria-hidden="true"]')).toHaveClass('bg-success');
  });
});
