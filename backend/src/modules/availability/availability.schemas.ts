import { z } from 'zod';
import 'zod-openapi/extend';

export const slotSchema = z.object({
  weekday: z
    .number()
    .int()
    .min(0)
    .max(6)
    .describe('Dia da semana (0=domingo .. 6=sabado)')
    .openapi({ example: 1 }),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .describe('Inicio (HH:MM)')
    .openapi({ example: '08:00' }),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .describe('Fim (HH:MM)')
    .openapi({ example: '18:00' }),
});

export const slotResponseSchema = slotSchema.extend({
  id: z.string().uuid().describe('ID do slot').openapi({ example: '6f7a1111-1111-1111-1111-111111111111' }),
});

export const exceptionSchema = z.object({
  date: z.string().date().describe('Data (YYYY-MM-DD)').openapi({ example: '2026-12-25' }),
  isAvailable: z.boolean().describe('Disponivel nessa data').openapi({ example: false }),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .describe('Inicio (HH:MM)')
    .openapi({ example: null }),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable()
    .describe('Fim (HH:MM)')
    .openapi({ example: null }),
  reason: z.string().max(255).nullable().describe('Motivo').openapi({ example: 'Feriado' }),
});

export const exceptionResponseSchema = exceptionSchema.extend({
  id: z.string().uuid().describe('ID da excecao').openapi({ example: '7a8b1111-1111-1111-1111-111111111111' }),
});

export type SlotInput = z.infer<typeof slotSchema>;
export type SlotResponse = z.infer<typeof slotResponseSchema>;
export type ExceptionInput = z.infer<typeof exceptionSchema>;
export type ExceptionResponse = z.infer<typeof exceptionResponseSchema>;
