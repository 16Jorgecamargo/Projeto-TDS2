import { useEffect, useState, type JSX } from 'react';
import { Star } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { useFeaturedProfessionals } from '../queries';
import { useProfessionalReviews } from '../../reviews/queries';
import { formatShortName } from '../../../lib/utils';

interface TestimonialCardProps {
  professionalId: string;
  onVisibleChange: (professionalId: string, visible: boolean) => void;
}

function TestimonialCard({ professionalId, onVisibleChange }: TestimonialCardProps): JSX.Element | null {
  const { data, isLoading } = useProfessionalReviews(professionalId, 1);
  const review = data?.items[0];
  const visible = !isLoading && Boolean(review?.comment);

  useEffect(() => {
    onVisibleChange(professionalId, visible);
  }, [professionalId, visible, onVisibleChange]);

  if (!visible || !review) {
    return null;
  }

  const authorName = formatShortName(review.authorName);

  return (
    <Card variant="flat" className="flex flex-col gap-3 bg-surface p-6">
      <div className="flex items-center gap-3">
        <Avatar name={authorName} size="sm" />
        <div>
          <p className="text-sm font-semibold text-ink">{authorName}</p>
          <span className="flex items-center gap-1 text-xs text-muted">
            <Star size={12} className="text-accent" aria-hidden="true" />
            {review.rating.toFixed(1)}
          </span>
        </div>
      </div>
      <p className="text-body-sm text-muted">&quot;{review.comment}&quot;</p>
    </Card>
  );
}

export function Testimonials(): JSX.Element | null {
  const { data: featured } = useFeaturedProfessionals(3);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  function handleVisibleChange(professionalId: string, visible: boolean) {
    setVisibleIds((prev) => {
      const alreadyVisible = prev.has(professionalId);
      if (alreadyVisible === visible) {
        return prev;
      }
      const next = new Set(prev);
      if (visible) {
        next.add(professionalId);
      } else {
        next.delete(professionalId);
      }
      return next;
    });
  }

  if (!featured || featured.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16" hidden={visibleIds.size === 0}>
      <h2 className="mb-6 text-h2 font-bold text-ink">Depoimentos</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((item) => (
          <TestimonialCard key={item.id} professionalId={item.id} onVisibleChange={handleVisibleChange} />
        ))}
      </div>
    </section>
  );
}
