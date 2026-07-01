import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

const NativeAbortController = globalThis.AbortController;
const NativeAbortSignal = globalThis.AbortSignal;
Object.assign(globalThis, {
  AbortController: NativeAbortController,
  AbortSignal: NativeAbortSignal,
});

afterEach(() => {
  cleanup();
});
