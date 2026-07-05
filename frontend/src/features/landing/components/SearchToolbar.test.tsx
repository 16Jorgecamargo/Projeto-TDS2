import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchToolbar } from './SearchToolbar';

describe('SearchToolbar', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('so chama onQueryChange apos 400ms sem digitar (debounce)', () => {
    const onQueryChange = vi.fn();
    render(
      <SearchToolbar
        query=""
        onQueryChange={onQueryChange}
        onOpenFilters={vi.fn()}
        sort="rating"
        onSortChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Buscar profissionais'), { target: { value: 'eletricista' } });
    expect(onQueryChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onQueryChange).toHaveBeenCalledWith('eletricista');
  });

  it('chama onOpenFilters ao clicar no botao de filtros', () => {
    const onOpenFilters = vi.fn();
    render(
      <SearchToolbar
        query=""
        onQueryChange={vi.fn()}
        onOpenFilters={onOpenFilters}
        sort="rating"
        onSortChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /filtros/i }));

    expect(onOpenFilters).toHaveBeenCalled();
  });

  it('chama onSortChange ao trocar a ordenacao', () => {
    const onSortChange = vi.fn();
    render(
      <SearchToolbar
        query=""
        onQueryChange={vi.fn()}
        onOpenFilters={vi.fn()}
        sort="rating"
        onSortChange={onSortChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'price' } });

    expect(onSortChange).toHaveBeenCalledWith('price');
  });

  it('nao chama onQueryChange no mount mesmo com query inicial preenchida', () => {
    const onQueryChange = vi.fn();
    render(
      <SearchToolbar
        query="eletricista"
        onQueryChange={onQueryChange}
        onOpenFilters={vi.fn()}
        sort="rating"
        onSortChange={vi.fn()}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it('usa a versao mais recente de onQueryChange quando a prop muda durante o debounce', () => {
    const staleOnQueryChange = vi.fn();
    const freshOnQueryChange = vi.fn();
    const { rerender } = render(
      <SearchToolbar
        query=""
        onQueryChange={staleOnQueryChange}
        onOpenFilters={vi.fn()}
        sort="rating"
        onSortChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Buscar profissionais'), { target: { value: 'eletricista' } });

    rerender(
      <SearchToolbar
        query=""
        onQueryChange={freshOnQueryChange}
        onOpenFilters={vi.fn()}
        sort="rating"
        onSortChange={vi.fn()}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(freshOnQueryChange).toHaveBeenCalledWith('eletricista');
    expect(staleOnQueryChange).not.toHaveBeenCalled();
  });
});
