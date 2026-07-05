import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TrustStats } from './TrustStats';
import { useTotalProfessionalsCount } from '../queries';
import { useCategories } from '../../professional/queries';

vi.mock('../queries', () => ({ useTotalProfessionalsCount: vi.fn() }));
vi.mock('../../professional/queries', () => ({ useCategories: vi.fn() }));

describe('TrustStats', () => {
  it('mostra o total real de profissionais e de categorias ativas', async () => {
    vi.mocked(useTotalProfessionalsCount).mockReturnValue({ data: 128, isLoading: false } as never);
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', name: 'A', isActive: true, parentId: null, slug: 'a', icon: null, description: null },
        { id: 'c2', name: 'B', isActive: false, parentId: null, slug: 'b', icon: null, description: null },
      ],
      isLoading: false,
    } as never);

    render(<TrustStats />);

    await waitFor(() => expect(screen.getByText('128')).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText('profissionais cadastrados')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText('categorias de serviço')).toBeInTheDocument();
  });

  it('mostra skeleton enquanto carrega', () => {
    vi.mocked(useTotalProfessionalsCount).mockReturnValue({ data: undefined, isLoading: true } as never);
    vi.mocked(useCategories).mockReturnValue({ data: undefined, isLoading: true } as never);

    const { container } = render(<TrustStats />);

    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });
});
