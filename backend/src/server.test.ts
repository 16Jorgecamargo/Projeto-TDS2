import { describe, it, expect } from 'vitest';
import { start } from './server.js';

describe('start', () => {
  it('listens on the configured host/port and closes cleanly', async () => {
    const app = await start();
    const address = app.server.address();
    expect(address).not.toBeNull();
    await app.close();
  });
});
