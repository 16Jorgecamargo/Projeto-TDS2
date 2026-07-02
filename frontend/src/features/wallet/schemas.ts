import { z } from 'zod';

export const withdrawFormSchema = z.object({
  amount: z.coerce.number().positive('Informe um valor maior que zero'),
  paymentMethod: z.enum(['pix', 'bank_transfer']),
  destination: z.string().min(3, 'Informe o destino'),
});

export type WithdrawFormInput = z.infer<typeof withdrawFormSchema>;
