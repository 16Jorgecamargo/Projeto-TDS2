import type { JSX } from 'react';
import { FinanceManager } from '../components/FinanceManager';
import { Card } from '../../../components/ui/Card';

export function FinancePage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-ink">Financeiro</h1>
      <Card>
        <FinanceManager />
      </Card>
    </div>
  );
}

export default FinancePage;
