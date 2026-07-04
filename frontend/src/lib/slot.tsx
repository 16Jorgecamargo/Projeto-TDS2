import { cloneElement, forwardRef, isValidElement } from 'react';
import type { HTMLAttributes, ReactElement } from 'react';

export interface SlotProps extends HTMLAttributes<HTMLElement> {
  children: ReactElement;
}

export const Slot = forwardRef<HTMLElement, SlotProps>(function Slot(
  { children, className, ...props },
  ref,
) {
  if (!isValidElement(children)) {
    return null;
  }

  const childProps = children.props as Record<string, unknown>;
  const childClassName = typeof childProps.className === 'string' ? childProps.className : '';

  return cloneElement(children, {
    ...props,
    ...childProps,
    className: [childClassName, className].filter(Boolean).join(' '),
    ref,
  } as never);
});
