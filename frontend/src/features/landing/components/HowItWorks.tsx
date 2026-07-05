import type { JSX } from 'react';
import { Search, MessageSquareText, Handshake } from 'lucide-react';
import { Card } from '../../../components/ui/Card';

const STEPS = [
  { icon: Search, title: 'Busque', description: 'Encontre profissionais por categoria, cidade ou palavra-chave.' },
  { icon: MessageSquareText, title: 'Compare', description: 'Veja avaliações, preços e disponibilidade lado a lado.' },
  { icon: Handshake, title: 'Contrate', description: 'Feche o contrato com segurança direto pela plataforma.' },
];

export function HowItWorks(): JSX.Element {
  return (
    <section id="como-funciona" className="mx-auto w-full max-w-6xl px-6 py-16">
      <h2 className="mb-6 text-h2 font-bold text-ink">Como funciona</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, description }) => (
          <Card key={title} variant="flat" className="flex flex-col items-center gap-3 bg-surface p-6 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bg text-primary">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="text-h4 font-semibold text-ink">{title}</span>
            <span className="text-body-sm text-muted">{description}</span>
          </Card>
        ))}
      </div>
    </section>
  );
}
