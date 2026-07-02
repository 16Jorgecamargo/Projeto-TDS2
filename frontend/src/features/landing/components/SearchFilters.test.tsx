import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { SearchFilters } from './SearchFilters';
import { useCategories } from '../../professional/queries';

vi.mock('../../professional/queries', () => ({ useCategories: vi.fn() }));

describe('SearchFilters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama onChange ao digitar na cidade', async () => {
    vi.mocked(useCategories).mockReturnValue({ data: [] } as never);
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <SearchFilters
        value={{}}
        onChange={onChange}
        onlyAvailable={false}
        onOnlyAvailableChange={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Cidade'), 'S');

    expect(onChange).toHaveBeenCalledWith({ city: 'S' });
  });

  it('lista categorias ativas no seletor', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', name: 'Eletricista', isActive: true, parentId: null, slug: 'eletricista', icon: null, description: null },
        { id: 'c2', name: 'Inativa', isActive: false, parentId: null, slug: 'inativa', icon: null, description: null },
      ],
    } as never);
    renderWithProviders(
      <SearchFilters value={{}} onChange={vi.fn()} onlyAvailable={false} onOnlyAvailableChange={vi.fn()} />,
    );

    expect(screen.getByRole('option', { name: 'Eletricista' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Inativa' })).not.toBeInTheDocument();
  });

  it('chama onOnlyAvailableChange ao marcar o checkbox', async () => {
    vi.mocked(useCategories).mockReturnValue({ data: [] } as never);
    const onOnlyAvailableChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <SearchFilters value={{}} onChange={vi.fn()} onlyAvailable={false} onOnlyAvailableChange={onOnlyAvailableChange} />,
    );

    await user.click(screen.getByLabelText('Disponível agora'));

    expect(onOnlyAvailableChange).toHaveBeenCalledWith(true);
  });
});
