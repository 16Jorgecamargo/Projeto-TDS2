import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2 sm:flex-row">
      <input
        className="flex-1 rounded-sm border border-surface px-3 py-2 text-ink"
        placeholder="O que voce precisa?"
        {...register('q')}
      />
      <div className="flex gap-2">
        <input
          className="w-full min-w-0 flex-1 rounded-sm border border-surface px-3 py-2 text-ink sm:w-40 sm:flex-none"
          placeholder="Cidade"
          {...register('city')}
        />
        <input
          className="w-16 shrink-0 rounded-sm border border-surface px-3 py-2 text-ink uppercase"
          placeholder="UF"
          maxLength={2}
          {...register('state', { setValueAs: (value: string) => value.toUpperCase() })}
        />
      </div>
      <Button type="submit">Buscar</Button>
    </form>
  );
}
