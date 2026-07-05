import type { JSX } from 'react';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

const SIBLING_COUNT = 1;
const ELLIPSIS = '…' as const;
const MAX_VISIBLE_PAGES = 7;

type PageItem = number | typeof ELLIPSIS;

function buildPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PageItem[] = [1];

  const rangeStart = Math.max(2, page - SIBLING_COUNT);
  const rangeEnd = Math.min(totalPages - 1, page + SIBLING_COUNT);

  if (rangeStart > 2) {
    items.push(ELLIPSIS);
  }

  for (let item = rangeStart; item <= rangeEnd; item += 1) {
    items.push(item);
  }

  if (rangeEnd < totalPages - 1) {
    items.push(ELLIPSIS);
  }

  if (totalPages > 1) {
    items.push(totalPages);
  }

  return items;
}

export function Pagination({ page, limit, total, onPageChange }: PaginationProps): JSX.Element | null {
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) {
    return null;
  }

  const pageItems = buildPageItems(page, totalPages);

  return (
    <nav aria-label="Paginação" className="flex items-center justify-center gap-2">
      <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Anterior
      </Button>
      <div className="hidden w-[248px] shrink-0 items-center justify-center gap-1 sm:flex">
        {pageItems.map((item, index) =>
          item === ELLIPSIS ? (
            <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted">
              {ELLIPSIS}
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={cn(
                'h-8 w-8 shrink-0 rounded-sm text-sm font-medium',
                item === page ? 'bg-primary text-bg' : 'text-ink hover:bg-surface',
              )}
            >
              {item}
            </button>
          ),
        )}
      </div>
      <span className="text-sm text-muted sm:hidden">
        Página {page} de {totalPages}
      </span>
      <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Próxima
      </Button>
    </nav>
  );
}
