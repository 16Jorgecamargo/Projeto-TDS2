import type { JSX, MouseEvent } from 'react';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useAddFavorite, useRemoveFavorite } from '../queries';
import { cn } from '../../../lib/utils';

export interface FavoriteButtonProps {
  professionalId: string;
  isFavorite: boolean;
  className?: string;
}

export function FavoriteButton({ professionalId, isFavorite, className }: FavoriteButtonProps): JSX.Element {
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const pending = addFavorite.isPending || removeFavorite.isPending;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (isFavorite) {
      removeFavorite.mutate(professionalId);
    } else {
      addFavorite.mutate(professionalId);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      aria-pressed={isFavorite}
      className={cn(
        'rounded-full p-2 hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50',
        className,
      )}
    >
      {isFavorite ? (
        <HeartSolid className="h-5 w-5 text-accent" />
      ) : (
        <HeartOutline className="h-5 w-5 text-muted" />
      )}
    </button>
  );
}
