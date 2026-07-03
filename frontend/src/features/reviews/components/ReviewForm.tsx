import { useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StarIcon } from '@heroicons/react/24/solid';
import { reviewFormSchema, type ReviewFormValues } from '../schemas';
import { useCreateReview } from '../queries';
import { Button } from '../../../components/ui/Button';

export interface ReviewFormProps {
  contractId: string;
  onDone: () => void;
}

interface ApiError {
  response?: { status?: number };
}

export function ReviewForm({ contractId, onDone }: ReviewFormProps): JSX.Element {
  const { mutate, isPending } = useCreateReview();
  const [duplicateError, setDuplicateError] = useState(false);
  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { rating: 0, comment: '' },
  });
  const rating = watch('rating');

  const onSubmit = handleSubmit((values) => {
    setDuplicateError(false);
    mutate(
      { contractId, ...values },
      {
        onSuccess: () => onDone(),
        onError: (error: Error) => {
          if ((error as ApiError).response?.status === 409) {
            setDuplicateError(true);
          }
        },
      },
    );
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, index) => {
          const value = index + 1;
          return (
            <button
              key={value}
              type="button"
              aria-label={`${value} estrelas`}
              onClick={() => setValue('rating', value, { shouldValidate: true })}
            >
              <StarIcon className={value <= rating ? 'h-6 w-6 text-accent' : 'h-6 w-6 text-muted'} />
            </button>
          );
        })}
      </div>
      {errors.rating && <span className="text-xs text-accent">{errors.rating.message}</span>}
      <label htmlFor="review-comment" className="flex flex-col gap-1">
        <span className="text-sm text-muted">Comentário</span>
        <textarea
          id="review-comment"
          {...register('comment')}
          rows={3}
          className="rounded-sm border border-surface px-3 py-2 text-ink"
        />
      </label>
      {errors.comment && <span className="text-xs text-accent">{errors.comment.message}</span>}
      {duplicateError && <span className="text-xs text-accent">Você já avaliou este contrato.</span>}
      <Button type="submit" disabled={isPending}>
        Enviar avaliação
      </Button>
    </form>
  );
}
