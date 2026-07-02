import { z } from 'zod';

export const progressFormSchema = z.object({
  description: z.string().min(3, 'Descreva o progresso').max(1000),
  percentage: z.coerce.number().int().min(0).max(100),
});
export type ProgressFormValues = z.infer<typeof progressFormSchema>;

export const disputeFormSchema = z.object({
  reason: z.string().min(10, 'Mínimo 10 caracteres').max(2000),
});
export type DisputeFormValues = z.infer<typeof disputeFormSchema>;
