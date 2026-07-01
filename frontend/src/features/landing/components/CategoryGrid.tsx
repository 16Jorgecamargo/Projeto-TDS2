import { Link } from 'react-router-dom';
import { useCategories } from '../../professional/queries';

export function CategoryGrid() {
  const { data } = useCategories();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {data
        ?.filter((category) => category.isActive)
        .map((category) => (
          <Link
            key={category.id}
            to={`/search?categoryId=${category.id}`}
            className="rounded border p-4 text-center hover:border-slate-400"
          >
            {category.name}
          </Link>
        ))}
    </div>
  );
}
