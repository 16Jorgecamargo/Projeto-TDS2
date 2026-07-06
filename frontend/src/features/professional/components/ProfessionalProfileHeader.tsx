import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/24/solid';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FavoriteButton } from '../../favorites/components/FavoriteButton';
import { useCreateRoom } from '../../chat/queries';
import type { PublicProfile } from '../api';

export interface ProfessionalProfileHeaderProps {
  profile: PublicProfile;
  isFavorite: boolean;
}

export function ProfessionalProfileHeader({ profile, isFavorite }: ProfessionalProfileHeaderProps): JSX.Element {
  const navigate = useNavigate();
  const createRoom = useCreateRoom();

  function handleChat() {
    createRoom.mutate(
      { participantId: profile.userId },
      { onSuccess: (room) => navigate(`/chat/${room.id}`) },
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Avatar name={profile.fullName} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-ink">{profile.fullName}</h1>
          <p className="text-sm text-muted">{profile.headline}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {profile.categories.map((category) => (
              <Badge key={category.id}>{category.name}</Badge>
            ))}
            <span className="flex items-center gap-1 text-sm text-muted">
              <StarIcon className="h-4 w-4 text-accent" />
              {profile.ratingAverage.toFixed(1)} ({profile.ratingCount})
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <FavoriteButton professionalId={profile.id} isFavorite={isFavorite} />
        <Button variant="ghost" onClick={handleChat} disabled={createRoom.isPending}>
          Chat
        </Button>
        <Button onClick={() => navigate(`/demands/new?professionalId=${profile.id}`)}>Contratar</Button>
      </div>
    </div>
  );
}
