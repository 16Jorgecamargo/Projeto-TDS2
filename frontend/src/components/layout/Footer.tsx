import type { JSX } from 'react';
import { Link } from 'react-router-dom';

const columns = [
  {
    title: 'Plataforma',
    links: [
      { label: 'Como funciona', href: '#como-funciona' },
      { label: 'Categorias', href: '/search' },
      { label: 'Cadastre-se', href: '/register' },
    ],
  },
  {
    title: 'Suporte',
    links: [
      { label: 'Entrar', href: '/login' },
      { label: 'Perguntas frequentes', href: '#faq' },
    ],
  },
];

export function Footer(): JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-lg font-bold text-ink">Services Marketplace</span>
          <p className="max-w-xs text-sm text-muted">
            Publique sua demanda, compare orçamentos e contrate com segurança em um só lugar.
          </p>
        </div>
        <div className="flex flex-wrap gap-12">
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-2">
              <span className="text-label font-semibold text-ink">{column.title}</span>
              {column.links.map((link) => (
                <Link key={link.label} to={link.href} className="text-sm text-muted hover:text-primary">
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-8 w-full max-w-6xl border-t border-border pt-6 text-xs text-muted">
        © {year} Services Marketplace. Todos os direitos reservados.
      </div>
    </footer>
  );
}
