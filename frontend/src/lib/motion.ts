import type { Variants } from 'framer-motion';

export const duration = {
  fast: 0.15,
  base: 0.2,
  slow: 0.3,
} as const;

export const ease = {
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
} as const;

export const spring = {
  snappy: { type: 'spring', stiffness: 420, damping: 32 },
  gentle: { type: 'spring', stiffness: 260, damping: 26 },
} as const;

export const springOptions = {
  counter: { stiffness: 120, damping: 20 },
} as const;

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
};

export type DrawerSide = 'left' | 'right' | 'bottom';

export function slideVariants(side: DrawerSide): Variants {
  const hiddenOffset =
    side === 'left' ? { x: '-100%' } : side === 'right' ? { x: '100%' } : { y: '100%' };

  return {
    hidden: { opacity: 0, ...hiddenOffset },
    visible: { opacity: 1, x: 0, y: 0 },
  };
}
