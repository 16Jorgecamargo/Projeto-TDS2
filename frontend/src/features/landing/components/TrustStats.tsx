import { useEffect, useState, type JSX } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useCategories } from '../../professional/queries';
import { useTotalProfessionalsCount } from '../queries';
import { Skeleton } from '../../../components/ui/Skeleton';

function AnimatedCounter({ value }: { value: number }): JSX.Element {
  const spring = useSpring(0, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString('pt-BR'));
  const [text, setText] = useState('0');

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    return display.on('change', (latest) => setText(latest));
  }, [display]);

  return <motion.span>{text}</motion.span>;
}

export function TrustStats(): JSX.Element {
  const { data: totalProfessionals, isLoading: loadingProfessionals } = useTotalProfessionalsCount();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const totalCategories = categories?.filter((category) => category.isActive).length ?? 0;

  return (
    <div className="border-y border-border bg-bg px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-8 sm:flex-row sm:gap-16">
        <div className="flex flex-col items-center gap-1 text-center">
          {loadingProfessionals ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <span className="text-h2 font-bold text-ink">
              <AnimatedCounter value={totalProfessionals ?? 0} />
            </span>
          )}
          <span className="text-body-sm text-muted">profissionais cadastrados</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          {loadingCategories ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <span className="text-h2 font-bold text-ink">
              <AnimatedCounter value={totalCategories} />
            </span>
          )}
          <span className="text-body-sm text-muted">categorias de serviço</span>
        </div>
      </div>
    </div>
  );
}
