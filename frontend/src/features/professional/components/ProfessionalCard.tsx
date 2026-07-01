import { Link } from 'react-router-dom';

interface ProfessionalCardProps {
  id: string;
  headline: string;
  bio: string | null;
  hourlyRate: number | null;
  ratingAverage: number;
  ratingCount: number;
}

export function ProfessionalCard({ id, headline, bio, hourlyRate, ratingAverage, ratingCount }: ProfessionalCardProps) {
  return (
    <Link to={`/professionals/${id}`} className="flex flex-col gap-1 rounded border p-4 hover:border-slate-400">
      <h3 className="font-semibold">{headline}</h3>
      {bio ? <p className="text-sm text-slate-600">{bio}</p> : null}
      <div className="flex justify-between text-sm text-slate-500">
        <span>{hourlyRate !== null ? `R$ ${hourlyRate}/h` : 'Sob consulta'}</span>
        <span>
          {ratingAverage.toFixed(1)} ({ratingCount})
        </span>
      </div>
    </Link>
  );
}
