import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FavoriteButton } from './FavoriteButton';
import { addFavorite, removeFavorite } from '../api';

vi.mock('../api', () => ({
  fetchFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));

function renderButton(props: { professionalId: string; isFavorite: boolean }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FavoriteButton {...props} />
    </QueryClientProvider>,
  );
}

describe('FavoriteButton', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra estado nao favoritado e chama addFavorite ao clicar', async () => {
    vi.mocked(addFavorite).mockResolvedValue({ id: 'f1', professionalId: 'p1', createdAt: '' });
    const user = userEvent.setup();
    renderButton({ professionalId: 'p1', isFavorite: false });

    const button = screen.getByRole('button', { name: 'Adicionar aos favoritos' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);

    expect(addFavorite).toHaveBeenCalledWith('p1');
  });

  it('mostra estado favoritado e chama removeFavorite ao clicar', async () => {
    vi.mocked(removeFavorite).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderButton({ professionalId: 'p1', isFavorite: true });

    const button = screen.getByRole('button', { name: 'Remover dos favoritos' });
    expect(button).toHaveAttribute('aria-pressed', 'true');

    await user.click(button);

    expect(removeFavorite).toHaveBeenCalledWith('p1');
  });

  it('nao propaga o clique para um Link ancestral', async () => {
    vi.mocked(addFavorite).mockResolvedValue({ id: 'f1', professionalId: 'p1', createdAt: '' });
    const onParentClick = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <div onClick={onParentClick}>
          <FavoriteButton professionalId="p1" isFavorite={false} />
        </div>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button'));

    expect(onParentClick).not.toHaveBeenCalled();
  });
});
