import 'dotenv/config';
import { z } from 'zod';

const WEAK_SECRET_PATTERN = /change-me|placeholder|secret/i;

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().min(1).default('0.0.0.0'),
    CORS_ORIGIN: z.string().min(1).default('*'),
    DATABASE_HOST: z.string().min(1),
    DATABASE_PORT: z.coerce.number().int().positive().default(3306),
    DATABASE_USER: z.string().min(1),
    DATABASE_PASSWORD: z.string().min(1),
    DATABASE_NAME: z.string().min(1),
    REDIS_HOST: z.string().min(1).default('localhost'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_ENVIRONMENT: z.string().default('development'),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_WINDOW: z.string().min(1).default('1 minute'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') {
      return;
    }
    if (WEAK_SECRET_PATTERN.test(data.JWT_ACCESS_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_ACCESS_SECRET'],
        message: 'JWT_ACCESS_SECRET must not use a placeholder value in production',
      });
    }
    if (WEAK_SECRET_PATTERN.test(data.JWT_REFRESH_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must not use a placeholder value in production',
      });
    }
  });

export type Config = z.infer<typeof envSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  return parsed.data;
}

let cached: Config | null = null;

export function getConfig(): Config {
  if (cached === null) {
    cached = loadConfig();
  }
  return cached;
}
