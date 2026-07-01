import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { searchFormSchema, type SearchForm } from '../schemas';

export function SearchBar() {
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
    <form onSubmit={onSubmit} noValidate className="flex gap-2">
      <input className="flex-1 rounded border px-3 py-2" placeholder="O que voce precisa?" {...register('q')} />
      <input className="w-40 rounded border px-3 py-2" placeholder="Cidade" {...register('city')} />
      <input className="w-16 rounded border px-3 py-2" placeholder="UF" maxLength={2} {...register('state')} />
      <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
        Buscar
      </button>
    </form>
  );
}
