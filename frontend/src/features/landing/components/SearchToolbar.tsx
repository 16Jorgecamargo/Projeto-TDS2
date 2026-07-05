import { useEffect, useRef, useState, type JSX } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export type SortOption = 'rating' | 'price';

export interface SearchToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenFilters: () => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
}

const DEBOUNCE_MS = 400;

export function SearchToolbar({
  query,
  onQueryChange,
  onOpenFilters,
  sort,
  onSortChange,
}: SearchToolbarProps): JSX.Element {
  const [text, setText] = useState(query);
  const queryRef = useRef(query);
  const onQueryChangeRef = useRef(onQueryChange);

  useEffect(() => setText(query), [query]);

  useEffect(() => {
    queryRef.current = query;
    onQueryChangeRef.current = onQueryChange;
  }, [query, onQueryChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (text !== queryRef.current) {
        onQueryChangeRef.current(text);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="O que você precisa?"
          aria-label="Buscar profissionais"
          className="w-full rounded-md border border-border bg-bg py-2.5 pl-9 pr-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-focus"
        />
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onOpenFilters} className="lg:hidden">
        <SlidersHorizontal size={16} aria-hidden="true" />
        Filtros
      </Button>
      <label className="flex items-center gap-2 text-sm text-ink">
        Ordenar por
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
          className="rounded-sm border border-border px-2 py-1 text-sm text-ink"
        >
          <option value="rating">Nota</option>
          <option value="price">Preço</option>
        </select>
      </label>
    </div>
  );
}
