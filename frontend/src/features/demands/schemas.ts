import { z } from 'zod';

export const demandFormSchema = z
  .object({
    categoryId: z.string().uuid('Categoria obrigatória'),
    title: z.string().min(5, 'Mínimo 5 caracteres').max(120),
    description: z.string().min(20, 'Mínimo 20 caracteres').max(4000),
    budgetMin: z.coerce.number().nonnegative(),
    budgetMax: z.coerce.number().nonnegative(),
  })
  .refine((v) => v.budgetMax >= v.budgetMin, { message: 'Máximo deve ser >= mínimo', path: ['budgetMax'] });

export type DemandFormValues = z.infer<typeof demandFormSchema>;
