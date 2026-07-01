import { describe, it, expect } from 'vitest';
import { mockRedis } from './redis.js';

describe('mockRedis', () => {
  it('sets and gets a value', async () => {
    const redis = mockRedis();
    await redis.set('k', 'v');
    expect(await redis.get('k')).toBe('v');
  });

  it('deletes keys and reports existence', async () => {
    const redis = mockRedis();
    await redis.set('k', 'v');
    expect(await redis.exists('k')).toBe(1);
    expect(await redis.del('k')).toBe(1);
    expect(await redis.get('k')).toBeNull();
    expect(await redis.exists('k')).toBe(0);
  });

  it('increments and decrements numeric values', async () => {
    const redis = mockRedis();
    expect(await redis.incr('n')).toBe(1);
    expect(await redis.incr('n')).toBe(2);
    expect(await redis.decr('n')).toBe(1);
  });

  it('exposes an inspectable store and flushes', async () => {
    const redis = mockRedis();
    await redis.set('a', '1');
    expect(redis.store.get('a')).toBe('1');
    await redis.flushall();
    expect(redis.store.size).toBe(0);
  });
});
