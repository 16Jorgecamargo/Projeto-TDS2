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

export const uploadImageBodySchema = z
  .object({
    file: z
      .any()
      .describe(
        'Arquivo de imagem obrigatorio, enviado no campo "file" de um multipart/form-data',
      ),
  })
  .partial()
  .nullable()
  .optional()
  .describe(
    'Upload de imagem via multipart/form-data. O campo "file" e obrigatorio na requisicao real: ' +
      'este schema aparece como opcional apenas porque o validador de body JSON do Fastify nao ' +
      'consegue inspecionar o conteudo de requisicoes multipart (request.body permanece null), ' +
      'entao a validacao efetiva do arquivo ocorre no controller/service da rota, nao aqui.',
  );

export type UploadResponse = z.infer<typeof uploadResponseSchema>;
