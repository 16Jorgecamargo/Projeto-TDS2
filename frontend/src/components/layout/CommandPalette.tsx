import { useEffect, useMemo, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { useCommandPaletteStore } from '../../stores/commandPalette';
import { useAuthStore } from '../../stores/auth';
import { getNavItems } from '../../lib/navConfig';
import { useSearchProfessionals } from '../../features/landing/queries';
import { useDemands } from '../../features/demands/queries';

const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 300;

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function CommandPalette(): JSX.Element {
  const open = useCommandPaletteStore((state) => state.open);
  const closePalette = useCommandPaletteStore((state) => state.closePalette);
  const toggle = useCommandPaletteStore((state) => state.toggle);
  const role = useAuthStore((state) => state.user?.role);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const canSearch = debouncedQuery.trim().length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const navItems = useMemo(() => (role ? getNavItems(role) : []), [role]);
  const navMatches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? navItems.filter((item) => item.label.toLowerCase().includes(needle)) : navItems;
  }, [navItems, query]);

  const professionalResults = useSearchProfessionals(
    { q: debouncedQuery.trim() || undefined },
    { enabled: open && canSearch },
  );
  const demandResults = useDemands(undefined, { enabled: open && canSearch });

  const demandMatches = useMemo(() => {
    if (!canSearch || !demandResults.data) return [];
    const needle = debouncedQuery.trim().toLowerCase();
    return demandResults.data.items.filter((demand) => demand.title.toLowerCase().includes(needle)).slice(0, 5);
  }, [canSearch, demandResults.data, debouncedQuery]);

  function goTo(path: string) {
    closePalette();
    navigate(path);
  }

  return (
    <Modal open={open} onClose={closePalette} title="Buscar ou navegar">
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Digite para buscar telas, profissionais ou demandas..."
        className="mb-4 w-full rounded-sm border border-surface px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      />
      <div className="max-h-96 overflow-y-auto">
        {navMatches.length > 0 && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold uppercase text-muted">Navegação</p>
            <ul>
              {navMatches.map((item) => (
                <li key={item.to + item.label}>
                  <button
                    type="button"
                    onClick={() => goTo(item.to)}
                    className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm text-ink hover:bg-surface"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {canSearch && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-semibold uppercase text-muted">Profissionais</p>
            {professionalResults.isFetching ? (
              <p className="px-3 py-2 text-sm text-muted">Buscando...</p>
            ) : professionalResults.data && professionalResults.data.items.length > 0 ? (
              <ul>
                {professionalResults.data.items.slice(0, 5).map((professional) => (
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
            <p className="mb-1 text-xs font-semibold uppercase text-muted">Demandas</p>
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
    </Modal>
  );
}
