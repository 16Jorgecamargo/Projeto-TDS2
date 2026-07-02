import type { JSX } from 'react';
import { useCategories } from '../../professional/queries';
import type { SearchForm } from '../schemas';

export interface SearchFiltersProps {
  value: SearchForm;
  onChange: (value: SearchForm) => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (value: boolean) => void;
}

export function SearchFilters({
  value,
  onChange,
  onlyAvailable,
  onOnlyAvailableChange,
}: SearchFiltersProps): JSX.Element {
  const { data: categories } = useCategories();

  return (
    <aside className="flex w-full flex-col gap-4 md:w-64">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">O que você precisa?</span>
        <input
          value={value.q ?? ''}
          onChange={(event) => onChange({ ...value, q: event.target.value || undefined })}
          className="rounded-sm border border-surface px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">Cidade</span>
        <input
          value={value.city ?? ''}
          onChange={(event) => onChange({ ...value, city: event.target.value || undefined })}
          className="rounded-sm border border-surface px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">UF</span>
        <input
          value={value.state ?? ''}
          maxLength={2}
          onChange={(event) => onChange({ ...value, state: event.target.value.toUpperCase() || undefined })}
          className="rounded-sm border border-surface px-3 py-2 text-sm uppercase"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">Categoria</span>
        <select
          value={value.categoryId ?? ''}
          onChange={(event) => onChange({ ...value, categoryId: event.target.value || undefined })}
          className="rounded-sm border border-surface px-3 py-2 text-sm"
        >
          <option value="">Todas</option>
          {categories
            ?.filter((category) => category.isActive)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          checked={onlyAvailable}
          onChange={(event) => onOnlyAvailableChange(event.target.checked)}
        />
        Disponível agora
      </label>
    </aside>
  );
}
