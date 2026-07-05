import { useEffect, useMemo, useRef, useState, type FormEvent, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useSearchProfessionals, useLocations } from '../../features/landing/queries';
import { useDemands } from '../../features/demands/queries';
import { useCategories } from '../../features/professional/queries';

const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 300;
const COLLAPSED_WIDTH = 40;
const EXPANDED_WIDTH = 320;
const MAX_ITEMS_PER_SECTION = 5;

type LocationSuggestion =
  | { type: 'category'; key: string; label: string; categoryId: string }
  | { type: 'city'; key: string; label: string; city: string; state: string }
  | { type: 'state'; key: string; label: string; state: string };

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function TopbarSearch(): JSX.Element {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const canSearch = debouncedQuery.trim().length >= MIN_SEARCH_LENGTH;

  const { data: categories } = useCategories();
  const { data: locations } = useLocations();

  const locationSuggestions = useMemo<LocationSuggestion[]>(() => {
    const categorySuggestions: LocationSuggestion[] = (categories ?? [])
      .filter((category) => category.isActive)
      .map((category) => ({
        type: 'category',
        key: `category-${category.id}`,
        label: category.name,
        categoryId: category.id,
      }));

    const citySuggestions: LocationSuggestion[] = (locations ?? []).map((location) => ({
      type: 'city',
      key: `city-${location.city}-${location.state}`,
      label: `${location.city}, ${location.state}`,
      city: location.city,
      state: location.state,
    }));

    const states = new Set((locations ?? []).map((location) => location.state));
    const stateSuggestions: LocationSuggestion[] = Array.from(states).map((state) => ({
      type: 'state',
      key: `state-${state}`,
      label: state,
      state,
    }));

    return [...categorySuggestions, ...citySuggestions, ...stateSuggestions];
  }, [categories, locations]);

  const matchedLocationSuggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return locationSuggestions
      .filter((suggestion) => suggestion.label.toLowerCase().includes(term))
      .slice(0, MAX_ITEMS_PER_SECTION);
  }, [locationSuggestions, query]);

  const professionalResults = useSearchProfessionals(
    { q: debouncedQuery.trim() || undefined },
    { enabled: expanded && canSearch },
  );
  const demandResults = useDemands(undefined, { enabled: expanded && canSearch });
  const demandMatches = canSearch
    ? (demandResults.data?.items ?? [])
        .filter((demand) => demand.title.toLowerCase().includes(debouncedQuery.trim().toLowerCase()))
        .slice(0, MAX_ITEMS_PER_SECTION)
    : [];

  function collapse() {
    setExpanded(false);
    setQuery('');
  }

  useEffect(() => {
    if (!expanded) return undefined;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        collapse();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') collapse();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  function goTo(path: string) {
    collapse();
    navigate(path);
  }

  function handleSelectLocationSuggestion(suggestion: LocationSuggestion) {
    if (suggestion.type === 'category') {
      goTo(`/search?categoryId=${suggestion.categoryId}`);
      return;
    }
    if (suggestion.type === 'city') {
      goTo(`/search?city=${encodeURIComponent(suggestion.city)}&state=${suggestion.state}`);
      return;
    }
    goTo(`/search?state=${suggestion.state}`);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    goTo(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  const showResults = expanded && (matchedLocationSuggestions.length > 0 || canSearch);

  return (
    <div ref={containerRef} className="relative">
      <motion.form
        onSubmit={handleSubmit}
        animate={{ width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="flex h-10 items-center overflow-hidden rounded-full border border-transparent bg-transparent has-[input:focus]:border-border"
      >
        <button
          type={expanded ? 'submit' : 'button'}
          onClick={() => {
            if (!expanded) setExpanded(true);
          }}
          aria-label="Buscar"
          className="flex h-10 w-10 shrink-0 items-center justify-center text-muted hover:text-ink"
        >
          <MagnifyingGlassIcon className="h-5 w-5" />
        </button>
        {expanded && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar profissionais, demandas, categorias..."
            className="w-full bg-transparent pr-3 text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        )}
      </motion.form>

      {showResults && (
        <div className="absolute right-0 top-full z-dropdown mt-2 max-h-96 w-80 overflow-y-auto rounded-md border border-border bg-bg py-2 shadow-md">
          {matchedLocationSuggestions.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 px-3 text-xs font-semibold uppercase text-muted">Categorias e locais</p>
              <ul>
                {matchedLocationSuggestions.map((suggestion) => (
                  <li key={suggestion.key}>
                    <button
                      type="button"
                      onClick={() => handleSelectLocationSuggestion(suggestion)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink hover:bg-surface"
                    >
                      <span>{suggestion.label}</span>
                      <span className="text-xs text-muted">
                        {suggestion.type === 'category' ? 'Categoria' : suggestion.type === 'city' ? 'Cidade' : 'Estado'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canSearch && (
            <div className="mb-2">
              <p className="mb-1 px-3 text-xs font-semibold uppercase text-muted">Profissionais</p>
              {professionalResults.isFetching ? (
                <p className="px-3 py-2 text-sm text-muted">Buscando...</p>
              ) : professionalResults.data && professionalResults.data.items.length > 0 ? (
                <ul>
                  {professionalResults.data.items.slice(0, MAX_ITEMS_PER_SECTION).map((professional) => (
                    <li key={professional.id}>
                      <button
                        type="button"
                        onClick={() => goTo(`/professionals/${professional.id}`)}
                        className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm text-ink hover:bg-surface"
                      >
                        {professional.headline}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-sm text-muted">Nenhum profissional encontrado.</p>
              )}
            </div>
          )}

          {canSearch && (
            <div>
              <p className="mb-1 px-3 text-xs font-semibold uppercase text-muted">Demandas</p>
              {demandMatches.length > 0 ? (
                <ul>
                  {demandMatches.map((demand) => (
                    <li key={demand.id}>
                      <button
                        type="button"
                        onClick={() => goTo(`/demands/${demand.id}`)}
                        className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm text-ink hover:bg-surface"
                      >
                        {demand.title}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-sm text-muted">Nenhuma demanda encontrada.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
