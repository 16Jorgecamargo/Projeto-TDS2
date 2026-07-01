import { SearchBar } from '../components/SearchBar';
import { CategoryGrid } from '../components/CategoryGrid';

export default function LandingPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
      <h1 className="text-3xl font-semibold">Encontre o profissional certo</h1>
      <SearchBar />
      <CategoryGrid />
    </div>
  );
}
