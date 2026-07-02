export interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  requestBody?: { content?: Record<string, unknown> };
  parameters?: Array<{ in: string; name: string }>;
  responses?: Record<string, unknown>;
}

export interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, OpenApiOperation>>;
}

export interface OperationEntry {
  method: string;
  path: string;
  operation: OpenApiOperation;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

export function collectOperations(document: OpenApiDocument): OperationEntry[] {
  const entries: OperationEntry[] = [];
  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (operation) {
        entries.push({ method: method.toUpperCase(), path, operation });
      }
    }
  }
  return entries;
}

export function hasRequestBody(operation: OpenApiOperation): boolean {
  return Boolean(operation.requestBody?.content && Object.keys(operation.requestBody.content).length > 0);
}
