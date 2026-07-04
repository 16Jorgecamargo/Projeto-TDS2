import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchPage from './SearchPage';

vi.mock('../components/SearchFilters', () => ({ SearchFilters: () => <div>search-filters</div> }));
vi.mock('../components/ProfessionalResults', () => ({ ProfessionalResults: () => <div>professional-results</div> }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/search']}>
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SearchPage', () => {
  it('renderiza o select de ordenacao com token de borda tokenizado', () => {
    renderPage();
    const select = screen.getByLabelText('Ordenar por') as HTMLSelectElement;
    expect(select.className).toContain('border-surface');
    expect(select.className).toContain('text-ink');
  });
});
