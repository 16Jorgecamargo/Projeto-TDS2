import type { JSX } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheckIcon, CheckBadgeIcon, BoltIcon } from '@heroicons/react/24/outline';
import { SearchBar } from '../components/SearchBar';
import { TrustStats } from '../components/TrustStats';
import { CategoryGrid } from '../components/CategoryGrid';
import { FeaturedProfessionals } from '../components/FeaturedProfessionals';
import { HowItWorks } from '../components/HowItWorks';
import { Testimonials } from '../components/Testimonials';
import { Faq } from '../components/Faq';
import { ClosingCta } from '../components/ClosingCta';
import { spring } from '../../../lib/motion';

const trustPoints = [
  { icon: ShieldCheckIcon, label: 'Pagamento protegido' },
  { icon: CheckBadgeIcon, label: 'Profissionais avaliados' },
  { icon: BoltIcon, label: 'Resposta rápida' },
];

export default function LandingPage(): JSX.Element {
  return (
    <div className="flex flex-col">
      <section className="bg-surface px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
          className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight text-ink text-balance sm:text-5xl">
            Encontre o profissional certo
          </h1>
          <p className="max-w-xl text-lg text-muted">
            Publique sua demanda, compare orçamentos e contrate com segurança em um só lugar.
          </p>
          <div className="w-full">
            <SearchBar />
          </div>
          <ul className="flex flex-wrap items-center justify-center gap-2">
            {trustPoints.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1 text-xs font-semibold text-ink"
              >
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      <TrustStats />

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="mb-6 text-h2 font-bold text-ink">Categorias em destaque</h2>
        <CategoryGrid />
      </section>

      <FeaturedProfessionals />
      <HowItWorks />
      <Testimonials />
      <Faq />
      <ClosingCta />
    </div>
  );
}
