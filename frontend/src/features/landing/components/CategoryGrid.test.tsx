import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CategoryGrid } from './CategoryGrid';
import { useCategories } from '../../professional/queries';

vi.mock('../../professional/queries', () => ({ useCategories: vi.fn() }));

function makeCategories(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `c${index}`,
    parentId: null,
    name: `Categoria ${index}`,
    slug: `categoria-${index}`,
    icon: null,
    description: null,
    isActive: true,
  }));
}

type MediaQueryListener = (event: MediaQueryListEvent) => void;

function mockMatchMedia(initialMatches: Record<string, boolean>) {
  const listeners = new Map<string, Set<MediaQueryListener>>();
  const matches = { ...initialMatches };

  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    if (!listeners.has(query)) listeners.set(query, new Set());
    return {
      get matches() {
        return matches[query] ?? false;
      },
      media: query,
      addEventListener: (_: string, listener: MediaQueryListener) => {
        listeners.get(query)?.add(listener);
      },
      removeEventListener: (_: string, listener: MediaQueryListener) => {
        listeners.get(query)?.delete(listener);
      },
    } as unknown as MediaQueryList;
  });

  return {
    setMatches(query: string, value: boolean) {
      matches[query] = value;
      act(() => {
        listeners.get(query)?.forEach((listener) => listener({ matches: value } as MediaQueryListEvent));
      });
    },
  };
}

const TABLET_QUERY = '(min-width: 640px)';
const DESKTOP_QUERY = '(min-width: 1024px)';

describe('CategoryGrid', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza categorias ativas como cards com link de navegacao', () => {
    mockMatchMedia({ [TABLET_QUERY]: false, [DESKTOP_QUERY]: false });
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', parentId: null, name: 'Eletrica', slug: 'eletrica', icon: null, description: null, isActive: true },
        { id: 'c2', parentId: null, name: 'Inativa', slug: 'inativa', icon: null, description: null, isActive: false },
      ],
    } as never);

    render(
      <MemoryRouter>
        <CategoryGrid />
      </MemoryRouter>,
    );

    expect(screen.getByText('Eletrica')).toBeInTheDocument();
    expect(screen.queryByText('Inativa')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Eletrica' })).toHaveAttribute('href', '/search?categoryId=c1');
  });

  it('usa icone especifico por categoria em vez de um icone generico unico', () => {
    mockMatchMedia({ [TABLET_QUERY]: false, [DESKTOP_QUERY]: false });
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', parentId: null, name: 'Elétrica residencial', slug: 'eletrica', icon: null, description: null, isActive: true },
        { id: 'c2', parentId: null, name: 'Encanador', slug: 'encanador', icon: null, description: null, isActive: true },
      ],
    } as never);

    const { container } = render(
      <MemoryRouter>
        <CategoryGrid />
      </MemoryRouter>,
    );

    const icons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons).toHaveLength(2);
    expect(icons[0].outerHTML).not.toEqual(icons[1].outerHTML);
  });

  it('mostra no maximo 5 categorias mais o card Ver mais categorias no mobile', () => {
    mockMatchMedia({ [TABLET_QUERY]: false, [DESKTOP_QUERY]: false });
    vi.mocked(useCategories).mockReturnValue({ data: makeCategories(20) } as never);

    render(
      <MemoryRouter>
        <CategoryGrid />
      </MemoryRouter>,
    );

    expect(screen.getByText('Categoria 0')).toBeInTheDocument();
    expect(screen.getByText('Categoria 4')).toBeInTheDocument();
    expect(screen.queryByText('Categoria 5')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mais categorias' })).toHaveAttribute('href', '/search');
  });

  it('mostra no maximo 8 categorias mais o card Ver mais categorias no tablet', () => {
    mockMatchMedia({ [TABLET_QUERY]: true, [DESKTOP_QUERY]: false });
    vi.mocked(useCategories).mockReturnValue({ data: makeCategories(20) } as never);

    render(
      <MemoryRouter>
        <CategoryGrid />
      </MemoryRouter>,
    );

    expect(screen.getByText('Categoria 7')).toBeInTheDocument();
    expect(screen.queryByText('Categoria 8')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mais categorias' })).toBeInTheDocument();
  });

  it('mostra no maximo 11 categorias mais o card Ver mais categorias no desktop', () => {
    mockMatchMedia({ [TABLET_QUERY]: true, [DESKTOP_QUERY]: true });
    vi.mocked(useCategories).mockReturnValue({ data: makeCategories(20) } as never);

    render(
      <MemoryRouter>
        <CategoryGrid />
      </MemoryRouter>,
    );

    expect(screen.getByText('Categoria 10')).toBeInTheDocument();
    expect(screen.queryByText('Categoria 11')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mais categorias' })).toBeInTheDocument();
  });

  it('nao mostra o card Ver mais categorias quando ha menos categorias que o limite', () => {
    mockMatchMedia({ [TABLET_QUERY]: false, [DESKTOP_QUERY]: false });
    vi.mocked(useCategories).mockReturnValue({ data: makeCategories(3) } as never);

    render(
      <MemoryRouter>
        <CategoryGrid />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: 'Ver mais categorias' })).not.toBeInTheDocument();
  });

  it('cards de categoria tem altura fixa independente do tamanho do nome', () => {
    mockMatchMedia({ [TABLET_QUERY]: false, [DESKTOP_QUERY]: false });
    vi.mocked(useCategories).mockReturnValue({
      data: [
        { id: 'c1', parentId: null, name: 'TI', slug: 'ti', icon: null, description: null, isActive: true },
        {
          id: 'c2',
          parentId: null,
          name: 'Instalação e Manutenção de Ar-Condicionado',
          slug: 'ar',
          icon: null,
          description: null,
          isActive: true,
        },
      ],
    } as never);

    render(
      <MemoryRouter>
        <CategoryGrid />
      </MemoryRouter>,
    );

    const shortCard = screen.getByText('TI').closest('[class*="h-"]');
    const longCard = screen.getByText('Instalação e Manutenção de Ar-Condicionado').closest('[class*="h-"]');
    expect(shortCard?.className).toContain('h-28');
    expect(longCard?.className).toContain('h-28');
  });
});
