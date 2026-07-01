import { z } from 'zod';
import 'zod-openapi/extend';

export const addressSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: '22222222-2222-2222-2222-222222222222' }),
  label: z.string().describe('Rotulo').openapi({ example: 'Casa' }),
  street: z.string().describe('Logradouro').openapi({ example: 'Rua das Flores' }),
  number: z.string().describe('Numero').openapi({ example: '123' }),
  complement: z.string().nullable().describe('Complemento').openapi({ example: 'Apto 4' }),
  district: z.string().describe('Bairro').openapi({ example: 'Centro' }),
  city: z.string().describe('Cidade').openapi({ example: 'Porto Alegre' }),
  state: z.string().length(2).describe('UF').openapi({ example: 'RS' }),
  zipCode: z.string().describe('CEP').openapi({ example: '90000-000' }),
  isDefault: z.boolean().describe('Endereco padrao').openapi({ example: true }),
});

export const createAddressSchema = addressSchema.omit({ id: true, isDefault: true }).extend({
  complement: z.string().nullable().default(null).describe('Complemento').openapi({ example: null }),
});

export const updateAddressSchema = createAddressSchema.partial();

export type AddressDto = z.infer<typeof addressSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
