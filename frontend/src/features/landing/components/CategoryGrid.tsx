import { useEffect, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCategories } from '../../professional/queries';
import { getCategoryIcon } from '../lib/categoryIcon';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

const TABLET_QUERY = '(min-width: 640px)';
const DESKTOP_QUERY = '(min-width: 1024px)';

const MOBILE_LIMIT = 5;
const TABLET_LIMIT = 8;
const DESKTOP_LIMIT = 11;

function useCategoryLimit(): number {
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const tabletQuery = window.matchMedia(TABLET_QUERY);
    const desktopQuery = window.matchMedia(DESKTOP_QUERY);

    const syncTablet = (event: MediaQueryList | MediaQueryListEvent) => setIsTablet(event.matches);
    const syncDesktop = (event: MediaQueryList | MediaQueryListEvent) => setIsDesktop(event.matches);

    syncTablet(tabletQuery);
    syncDesktop(desktopQuery);
    tabletQuery.addEventListener('change', syncTablet);
    desktopQuery.addEventListener('change', syncDesktop);

    return () => {
      tabletQuery.removeEventListener('change', syncTablet);
      desktopQuery.removeEventListener('change', syncDesktop);
    };
  }, []);

  if (isDesktop) return DESKTOP_LIMIT;
  if (isTablet) return TABLET_LIMIT;
  return MOBILE_LIMIT;
}

export function CategoryGrid(): JSX.Element {
  const { data, isLoading } = useCategories();
  const limit = useCategoryLimit();
  const categories = data?.filter((category) => category.isActive) ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-36" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        title="Nenhuma categoria disponível"
        description="Volte em breve para ver as categorias de serviço."
      />
    );
  }

  const visibleCategories = categories.slice(0, limit);
  const hasMore = categories.length > limit;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {visibleCategories.map((category) => {
        const Icon = getCategoryIcon(category.name);
        return (
          <Card
            key={category.id}
            interactive
            className="relative flex h-36 flex-col items-center justify-center gap-2 overflow-hidden bg-surface p-4 text-center"
          >
            <Link to={`/search?categoryId=${category.id}`} className="absolute inset-0" aria-label={category.name} />
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg text-primary">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="line-clamp-2 text-sm font-semibold text-ink">{category.name}</span>
          </Card>
        );
      })}
      {hasMore ? (
        <Card
          interactive
          className="relative flex h-36 flex-col items-center justify-center gap-2 overflow-hidden bg-primary p-4 text-center text-bg"
        >
          <Link to="/search?view=categories" className="absolute inset-0" aria-label="Ver mais categorias" />
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg/20 text-bg">
            <ArrowRight size={20} aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold">Ver mais categorias</span>
        </Card>
      ) : null}
    </div>
  );
}
