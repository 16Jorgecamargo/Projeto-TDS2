import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useCategories } from '../../professional/queries';
import { Card } from '../../../components/ui/Card';

export function CategoryGrid(): JSX.Element {
  const { data } = useCategories();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {data
        ?.filter((category) => category.isActive)
        .map((category) => (
          <Card key={category.id} interactive className="relative p-4 text-center">
            <Link to={`/search?categoryId=${category.id}`} className="absolute inset-0" aria-label={category.name} />
            <span className="text-ink">{category.name}</span>
          </Card>
        ))}
    </div>
  );
}
