import type { JSX } from 'react';
import { CatalogManager } from '../components/CatalogManager';
import { Card } from '../../../components/ui/Card';

export function CatalogPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-ink">Catálogo</h1>
      <Card>
        <CatalogManager />
      </Card>
    </div>
  );
}

export default CatalogPage;
