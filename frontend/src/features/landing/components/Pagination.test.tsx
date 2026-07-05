import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('nao renderiza nada quando total cabe em uma pagina', () => {
    const { container } = render(<Pagination page={1} limit={12} total={10} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza numeros de pagina e marca a pagina atual com aria-current', () => {
    render(<Pagination page={2} limit={10} total={35} onPageChange={vi.fn()} />);
    const currentPage = screen.getByRole('button', { name: '2' });
    expect(currentPage).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '1' })).not.toHaveAttribute('aria-current');
  });

  it('chama onPageChange ao clicar em um numero de pagina', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} limit={10} total={35} onPageChange={onPageChange} />);
    screen.getByRole('button', { name: '3' }).click();
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('desabilita Anterior na primeira pagina e Proxima na ultima', () => {
    render(<Pagination page={1} limit={10} total={35} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).not.toBeDisabled();
  });

  it('usa nav com aria-label Paginação', () => {
    render(<Pagination page={1} limit={10} total={35} onPageChange={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Paginação' })).toBeInTheDocument();
  });
});
