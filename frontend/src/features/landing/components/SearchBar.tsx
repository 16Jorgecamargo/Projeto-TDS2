import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { searchFormSchema, type SearchForm } from '../schemas';
import { Button } from '../../../components/ui/Button';

export function SearchBar(): JSX.Element {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm<SearchForm>({ resolver: zodResolver(searchFormSchema) });

  const onSubmit = handleSubmit((values) => {
    const params = new URLSearchParams();
    if (values.q) params.set('q', values.q);
    if (values.city) params.set('city', values.city);
    if (values.state) params.set('state', values.state);
    navigate(`/search?${params.toString()}`);
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-2 rounded-lg border border-surface bg-bg p-2 shadow-hover sm:flex-row sm:items-center sm:gap-0 sm:divide-x sm:divide-surface sm:p-1.5"
    >
      <div className="relative flex-1">
        <MagnifyingGlassIcon
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          className="w-full rounded-md bg-transparent py-2.5 pl-10 pr-3 text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          placeholder="O que voce precisa?"
          {...register('q')}
        />
      </div>
      <div className="flex gap-2 sm:contents">
        <input
          className="w-full min-w-0 flex-1 rounded-md bg-transparent px-4 py-2.5 text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-40 sm:flex-none"
          placeholder="Cidade"
          {...register('city')}
        />
        <input
          className="w-16 shrink-0 rounded-md bg-transparent px-3 py-2.5 text-ink uppercase placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          placeholder="UF"
          maxLength={2}
          {...register('state', { setValueAs: (value: string) => value.toUpperCase() })}
        />
      </div>
      <Button type="submit" className="mt-1 w-full sm:mt-0 sm:ml-2 sm:w-auto">
        Buscar
      </Button>
    </form>
  );
}
