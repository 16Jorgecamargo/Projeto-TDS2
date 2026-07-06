import type { JSX } from 'react';
import { UsersTable } from '../components/UsersTable';
import { Card } from '../../../components/ui/Card';

export function UsersPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-ink">Usuários</h1>
      <Card>
        <UsersTable />
      </Card>
    </div>
  );
}

export default UsersPage;
