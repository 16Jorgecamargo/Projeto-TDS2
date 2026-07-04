import { describe, it, expect } from 'vitest';
import { slideVariants } from './motion';

describe('slideVariants', () => {
  it('esconde para a esquerda quando side="left"', () => {
    const variants = slideVariants('left');
    expect(variants.hidden).toMatchObject({ opacity: 0, x: '-100%' });
    expect(variants.visible).toMatchObject({ opacity: 1, x: 0 });
  });

  it('esconde para a direita quando side="right"', () => {
    const variants = slideVariants('right');
    expect(variants.hidden).toMatchObject({ opacity: 0, x: '100%' });
  });

  it('esconde para baixo quando side="bottom"', () => {
    const variants = slideVariants('bottom');
    expect(variants.hidden).toMatchObject({ opacity: 0, y: '100%' });
  });
});
