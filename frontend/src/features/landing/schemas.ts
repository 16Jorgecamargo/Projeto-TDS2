import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const normalizeState = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed.toUpperCase();
};

export const searchFormSchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().min(2).max(120).optional()),
  city: z.preprocess(emptyToUndefined, z.string().max(128).optional()),
  state: z.preprocess(normalizeState, z.string().regex(/^[A-Z]{2}$/, 'UF invalida').optional()),
  categoryId: z.string().uuid().optional(),
});

export type SearchForm = z.infer<typeof searchFormSchema>;
