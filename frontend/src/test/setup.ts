import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

const NativeAbortController = globalThis.AbortController;
const NativeAbortSignal = globalThis.AbortSignal;
Object.assign(globalThis, {
  AbortController: NativeAbortController,
  AbortSignal: NativeAbortSignal,
});

let objectUrlCounter = 0;
globalThis.URL.createObjectURL = () => {
  objectUrlCounter += 1;
  return `blob:http://localhost/${objectUrlCounter}`;
};
globalThis.URL.revokeObjectURL = () => undefined;

afterEach(() => {
  cleanup();
});
