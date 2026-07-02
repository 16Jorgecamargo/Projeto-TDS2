import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/24/solid';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { FavoriteButton } from '../../favorites/components/FavoriteButton';

export interface ProfessionalCardProps {
  id: string;
  headline: string;
  bio: string | null;
  hourlyRate: number | null;
  ratingAverage: number;
  ratingCount: number;
  isAvailable: boolean;
  isFavorite: boolean;
}

export function ProfessionalCard({
  id,
  headline,
  bio,
  hourlyRate,
  ratingAverage,
  ratingCount,
  isAvailable,
  isFavorite,
}: ProfessionalCardProps): JSX.Element {
  return (
    <Card interactive className="relative">
      <FavoriteButton professionalId={id} isFavorite={isFavorite} className="absolute right-3 top-3" />
      <Link to={`/professionals/${id}`} className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Avatar name={headline} size="md" />
          <div>
            <h3 className="font-semibold text-ink">{headline}</h3>
            {isAvailable && <Badge tone="urgent">Disponível agora</Badge>}
          </div>
        </div>
        {bio && <p className="line-clamp-2 text-sm text-muted">{bio}</p>}
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink">{hourlyRate !== null ? `R$ ${hourlyRate}/h` : 'Sob consulta'}</span>
          <span className="flex items-center gap-1 text-muted">
            <StarIcon className="h-4 w-4 text-accent" />
            {ratingAverage.toFixed(1)} ({ratingCount})
          </span>
        </div>
      </Link>
    </Card>
  );
}
