import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { ProfessionalResults } from '../components/ProfessionalResults';

export default function SearchPage() {
  const [params] = useSearchParams();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <SearchBar />
      <ProfessionalResults
        params={{
          q: params.get('q') ?? undefined,
          city: params.get('city') ?? undefined,
          state: params.get('state') ?? undefined,
          categoryId: params.get('categoryId') ?? undefined,
        }}
      />
    </div>
  );
}
