import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const normalizeState = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed.toUpperCase();
};

export const demandFilterSchema = z.object({
  city: z.preprocess(emptyToUndefined, z.string().max(128).optional()),
  state: z.preprocess(normalizeState, z.string().regex(/^[A-Z]{2}$/, 'UF invalida').optional()),
  categoryId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export type DemandFilterForm = z.infer<typeof demandFilterSchema>;

export const demandFormSchema = z.object({
  categoryId: z.string().uuid('Categoria obrigatória'),
  title: z.string().min(5, 'Mínimo 5 caracteres').max(120),
  description: z.string().min(20, 'Mínimo 20 caracteres').max(4000),
  street: z.string().min(1, 'Informe a rua'),
  number: z.string().min(1, 'Informe o número'),
  complement: z.string().nullable(),
  district: z.string().min(1, 'Informe o bairro'),
  city: z.string().min(1, 'Informe a cidade'),
  state: z.string().length(2, 'Selecione a UF'),
  zipCode: z.string().min(8, 'CEP inválido').max(9, 'CEP inválido'),
});

export type DemandFormValues = z.infer<typeof demandFormSchema>;

export const quoteFormSchema = z.object({
  message: z.string().min(5, 'Mínimo 5 caracteres').max(2000),
  validUntil: z.string().optional(),
  total: z.coerce.number().positive('Informe um valor maior que zero'),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;
