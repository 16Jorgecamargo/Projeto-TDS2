import type { JSX, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeVariants, spring } from '../../../lib/motion';

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function AuthLayout({ title, description, children }: AuthLayoutProps): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="hidden flex-col justify-center gap-2 bg-primary px-8 py-6 text-bg md:flex lg:w-1/2 lg:gap-4 lg:px-16 lg:py-10">
        <span className="text-h4 font-semibold lg:text-h3">Projeto TDS</span>
        <h1 className="text-h4 font-semibold lg:text-h2">{title}</h1>
        {description ? <p className="hidden text-body-md text-bg/80 lg:block">{description}</p> : null}
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
            Projeto TDS
          </span>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
