import { z } from 'zod';

export const searchFormSchema = z.object({
  q: z.string().max(120).optional(),
  city: z.string().max(128).optional(),
  state: z.string().length(2).optional(),
  categoryId: z.string().uuid().optional(),
});

export type SearchForm = z.infer<typeof searchFormSchema>;
