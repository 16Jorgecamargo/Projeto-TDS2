import { useLayoutEffect, useState, type RefObject } from 'react';

export function useFitCount(containerRef: RefObject<HTMLElement | null>, itemCount: number, extra = 2): number {
  const [visible, setVisible] = useState(itemCount);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function recalc() {
      const el = containerRef.current;
      if (!el) return;
      const firstItem = el.firstElementChild as HTMLElement | null;
      const itemHeight = firstItem?.getBoundingClientRect().height ?? 0;
      const available = el.getBoundingClientRect().height;
      if (itemHeight <= 0 || available <= 0) {
        setVisible(itemCount);
        return;
      }
      const gap = parseFloat(getComputedStyle(el).rowGap || '0') || 0;
      const fit = Math.max(1, Math.floor((available + gap) / (itemHeight + gap)));
      setVisible(Math.min(itemCount, fit + extra));
    }

    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, itemCount, extra]);

  return visible;
}
