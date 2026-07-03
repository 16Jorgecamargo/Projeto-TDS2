import type { JSX } from 'react';
import { SearchBar } from '../components/SearchBar';
import { CategoryGrid } from '../components/CategoryGrid';

export default function LandingPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold text-ink">Encontre o profissional certo</h1>
      <SearchBar />
      <CategoryGrid />
    </div>
  );
}
