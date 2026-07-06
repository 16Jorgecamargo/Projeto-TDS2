import { useState, type JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SearchToolbar, type SortOption } from '../components/SearchToolbar';
import { FilterBar } from '../components/FilterBar';
import { ProfessionalResults } from '../components/ProfessionalResults';
import { AllCategoriesGrid } from '../components/AllCategoriesGrid';
import { Drawer } from '../../../components/ui/Drawer';
import { BackLink } from '../../../components/ui/BackLink';
import { useSearchProfessionals } from '../queries';
import type { SearchForm } from '../schemas';

const DEFAULT_LIMIT = 12;

type UrlKey = 'q' | 'city' | 'state' | 'categoryId' | 'sort' | 'onlyAvailable' | 'page';

export default function SearchPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters: SearchForm = {
    q: searchParams.get('q') ?? undefined,
    city: searchParams.get('city') ?? undefined,
    state: searchParams.get('state')?.toUpperCase() ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
  };
  const sort = (searchParams.get('sort') as SortOption | null) ?? 'rating';
  const onlyAvailable = searchParams.get('onlyAvailable') === 'true';
  const page = Number(searchParams.get('page') ?? '1');
  const showAllCategories = searchParams.get('view') === 'categories' && !filters.categoryId;

  function updateParams(next: Partial<Record<UrlKey, string | undefined>>, resetPage = true) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    if (resetPage && !('page' in next)) {
      params.delete('page');
    }
    setSearchParams(params);
  }

  function handleFilterChange(next: SearchForm) {
    updateParams({ city: next.city, state: next.state, categoryId: next.categoryId });
  }

  const params = { ...filters, page, limit: DEFAULT_LIMIT };
  const { data } = useSearchProfessionals(params);

  if (showAllCategories) {
    return (
      <div className="mx-auto flex w-full max-w-app flex-col gap-6 p-6">
        <BackLink to="/" label="Voltar para o início" />
        <PageHeader title="Todas as categorias" />
        <AllCategoriesGrid />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-6 p-6">
      <BackLink to="/" label="Voltar para o início" />
      <PageHeader
        title="Resultados da busca"
        subtitle={data ? `${data.total} profissionais encontrados` : undefined}
      />
      <SearchToolbar
        query={filters.q ?? ''}
        onQueryChange={(value) => updateParams({ q: value || undefined })}
        onOpenFilters={() => setFiltersOpen(true)}
        sort={sort}
        onSortChange={(value) => updateParams({ sort: value })}
      />
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="hidden lg:block lg:w-64">
          <FilterBar
            value={filters}
            onChange={handleFilterChange}
            onlyAvailable={onlyAvailable}
            onOnlyAvailableChange={(value) => updateParams({ onlyAvailable: value ? 'true' : undefined })}
          />
        </div>
        <div className="flex-1">
          <ProfessionalResults
            params={params}
            onlyAvailable={onlyAvailable}
            sort={sort}
            onPageChange={(nextPage) => updateParams({ page: String(nextPage) }, false)}
          />
        </div>
      </div>
      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros" side="right">
        <FilterBar
          value={filters}
          onChange={handleFilterChange}
          onlyAvailable={onlyAvailable}
          onOnlyAvailableChange={(value) => updateParams({ onlyAvailable: value ? 'true' : undefined })}
        />
      </Drawer>
    </div>
  );
}
