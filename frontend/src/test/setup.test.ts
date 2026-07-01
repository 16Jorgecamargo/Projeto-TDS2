import { describe, it, expect } from 'vitest';

describe('frontend test setup', () => {
  it('runs in a jsdom environment', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
  });

  it('extends expect with jest-dom matchers', () => {
    const element = document.createElement('div');
    element.textContent = 'hello';
    document.body.appendChild(element);
    expect(element).toBeInTheDocument();
  });
});
