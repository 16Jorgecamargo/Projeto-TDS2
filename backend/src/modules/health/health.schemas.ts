import { z } from 'zod';
import 'zod-openapi/extend';

export const healthResponseSchema = z.object({
  status: z.literal('ok').describe('Liveness marker').openapi({ example: 'ok' }),
  uptime: z.number().describe('Process uptime in seconds').openapi({ example: 12.34 }),
});

export const readyResponseSchema = z.object({
  status: z.literal('ready').describe('Readiness marker').openapi({ example: 'ready' }),
});
