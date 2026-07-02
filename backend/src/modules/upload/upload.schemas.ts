import { z } from 'zod';
import 'zod-openapi/extend';

export const uploadResponseSchema = z
  .object({
    url: z
      .string()
      .describe('URL publica do arquivo salvo')
      .openapi({ example: '/uploads/3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg' }),
    filename: z
      .string()
      .describe('Nome do arquivo gerado no servidor')
      .openapi({ example: '3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg' }),
    size: z.number().int().describe('Tamanho do arquivo em bytes').openapi({ example: 204800 }),
  })
  .describe('Resultado do upload de imagem');

export type UploadResponse = z.infer<typeof uploadResponseSchema>;
