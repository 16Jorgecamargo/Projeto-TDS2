import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FilterBar } from './FilterBar';
import { useCategories } from '../../professional/queries';

vi.mock('../../professional/queries', () => ({ useCategories: vi.fn() }));

describe('FilterBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', name: 'Eletricista', isActive: true, parentId: null, slug: 'eletricista', icon: null, description: null },
        { id: 'c2', name: 'Inativa', isActive: false, parentId: null, slug: 'inativa', icon: null, description: null },
      ],
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lista categorias ativas no seletor', () => {
    render(<FilterBar value={{}} onChange={vi.fn()} onlyAvailable={false} onOnlyAvailableChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'Eletricista' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Inativa' })).not.toBeInTheDocument();
  });

  it('so chama onChange apos 400ms sem digitar na cidade (debounce)', () => {
    const onChange = vi.fn();
    render(<FilterBar value={{}} onChange={onChange} onlyAvailable={false} onOnlyAvailableChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'São Paulo' } });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ city: 'São Paulo' }));
  });

  it('mostra erro e nao chama onChange quando UF e invalida', () => {
    const onChange = vi.fn();
    render(<FilterBar value={{}} onChange={onChange} onlyAvailable={false} onOnlyAvailableChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('UF'), { target: { value: 'S' } });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByText('UF invalida')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('chama onChange imediatamente ao trocar categoria (sem debounce)', () => {
    const onChange = vi.fn();
    render(<FilterBar value={{}} onChange={onChange} onlyAvailable={false} onOnlyAvailableChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'c1' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'c1' }));
  });

  it('chama onOnlyAvailableChange ao marcar o checkbox', () => {
    const onOnlyAvailableChange = vi.fn();
    render(
      <FilterBar value={{}} onChange={vi.fn()} onlyAvailable={false} onOnlyAvailableChange={onOnlyAvailableChange} />,
    );

    fireEvent.click(screen.getByLabelText('Disponível agora'));

    expect(onOnlyAvailableChange).toHaveBeenCalledWith(true);
  });
});
