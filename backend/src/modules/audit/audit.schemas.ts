import { z } from 'zod';
import 'zod-openapi/extend';
import { paginatedResponse } from '../../shared/schemas.js';

export const auditLogResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('Audit log identifier')
    .openapi({ example: 'a1b2c3d4-0000-4000-8000-000000000030' }),
  userId: z
    .string()
    .nullable()
    .describe('Acting user, null for system actions')
    .openapi({ example: null }),
  action: z.string().describe('Action performed').openapi({ example: 'review.created' }),
  entityType: z
    .string()
    .nullable()
    .describe('Type of the affected entity')
    .openapi({ example: 'review' }),
  entityId: z
    .string()
    .nullable()
    .describe('Identifier of the affected entity')
    .openapi({ example: 'r1b2c3d4-0000-4000-8000-000000000031' }),
  ipAddress: z
    .string()
    .nullable()
    .describe('Request IP address')
    .openapi({ example: '203.0.113.10' }),
  userAgent: z
    .string()
    .nullable()
    .describe('Request user agent')
    .openapi({ example: 'Mozilla/5.0' }),
  metadata: z
    .unknown()
    .nullable()
    .describe('Additional action metadata')
    .openapi({ example: { rating: 5 } }),
  createdAt: z
    .string()
    .datetime()
    .describe('Recorded at')
    .openapi({ example: '2026-07-01T12:00:00.000Z' }),
});

export const auditLogListResponseSchema = paginatedResponse(auditLogResponseSchema);

export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;
