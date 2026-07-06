import { useEffect, useRef, useState, type JSX } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../landing/components/PageHeader';
import { DemandFilterBar } from '../components/DemandFilterBar';
import { DemandResults } from '../components/DemandResults';
import { Drawer } from '../../../components/ui/Drawer';
import { Button } from '../../../components/ui/Button';
import { BackLink } from '../../../components/ui/BackLink';
import { useMyProfile, usePublicProfile } from '../../professional/queries';
import { useDemandSearch } from '../queries';
import type { DemandFilterForm } from '../schemas';
import { SlidersHorizontal } from 'lucide-react';

const DEFAULT_LIMIT = 12;

type UrlKey = 'city' | 'state' | 'categoryId' | 'page';

export default function DemandSearchPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: myProfile } = useMyProfile();
  const { data: publicProfile } = usePublicProfile(myProfile?.id);
  const defaultsAppliedRef = useRef(false);

  const hasAnyFilterParam =
    searchParams.has('city') || searchParams.has('state') || searchParams.has('categoryId');

  useEffect(() => {
    if (defaultsAppliedRef.current || hasAnyFilterParam) {
      defaultsAppliedRef.current = true;
      return;
    }
    if (!publicProfile) return;
    defaultsAppliedRef.current = true;
    const defaultArea = publicProfile.serviceAreas[0];
    const defaultCategoryId = publicProfile.categories[0]?.id;
    if (!defaultArea && !defaultCategoryId) return;
    const params = new URLSearchParams(searchParams);
    if (defaultArea) {
      params.set('city', defaultArea.city);
      params.set('state', defaultArea.state);
    }
    if (defaultCategoryId) params.set('categoryId', defaultCategoryId);
    setSearchParams(params, { replace: true });
  }, [publicProfile, hasAnyFilterParam, searchParams, setSearchParams]);

  const filters: DemandFilterForm = {
    city: searchParams.get('city') ?? undefined,
    state: searchParams.get('state')?.toUpperCase() ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
  };
  const page = Number(searchParams.get('page') ?? '1');

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

  function handleFilterChange(next: DemandFilterForm) {
    updateParams({ city: next.city, state: next.state, categoryId: next.categoryId });
  }

  const params = { ...filters, page, limit: DEFAULT_LIMIT };
  const { data } = useDemandSearch(params);

  return (
    <div className="mx-auto flex max-w-app flex-col gap-6 p-6">
      <BackLink />
      <PageHeader
        title="Demandas disponíveis"
        subtitle={data ? `${data.total} demandas encontradas` : undefined}
      />
      <div className="flex justify-end lg:hidden">
        <Button type="button" variant="ghost" size="sm" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filtros
        </Button>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="hidden lg:block lg:w-64">
          <DemandFilterBar value={filters} onChange={handleFilterChange} />
        </div>
        <div className="flex-1">
          <DemandResults params={params} onPageChange={(nextPage) => updateParams({ page: String(nextPage) }, false)} />
        </div>
      </div>
      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros" side="right">
        <DemandFilterBar value={filters} onChange={handleFilterChange} />
      </Drawer>
    </div>
  );
}
