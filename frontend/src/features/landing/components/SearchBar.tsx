import { useMemo, useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { searchFormSchema, type SearchForm } from '../schemas';
import { Button } from '../../../components/ui/Button';
import { useCategories } from '../../professional/queries';
import { useLocations } from '../queries';

type Suggestion =
  | { type: 'category'; key: string; label: string; categoryId: string }
  | { type: 'city'; key: string; label: string; city: string; state: string }
  | { type: 'state'; key: string; label: string; state: string };

const MAX_SUGGESTIONS = 5;

export function SearchBar(): JSX.Element {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, setValue } = useForm<SearchForm>({
    resolver: zodResolver(searchFormSchema),
  });
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const { data: categories } = useCategories();
  const { data: locations } = useLocations();
  const q = watch('q') ?? '';

  const allSuggestions = useMemo<Suggestion[]>(() => {
    const categorySuggestions: Suggestion[] = (categories ?? [])
      .filter((category) => category.isActive)
      .map((category) => ({
        type: 'category',
        key: `category-${category.id}`,
        label: category.name,
        categoryId: category.id,
      }));

    const citySuggestions: Suggestion[] = (locations ?? []).map((location) => ({
      type: 'city',
      key: `city-${location.city}-${location.state}`,
      label: `${location.city}, ${location.state}`,
      city: location.city,
      state: location.state,
    }));

    const states = new Set((locations ?? []).map((location) => location.state));
    const stateSuggestions: Suggestion[] = Array.from(states).map((state) => ({
      type: 'state',
      key: `state-${state}`,
      label: state,
      state,
    }));

    return [...categorySuggestions, ...citySuggestions, ...stateSuggestions];
  }, [categories, locations]);

  const suggestions = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = term
      ? allSuggestions.filter((suggestion) => suggestion.label.toLowerCase().includes(term))
      : allSuggestions;
    return filtered.slice(0, MAX_SUGGESTIONS);
  }, [allSuggestions, q]);

  const onSubmit = handleSubmit((values) => {
    const params = new URLSearchParams();
    if (values.q) params.set('q', values.q);
    if (values.city) params.set('city', values.city);
    if (values.state) params.set('state', values.state);
    navigate(`/search?${params.toString()}`);
  });

  function handleSelectSuggestion(suggestion: Suggestion) {
    if (suggestion.type === 'category') {
      navigate(`/search?categoryId=${suggestion.categoryId}`);
      return;
    }
    if (suggestion.type === 'city') {
      setValue('city', suggestion.city);
      setValue('state', suggestion.state);
    } else {
      setValue('state', suggestion.state);
    }
    setSuggestionsOpen(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-2 rounded-lg border border-surface bg-bg p-2 shadow-hover sm:flex-row sm:items-center sm:gap-0 sm:divide-x sm:divide-surface sm:p-1.5"
    >
      <div className="relative flex-1">
        <MagnifyingGlassIcon
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          className="w-full rounded-md bg-transparent py-2.5 pl-10 pr-3 text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          placeholder="O que voce precisa?"
          role="combobox"
          aria-expanded={suggestionsOpen}
          aria-controls="search-suggestions"
          autoComplete="off"
          {...register('q', {
            onBlur: () => setSuggestionsOpen(false),
          })}
          onFocus={() => setSuggestionsOpen(true)}
        />
        {suggestionsOpen && suggestions.length > 0 && (
          <ul
            id="search-suggestions"
            role="listbox"
            className="absolute left-0 top-full z-dropdown mt-2 w-full min-w-[16rem] rounded-md border border-border bg-bg py-1 shadow-md"
          >
            {suggestions.map((suggestion) => (
              <li key={suggestion.key} role="option" aria-selected="false">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink hover:bg-surface"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleSelectSuggestion(suggestion);
                  }}
                >
                  <span>{suggestion.label}</span>
                  <span className="text-xs text-muted">
                    {suggestion.type === 'category' ? 'Categoria' : suggestion.type === 'city' ? 'Cidade' : 'Estado'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button type="submit" className="mt-1 w-full sm:mt-0 sm:ml-2 sm:w-auto">
        Buscar
      </Button>
    </form>
  );
}
