export type MockRedis = {
  store: Map<string, string>;
  ttls: Map<string, number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string | number): Promise<'OK'>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  flushall(): Promise<'OK'>;
  quit(): Promise<'OK'>;
};

export function mockRedis(): MockRedis {
  const store = new Map<string, string>();
  const ttls = new Map<string, number>();
  return {
    store,
    ttls,
    async get(key) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    async set(key, value) {
      store.set(key, String(value));
      return 'OK';
    },
    async del(...keys) {
      let removed = 0;
      for (const key of keys) {
        if (store.delete(key)) {
          removed += 1;
        }
        ttls.delete(key);
      }
      return removed;
    },
    async exists(...keys) {
      return keys.reduce((count, key) => count + (store.has(key) ? 1 : 0), 0);
    },
    async incr(key) {
      const next = Number(store.get(key) ?? '0') + 1;
      store.set(key, String(next));
      return next;
    },
    async decr(key) {
      const next = Number(store.get(key) ?? '0') - 1;
      store.set(key, String(next));
      return next;
    },
    async expire(key, seconds) {
      if (!store.has(key)) {
        return 0;
      }
      ttls.set(key, seconds);
      return 1;
    },
    async ttl(key) {
      if (!store.has(key)) {
        return -2;
      }
      return ttls.get(key) ?? -1;
    },
    async flushall() {
      store.clear();
      ttls.clear();
      return 'OK';
    },
    async quit() {
      return 'OK';
    },
  };
}
