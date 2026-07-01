import type { JSX } from 'react';

export function NotFound(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg text-slate-600">Página não encontrada</p>
    </div>
  );
}
