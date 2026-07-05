import { useEffect, useMemo, useRef, useState, type FormEvent, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useSearchProfessionals, useLocations } from '../../features/landing/queries';
import { useDemands } from '../../features/demands/queries';
import { useContracts } from '../../features/contracts/queries';
import { useCategories } from '../../features/professional/queries';
import { useAuthStore } from '../../stores/auth';

const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 300;
const COLLAPSED_WIDTH = 40;
const EXPANDED_WIDTH = 320;
const MAX_ITEMS_PER_SECTION = 5;

type ResultItem =
  | { type: 'category'; key: string; label: string; categoryId: string }
  | { type: 'city'; key: string; label: string; city: string; state: string }
  | { type: 'state'; key: string; label: string; state: string }
  | { type: 'professional'; key: string; label: string; professionalId: string }
  | { type: 'demand'; key: string; label: string; demandId: string }
  | { type: 'contract'; key: string; label: string; contractId: string };

const TYPE_LABELS: Record<ResultItem['type'], string> = {
  category: 'Categoria',
  city: 'Cidade',
  state: 'Estado',
  professional: 'Profissional',
  demand: 'Demanda',
  contract: 'Contrato',
};

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
  const isClient = useAuthStore((state) => state.user?.role === 'client');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const canSearch = debouncedQuery.trim().length >= MIN_SEARCH_LENGTH;

  const { data: categories } = useCategories();
  const { data: locations } = useLocations();

  const locationSuggestions = useMemo<ResultItem[]>(() => {
    const categorySuggestions: ResultItem[] = (categories ?? [])
      .filter((category) => category.isActive)
      .map((category) => ({
        type: 'category',
        key: `category-${category.id}`,
        label: category.name,
        categoryId: category.id,
      }));

    const citySuggestions: ResultItem[] = (locations ?? []).map((location) => ({
      type: 'city',
      key: `city-${location.city}-${location.state}`,
      label: `${location.city}, ${location.state}`,
      city: location.city,
      state: location.state,
    }));

    const states = new Set((locations ?? []).map((location) => location.state));
    const stateSuggestions: ResultItem[] = Array.from(states).map((state) => ({
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
  const demandResults = useDemands(isClient ? true : undefined, { enabled: expanded && canSearch });
  const contractResults = useContracts({ enabled: expanded && canSearch && isClient });

  const professionalItems = useMemo<ResultItem[]>(
    () =>
      (professionalResults.data?.items ?? []).slice(0, MAX_ITEMS_PER_SECTION).map((professional) => ({
        type: 'professional',
        key: `professional-${professional.id}`,
        label: professional.headline,
        professionalId: professional.id,
      })),
    [professionalResults.data],
  );

  const demandItems = useMemo<ResultItem[]>(() => {
    const term = debouncedQuery.trim().toLowerCase();
    return (demandResults.data?.items ?? [])
      .filter((demand) => demand.title.toLowerCase().includes(term))
      .slice(0, MAX_ITEMS_PER_SECTION)
      .map((demand) => ({
        type: 'demand',
        key: `demand-${demand.id}`,
        label: demand.title,
        demandId: demand.id,
      }));
  }, [demandResults.data, debouncedQuery]);

  const contractItems = useMemo<ResultItem[]>(() => {
    const term = debouncedQuery.trim().toLowerCase();
    if (!term) return [];
    const demandTitleById = new Map((demandResults.data?.items ?? []).map((demand) => [demand.id, demand.title]));
    return (contractResults.data ?? [])
      .map((contract) => ({ contract, title: demandTitleById.get(contract.demandId) }))
      .filter((entry) => entry.title?.toLowerCase().includes(term))
      .slice(0, MAX_ITEMS_PER_SECTION)
      .map((entry) => ({
        type: 'contract' as const,
        key: `contract-${entry.contract.id}`,
        label: entry.title as string,
        contractId: entry.contract.id,
      }));
  }, [contractResults.data, demandResults.data, debouncedQuery]);

  const allResults: ResultItem[] = canSearch
    ? [...matchedLocationSuggestions, ...professionalItems, ...demandItems, ...contractItems]
    : matchedLocationSuggestions;

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

  function handleSelectResult(item: ResultItem) {
    switch (item.type) {
      case 'category':
        goTo(`/search?categoryId=${item.categoryId}`);
        return;
      case 'city':
        goTo(`/search?city=${encodeURIComponent(item.city)}&state=${item.state}`);
        return;
      case 'state':
        goTo(`/search?state=${item.state}`);
        return;
      case 'professional':
        goTo(`/professionals/${item.professionalId}`);
        return;
      case 'demand':
        goTo(`/demands/${item.demandId}`);
        return;
      case 'contract':
        goTo(`/contracts/${item.contractId}`);
        return;
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    goTo(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  const showResults = expanded && allResults.length > 0;

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
            placeholder="O que você esta procurando?"
            className="w-full bg-transparent pr-3 text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        )}
      </motion.form>

      {expanded && canSearch && professionalResults.isFetching && allResults.length === 0 && (
        <div className="absolute right-0 top-full z-dropdown mt-2 w-80 rounded-md border border-border bg-bg py-2 shadow-md">
          <p className="px-3 py-2 text-sm text-muted">Buscando...</p>
        </div>
      )}

      {showResults && (
        <div className="absolute right-0 top-full z-dropdown mt-2 max-h-96 w-80 overflow-y-auto rounded-md border border-border bg-bg py-2 shadow-md">
          <ul>
            {allResults.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink hover:bg-surface"
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-muted">{TYPE_LABELS[item.type]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
