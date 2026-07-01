import { test as base, expect } from '@playwright/test';

export type WorkerRole = 'client' | 'professional' | 'admin';

export function roleStorageState(role: WorkerRole): string {
  return `e2e/.auth/${role}.json`;
}

export const test = base;
export { expect };
