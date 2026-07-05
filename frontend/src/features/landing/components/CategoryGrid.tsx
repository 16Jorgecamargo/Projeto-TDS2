import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useCategories } from '../../professional/queries';
import { getCategoryIcon } from '../lib/categoryIcon';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export function CategoryGrid(): JSX.Element {
  const { data, isLoading } = useCategories();
  const categories = data?.filter((category) => category.isActive) ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
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

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {categories.map((category) => {
        const Icon = getCategoryIcon(category.name);
        return (
          <Card
            key={category.id}
            interactive
            className="relative flex flex-col items-center gap-3 bg-surface p-4 text-center"
          >
            <Link to={`/search?categoryId=${category.id}`} className="absolute inset-0" aria-label={category.name} />
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bg text-primary">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-ink">{category.name}</span>
          </Card>
        );
      })}
    </div>
  );
}
