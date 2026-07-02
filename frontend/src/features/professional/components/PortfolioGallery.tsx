import type { JSX } from 'react';
import { usePortfolio } from '../queries';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export interface PortfolioGalleryProps {
  professionalId: string;
}

export function PortfolioGallery({ professionalId }: PortfolioGalleryProps): JSX.Element {
  const { data, isPending } = usePortfolio(professionalId);

  if (isPending) {
    return <Skeleton className="h-40 w-full" aria-label="Carregando portfólio" />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title="Nenhum item no portfólio ainda" />;
  }

  return (
    <div className="flex flex-col gap-6">
      {data.map((item) => (
        <div key={item.id}>
          <h3 className="mb-2 text-sm font-semibold text-ink">{item.title}</h3>
          {item.images.length === 0 ? (
            <p className="text-sm text-muted">Sem fotos.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {item.images.map((image) => (
                <img
                  key={image.id}
                  src={image.imageUrl}
                  alt={item.title}
                  className="aspect-square w-full rounded-md object-cover"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
