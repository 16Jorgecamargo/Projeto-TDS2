import { useEffect, useState, type JSX } from 'react';
import { useCategories } from '../../professional/queries';
import { searchFormSchema, type SearchForm } from '../schemas';

export interface FilterBarProps {
  value: SearchForm;
  onChange: (value: SearchForm) => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (value: boolean) => void;
}

const DEBOUNCE_MS = 400;

export function FilterBar({
  value,
  onChange,
  onlyAvailable,
  onOnlyAvailableChange,
}: FilterBarProps): JSX.Element {
  const { data: categories } = useCategories();
  const [city, setCity] = useState(value.city ?? '');
  const [state, setState] = useState(value.state ?? '');
  const [errors, setErrors] = useState<{ city?: string; state?: string }>({});

  useEffect(() => setCity(value.city ?? ''), [value.city]);
  useEffect(() => setState(value.state ?? ''), [value.state]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = searchFormSchema.safeParse({ ...value, city, state });
      if (result.success) {
        setErrors({});
        onChange({ ...value, city: result.data.city, state: result.data.state });
      } else {
        const fieldErrors = result.error.flatten().fieldErrors;
        setErrors({ city: fieldErrors.city?.[0], state: fieldErrors.state?.[0] });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, state]);

  function handleCategoryChange(categoryId: string) {
    onChange({ ...value, categoryId: categoryId || undefined });
  }

  return (
    <aside className="flex w-full flex-col gap-4 md:w-64">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">Cidade</span>
        <input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          className="rounded-sm border border-border px-3 py-2 text-sm text-ink"
        />
        {errors.city ? <span className="text-xs text-danger">{errors.city}</span> : null}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">UF</span>
        <input
          value={state}
          maxLength={2}
          onChange={(event) => setState(event.target.value.toUpperCase())}
          className="rounded-sm border border-border px-3 py-2 text-sm uppercase text-ink"
        />
        {errors.state ? <span className="text-xs text-danger">{errors.state}</span> : null}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-ink">Categoria</span>
        <select
          value={value.categoryId ?? ''}
          onChange={(event) => handleCategoryChange(event.target.value)}
          className="rounded-sm border border-border px-3 py-2 text-sm text-ink"
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
