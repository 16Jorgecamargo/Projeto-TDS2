import type { JSX, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { fadeVariants, spring } from '../../../lib/motion';

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function AuthLayout({ title, description, children }: AuthLayoutProps): JSX.Element {
  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      <Link
        to="/"
        className="absolute left-4 top-4 z-10 flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-primary md:text-bg md:hover:text-bg/80"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar
      </Link>
      <div className="hidden flex-col justify-center bg-primary px-8 py-6 text-bg md:flex lg:w-1/2 lg:px-16 lg:py-10">
        <div className="flex max-w-md flex-col gap-2 lg:gap-4">
          <span className="text-h4 font-semibold lg:text-h3">Services Marketplace</span>
          <h1 className="text-h4 font-semibold lg:text-h2">{title}</h1>
          {description ? <p className="hidden text-body-md text-bg/80 lg:block">{description}</p> : null}
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeVariants}
          transition={spring.gentle}
          className="w-full max-w-sm"
        >
          <span className="mb-6 flex justify-center text-h4 font-semibold text-primary md:hidden">
            Services Marketplace
          </span>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
