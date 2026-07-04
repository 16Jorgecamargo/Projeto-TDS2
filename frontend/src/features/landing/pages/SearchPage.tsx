import { useState, type JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchFilters } from '../components/SearchFilters';
import { ProfessionalResults } from '../components/ProfessionalResults';
import type { SearchForm } from '../schemas';

type SortOption = 'rating' | 'price';

export default function SearchPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState<SortOption>('rating');

  const value: SearchForm = {
    q: searchParams.get('q') ?? undefined,
    city: searchParams.get('city') ?? undefined,
    state: searchParams.get('state')?.toUpperCase() ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
  };

  function handleChange(next: SearchForm) {
    const params = new URLSearchParams();
    if (next.q) params.set('q', next.q);
    if (next.city) params.set('city', next.city);
    if (next.state) params.set('state', next.state);
    if (next.categoryId) params.set('categoryId', next.categoryId);
    setSearchParams(params);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 md:flex-row">
      <SearchFilters
        value={value}
        onChange={handleChange}
        onlyAvailable={onlyAvailable}
        onOnlyAvailableChange={setOnlyAvailable}
      />
      <div className="flex-1">
        <div className="mb-4 flex justify-end">
          <label className="flex items-center gap-2 text-sm text-ink">
            Ordenar por
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="rounded-sm border border-surface px-2 py-1 text-sm text-ink"
            >
              <option value="rating">Nota</option>
              <option value="price">Preço</option>
            </select>
          </label>
        </div>
        <ProfessionalResults params={value} onlyAvailable={onlyAvailable} sort={sort} />
      </div>
    </div>
  );
}
