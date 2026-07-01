import { z } from 'zod';
import 'zod-openapi/extend';

export const createCategorySchema = z.object({
  parentId: z
    .string()
    .uuid()
    .nullable()
    .describe('Categoria pai (null para raiz)')
    .openapi({ example: null }),
  name: z.string().min(2).max(128).describe('Nome da categoria').openapi({ example: 'Eletrica' }),
  slug: z
    .string()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9-]+$/)
    .describe('Slug unico')
    .openapi({ example: 'eletrica' }),
  icon: z.string().max(128).nullable().describe('Icone (nome/URL)').openapi({ example: 'bolt' }),
  description: z
    .string()
    .max(2000)
    .nullable()
    .describe('Descricao')
    .openapi({ example: 'Servicos eletricos residenciais' }),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(2)
    .max(128)
    .optional()
    .describe('Nome da categoria')
    .openapi({ example: 'Eletrica' }),
  icon: z.string().max(128).nullable().optional().describe('Icone').openapi({ example: 'bolt' }),
  description: z
    .string()
    .max(2000)
    .nullable()
    .optional()
    .describe('Descricao')
    .openapi({ example: 'Atualizado' }),
  isActive: z.boolean().optional().describe('Categoria ativa').openapi({ example: true }),
});

export const categoryResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('ID da categoria')
    .openapi({ example: '9f1c1111-1111-1111-1111-111111111111' }),
  parentId: z.string().uuid().nullable().describe('Categoria pai').openapi({ example: null }),
  name: z.string().describe('Nome').openapi({ example: 'Eletrica' }),
  slug: z.string().describe('Slug').openapi({ example: 'eletrica' }),
  icon: z.string().nullable().describe('Icone').openapi({ example: 'bolt' }),
  description: z.string().nullable().describe('Descricao').openapi({ example: 'Servicos eletricos' }),
  isActive: z.boolean().describe('Ativa').openapi({ example: true }),
});

export type CategoryTreeNode = z.infer<typeof categoryResponseSchema> & {
  children: CategoryTreeNode[];
};

export const categoryTreeNodeSchema: z.ZodType<CategoryTreeNode> = categoryResponseSchema
  .extend({
    children: z.lazy(() => z.array(categoryTreeNodeSchema)),
  })
  .describe('No da arvore de categorias') as z.ZodType<CategoryTreeNode>;

export const createTagSchema = z.object({
  name: z.string().min(2).max(128).describe('Nome da tag').openapi({ example: 'Instalacao' }),
  slug: z
    .string()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9-]+$/)
    .describe('Slug unico')
    .openapi({ example: 'instalacao' }),
});

export const tagResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('ID da tag')
    .openapi({ example: '7c4b1111-1111-1111-1111-111111111111' }),
  name: z.string().describe('Nome').openapi({ example: 'Instalacao' }),
  slug: z.string().describe('Slug').openapi({ example: 'instalacao' }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryResponse = z.infer<typeof categoryResponseSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type TagResponse = z.infer<typeof tagResponseSchema>;
