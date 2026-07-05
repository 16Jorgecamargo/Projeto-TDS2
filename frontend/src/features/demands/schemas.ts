import { z } from 'zod';

export const demandFormSchema = z.object({
  categoryId: z.string().uuid('Categoria obrigatória'),
  title: z.string().min(5, 'Mínimo 5 caracteres').max(120),
  description: z.string().min(20, 'Mínimo 20 caracteres').max(4000),
  budgetMin: z.coerce.number().nonnegative('Orçamento mínimo inválido').nullable(),
  budgetMax: z.coerce.number().nonnegative('Orçamento máximo inválido').nullable(),
  street: z.string().min(1, 'Informe a rua'),
  number: z.string().min(1, 'Informe o número'),
  complement: z.string().nullable(),
  district: z.string().min(1, 'Informe o bairro'),
  city: z.string().min(1, 'Informe a cidade'),
  state: z.string().length(2, 'Selecione a UF'),
  zipCode: z.string().min(8, 'CEP inválido').max(9, 'CEP inválido'),
});

export type DemandFormValues = z.infer<typeof demandFormSchema>;

export const quoteItemFormSchema = z.object({
  description: z.string().min(2, 'Mínimo 2 caracteres').max(200),
  quantity: z.coerce.number().int('Deve ser inteiro').positive('Deve ser maior que zero'),
  unitPrice: z.coerce.number().nonnegative('Não pode ser negativo'),
});

export const quoteFormSchema = z.object({
  message: z.string().min(5, 'Mínimo 5 caracteres').max(2000),
  validUntil: z.string().optional(),
  items: z.array(quoteItemFormSchema).min(1, 'Adicione ao menos um item').max(50),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;
