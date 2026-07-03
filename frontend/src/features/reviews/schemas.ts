import { z } from 'zod';

export const reviewFormSchema = z.object({
  rating: z.number().int().min(1, 'Selecione uma nota').max(5),
  comment: z.string().min(3, 'Mínimo 3 caracteres').max(2000),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
