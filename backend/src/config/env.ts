import { getConfig, type Config } from './index.js';

export const env = new Proxy({} as Config, {
  get(_target, property): unknown {
    return getConfig()[property as keyof Config];
  },
});
