import { useState } from 'react';
import {
  usePortfolio,
  useCreatePortfolioItem,
  useRemovePortfolioItem,
  useAddPortfolioImage,
  useRemovePortfolioImage,
} from '../queries';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import type { PortfolioItem } from '../api';

function PortfolioItemRow({
  item,
  professionalId,
  onRemoveItem,
}: {
  item: PortfolioItem;
  professionalId: string | undefined;
  onRemoveItem: (id: string) => void;
}) {
  const addImage = useAddPortfolioImage(professionalId, item.id);
  const removeImage = useRemovePortfolioImage(professionalId);

  return (
    <li className="flex flex-col gap-2 rounded-sm bg-surface px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{item.title}</span>
        <button type="button" onClick={() => onRemoveItem(item.id)} className="text-sm font-semibold text-accent underline">
          Remover
        </button>
      </div>
      {item.images.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {item.images.map((image) => (
            <li key={image.id} className="relative">
              <img src={image.imageUrl} alt={item.title} className="h-16 w-16 rounded-md object-cover" />
              <button
                type="button"
                onClick={() => removeImage.mutate(image.id)}
                aria-label={`Remover foto de ${item.title}`}
                className="absolute -right-1 -top-1 rounded-full bg-accent px-1 text-xs text-bg"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <ImageUpload
        label={`Adicionar foto a ${item.title}`}
        onUploaded={(result) => addImage.mutate({ imageUrl: result.url, position: item.images.length })}
      />
    </li>
  );
}

export function PortfolioManager({ professionalId }: { professionalId: string | undefined }) {
  const { data, isPending } = usePortfolio(professionalId);
  const create = useCreatePortfolioItem(professionalId);
  const remove = useRemovePortfolioItem(professionalId);
  const [title, setTitle] = useState('');

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Portfólio</h2>
      <div className="mb-3 flex gap-2">
        <input
          className="flex-1 rounded-sm border border-surface px-3 py-2 text-ink"
          placeholder="Título do trabalho"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          type="button"
          disabled={!title || create.isPending}
          onClick={() => {
            create.mutate({ categoryId: null, title, description: null, completedAt: null });
            setTitle('');
          }}
        >
          Adicionar
        </Button>
      </div>
      {isPending ? null : !data || data.length === 0 ? (
        <EmptyState title="Nenhum item no portfólio ainda" />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((item) => (
            <PortfolioItemRow
              key={item.id}
              item={item}
              professionalId={professionalId}
              onRemoveItem={(id) => remove.mutate(id)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
