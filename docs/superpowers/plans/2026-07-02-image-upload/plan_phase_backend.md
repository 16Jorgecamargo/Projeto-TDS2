# Upload de Imagens — Backend (Tasks 1-6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for the full goal, architecture, and Global Constraints — they apply to every task below. Work from `backend/` unless noted.

---

### Task 1: Dependencies + config + `PayloadTooLargeError`

**Files:**
- Modify: `backend/package.json` (add `@fastify/multipart`, `@fastify/static`)
- Modify: `backend/src/config/index.ts`
- Modify: `backend/src/config/config.test.ts`
- Modify: `backend/src/shared/errors.ts`
- Modify: `backend/src/shared/errors.test.ts`
- Modify: `/Users/jorgecamargo/Downloads/Projeto-TDS/.gitignore`

**Interfaces:**
- Produces: `env.UPLOAD_DIR: string` (default `'./uploads'`), `env.UPLOAD_MAX_SIZE_MB: number` (default `5`), `env.UPLOAD_ALLOWED_MIME: string` (default `'image/jpeg,image/png,image/webp'`) — a comma-separated string, split by later tasks. `PayloadTooLargeError` (413, code `PAYLOAD_TOO_LARGE`) exported from `backend/src/shared/errors.ts`, same shape/pattern as the existing `AppError` subclasses. Every later backend task in this plan reads these three env vars and can throw `PayloadTooLargeError`.

- [ ] **Step 1: Install the two new dependencies**

Run: `cd backend && npm install @fastify/multipart@^10.0.0 @fastify/static@^9.1.3`
Expected: exits 0, `backend/package.json` now lists both under `dependencies`.

- [ ] **Step 2: Write the failing config test**

Add these two `it` blocks inside the existing `describe('loadConfig', ...)` block in `backend/src/config/config.test.ts` (after the existing `'applies rate limit defaults'` test):

```ts
  it('applies upload defaults', () => {
    const config = loadConfig(validEnv);
    expect(config.UPLOAD_DIR).toBe('./uploads');
    expect(config.UPLOAD_MAX_SIZE_MB).toBe(5);
    expect(config.UPLOAD_ALLOWED_MIME).toBe('image/jpeg,image/png,image/webp');
  });

  it('accepts a custom UPLOAD_MAX_SIZE_MB override', () => {
    const config = loadConfig({ ...validEnv, UPLOAD_MAX_SIZE_MB: '10' } as NodeJS.ProcessEnv);
    expect(config.UPLOAD_MAX_SIZE_MB).toBe(10);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/config.test.ts`
Expected: FAIL — `config.UPLOAD_DIR` is `undefined`, not `'./uploads'`

- [ ] **Step 3: Add the three env vars to the schema**

In `backend/src/config/index.ts`, inside the `envSchema` object, add these three fields immediately after the existing `RATE_LIMIT_WINDOW: z.string().min(1).default('1 minute'),` line:

```ts
    UPLOAD_DIR: z.string().min(1).default('./uploads'),
    UPLOAD_MAX_SIZE_MB: z.coerce.number().int().positive().default(5),
    UPLOAD_ALLOWED_MIME: z.string().min(1).default('image/jpeg,image/png,image/webp'),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/config/config.test.ts`
Expected: PASS (all tests in the file, including the 2 new ones)

- [ ] **Step 5: Write the failing error test**

Add to `backend/src/shared/errors.test.ts`: first, add `PayloadTooLargeError` to the existing `import { ... } from './errors.js';` line at the top (alongside `UnprocessableError`). Then add this assertion inside the existing `'maps each subclass to its status and code'` test, appended after the `UnprocessableError` line:

```ts
    expect([new PayloadTooLargeError().statusCode, new PayloadTooLargeError().code]).toEqual([413, 'PAYLOAD_TOO_LARGE']);
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/shared/errors.test.ts`
Expected: FAIL — `PayloadTooLargeError is not defined` (or import error)

- [ ] **Step 7: Add `PayloadTooLargeError`**

In `backend/src/shared/errors.ts`, add this class after `UnprocessableError`:

```ts
export class PayloadTooLargeError extends AppError {
  constructor(message = 'Payload too large', details?: unknown) {
    super(413, 'PAYLOAD_TOO_LARGE', message, details);
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/shared/errors.test.ts`
Expected: PASS

- [ ] **Step 9: Ignore the local uploads directory**

In `/Users/jorgecamargo/Downloads/Projeto-TDS/.gitignore`, add a new line after `backend/dist`:

```
backend/uploads/
```

- [ ] **Step 10: Commit**

```bash
cd /Users/jorgecamargo/Downloads/Projeto-TDS
git add backend/package.json backend/package-lock.json backend/src/config/index.ts backend/src/config/config.test.ts backend/src/shared/errors.ts backend/src/shared/errors.test.ts .gitignore
git commit -m "feat(upload): adiciona dependencias, config e PayloadTooLargeError"
```

---

### Task 2: Detector de assinatura de imagem (magic bytes)

**Files:**
- Create: `backend/src/modules/upload/image-signature.ts`
- Test: `backend/src/modules/upload/image-signature.test.ts`

**Interfaces:**
- Produces: `ImageSignature { mimeType: string; extension: string }`, `detectImageSignature(buffer: Buffer): ImageSignature | null`. Consumed by `UploadService` (Task 3) to determine the real file type from content, ignoring whatever the client claims.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { detectImageSignature } from './image-signature.js';

describe('detectImageSignature', () => {
  it('detecta JPEG pelos magic bytes', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectImageSignature(buffer)).toEqual({ mimeType: 'image/jpeg', extension: '.jpg' });
  });

  it('detecta PNG pelos magic bytes', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(detectImageSignature(buffer)).toEqual({ mimeType: 'image/png', extension: '.png' });
  });

  it('detecta WEBP pelos magic bytes', () => {
    const buffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectImageSignature(buffer)).toEqual({ mimeType: 'image/webp', extension: '.webp' });
  });

  it('retorna null para conteudo nao reconhecido', () => {
    const buffer = Buffer.from('isto e um arquivo de texto qualquer');
    expect(detectImageSignature(buffer)).toBeNull();
  });

  it('retorna null para buffer vazio', () => {
    expect(detectImageSignature(Buffer.alloc(0))).toBeNull();
  });

  it('nao confunde um RIFF sem marcador WEBP', () => {
    const buffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20]);
    expect(detectImageSignature(buffer)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/upload/image-signature.test.ts`
Expected: FAIL — `Cannot find module './image-signature.js'`

- [ ] **Step 3: Write the implementation**

```ts
export interface ImageSignature {
  mimeType: string;
  extension: string;
}

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46];
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50];

function matchesAt(buffer: Buffer, offset: number, bytes: number[]): boolean {
  if (buffer.length < offset + bytes.length) {
    return false;
  }
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

export function detectImageSignature(buffer: Buffer): ImageSignature | null {
  if (matchesAt(buffer, 0, JPEG_MAGIC)) {
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  }
  if (matchesAt(buffer, 0, PNG_MAGIC)) {
    return { mimeType: 'image/png', extension: '.png' };
  }
  if (matchesAt(buffer, 0, RIFF_MAGIC) && matchesAt(buffer, 8, WEBP_MAGIC)) {
    return { mimeType: 'image/webp', extension: '.webp' };
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/upload/image-signature.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/upload/image-signature.ts backend/src/modules/upload/image-signature.test.ts
git commit -m "feat(upload): adiciona detector de assinatura de imagem por magic bytes"
```

---

### Task 3: `UploadService` (armazenamento em disco)

**Files:**
- Create: `backend/src/modules/upload/upload.service.ts`
- Test: `backend/src/modules/upload/upload.service.test.ts`

**Interfaces:**
- Consumes: `detectImageSignature` from Task 2; `BadRequestError`, `PayloadTooLargeError` from `backend/src/shared/errors.ts`.
- Produces: `UploadServiceDeps { uploadDir: string; maxSizeBytes: number; allowedMimeTypes: string[] }`, `UploadResult { url: string; filename: string; size: number }`, `UploadService` class with `saveImage(buffer: Buffer): Promise<UploadResult>`. Consumed by `upload.routes.ts` (Task 4).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { UploadService } from './upload.service.js';
import { BadRequestError, PayloadTooLargeError } from '../../shared/errors.js';

const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

describe('UploadService', () => {
  let uploadDir: string;
  let service: UploadService;

  beforeEach(async () => {
    uploadDir = await mkdtemp(path.join(tmpdir(), 'upload-test-'));
    service = new UploadService({ uploadDir, maxSizeBytes: 1024 * 1024, allowedMimeTypes: ALLOWED });
  });

  afterEach(async () => {
    await rm(uploadDir, { recursive: true, force: true });
  });

  it('salva um JPEG valido e retorna url/filename/size', async () => {
    const result = await service.saveImage(JPEG_BYTES);

    expect(result.filename).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(result.url).toBe(`/uploads/${result.filename}`);
    expect(result.size).toBe(JPEG_BYTES.length);

    const written = await readFile(path.join(uploadDir, result.filename));
    expect(written).toEqual(JPEG_BYTES);
  });

  it('rejeita buffer vazio', async () => {
    await expect(service.saveImage(Buffer.alloc(0))).rejects.toBeInstanceOf(BadRequestError);
  });

  it('rejeita arquivo maior que o limite configurado', async () => {
    const small = new UploadService({ uploadDir, maxSizeBytes: 5, allowedMimeTypes: ALLOWED });
    await expect(small.saveImage(JPEG_BYTES)).rejects.toBeInstanceOf(PayloadTooLargeError);
  });

  it('rejeita tipo de arquivo nao reconhecido', async () => {
    const text = Buffer.from('nao sou uma imagem');
    await expect(service.saveImage(text)).rejects.toBeInstanceOf(BadRequestError);
  });

  it('rejeita mime detectado fora da lista permitida', async () => {
    const jpegOnly = new UploadService({ uploadDir, maxSizeBytes: 1024 * 1024, allowedMimeTypes: ['image/png'] });
    await expect(jpegOnly.saveImage(JPEG_BYTES)).rejects.toBeInstanceOf(BadRequestError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/upload/upload.service.test.ts`
Expected: FAIL — `Cannot find module './upload.service.js'`

- [ ] **Step 3: Write the implementation**

```ts
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BadRequestError, PayloadTooLargeError } from '../../shared/errors.js';
import { detectImageSignature } from './image-signature.js';

export interface UploadServiceDeps {
  uploadDir: string;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
}

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

export class UploadService {
  constructor(private readonly deps: UploadServiceDeps) {}

  async saveImage(buffer: Buffer): Promise<UploadResult> {
    if (buffer.length === 0) {
      throw new BadRequestError('Arquivo vazio');
    }
    if (buffer.length > this.deps.maxSizeBytes) {
      throw new PayloadTooLargeError('Arquivo excede o tamanho maximo permitido');
    }

    const signature = detectImageSignature(buffer);
    if (!signature || !this.deps.allowedMimeTypes.includes(signature.mimeType)) {
      throw new BadRequestError('Tipo de arquivo nao suportado');
    }

    await mkdir(this.deps.uploadDir, { recursive: true });
    const filename = `${randomUUID()}${signature.extension}`;
    const filePath = path.join(this.deps.uploadDir, filename);
    await writeFile(filePath, buffer);

    return { url: `/uploads/${filename}`, filename, size: buffer.length };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/upload/upload.service.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/upload/upload.service.ts backend/src/modules/upload/upload.service.test.ts
git commit -m "feat(upload): adiciona UploadService com armazenamento em disco"
```

---

### Task 4: Schemas + controller + routes + wiring no app + teste de integracao

**Files:**
- Create: `backend/src/modules/upload/upload.schemas.ts`
- Create: `backend/src/modules/upload/upload.controller.ts`
- Create: `backend/src/modules/upload/upload.routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/modules/upload/upload.routes.test.ts`

**Interfaces:**
- Consumes: `UploadService` (Task 3); `env` from `backend/src/config/env.ts`; `app.authenticate` (existing auth plugin decorator); `app.dataSource` is NOT needed here (no entity).
- Produces: `POST /api/uploads/images` route, authenticated, multipart, returns `201 { url, filename, size }`. This is the endpoint the frontend `uploads` API client (Phase Frontend, Task 7) calls.

This task must register the route into the real app (`app.ts`) in the same task as its integration test, since the test needs the route mounted to reach it via `buildTestApp()`.

- [ ] **Step 1: Write the failing integration test**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';
import { env } from '../../config/env.js';

const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

async function registerUser(app: FastifyInstance) {
  const email = `upload-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Upload User', email, phone, password: 'S3nh@Forte', role: 'client' },
  });
  const body = res.json();
  return { headers: { authorization: `Bearer ${body.accessToken}` } };
}

function buildMultipartBody(
  fieldName: string,
  filename: string,
  contentType: string,
  data: Buffer,
  boundary: string,
): Buffer {
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([preamble, data, epilogue]);
}

describe('upload routes', () => {
  let app: FastifyInstance;
  const boundary = '----uploadtestboundary';

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });

  afterAll(async () => {
    await app.close();
    await rm(path.resolve(env.UPLOAD_DIR), { recursive: true, force: true });
  });

  it('envia uma imagem e retorna url/filename/size', async () => {
    const user = await registerUser(app);
    const body = buildMultipartBody('file', 'photo.jpg', 'image/jpeg', JPEG_BYTES, boundary);

    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads/images',
      headers: {
        ...user.headers,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.jpg$/);
    expect(json.size).toBe(JPEG_BYTES.length);
  });

  it('rejeita arquivo com conteudo nao reconhecido como imagem', async () => {
    const user = await registerUser(app);
    const body = buildMultipartBody(
      'file',
      'evil.jpg',
      'image/jpeg',
      Buffer.from('nao sou uma imagem de verdade'),
      boundary,
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads/images',
      headers: {
        ...user.headers,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(res.statusCode).toBe(400);
  });

  it('retorna 401 sem autenticacao', async () => {
    const body = buildMultipartBody('file', 'photo.jpg', 'image/jpeg', JPEG_BYTES, boundary);

    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads/images',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });

    expect(res.statusCode).toBe(401);
  });

  it('retorna 400 quando nenhum arquivo e enviado', async () => {
    const user = await registerUser(app);
    const emptyBody = Buffer.from(`--${boundary}--\r\n`);

    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads/images',
      headers: {
        ...user.headers,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: emptyBody,
    });

    expect(res.statusCode).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/upload/upload.routes.test.ts`
Expected: FAIL — 404 on `POST /api/uploads/images` (route doesn't exist yet)

- [ ] **Step 3: Write `upload.schemas.ts`**

```ts
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
```

- [ ] **Step 4: Write `upload.controller.ts`**

```ts
import type {} from '@fastify/multipart';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { BadRequestError } from '../../shared/errors.js';
import type { UploadService } from './upload.service.js';

export class UploadController {
  constructor(private readonly service: UploadService) {}

  uploadImage = async (req: FastifyRequest, reply: FastifyReply) => {
    const data = await req.file();
    if (!data) {
      throw new BadRequestError('Nenhum arquivo enviado');
    }
    const buffer = await data.toBuffer();
    const result = await this.service.saveImage(buffer);
    return reply.status(201).send(result);
  };
}
```

- [ ] **Step 5: Write `upload.routes.ts`**

```ts
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { UploadService } from './upload.service.js';
import { UploadController } from './upload.controller.js';
import { uploadResponseSchema } from './upload.schemas.js';

export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  const service = new UploadService({
    uploadDir: path.resolve(env.UPLOAD_DIR),
    maxSizeBytes: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024,
    allowedMimeTypes: env.UPLOAD_ALLOWED_MIME.split(','),
  });
  const controller = new UploadController(service);

  app.post('/uploads/images', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['upload'],
      summary: 'Enviar imagem (multipart/form-data, campo "file")',
      response: { 201: uploadResponseSchema },
    },
    handler: controller.uploadImage,
  });
}
```

- [ ] **Step 6: Wire into `app.ts`**

Add these two imports near the top of `backend/src/app.ts`, alongside the other plugin imports (after the `import swaggerUi from '@fastify/swagger-ui';` line):

```ts
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
```

Add this import alongside the other module route imports (after the `import { adminRoutes } from './modules/admin/admin.routes.js';` line):

```ts
import { uploadRoutes } from './modules/upload/upload.routes.js';
```

Inside `buildApp()`, add these two plugin registrations immediately after the existing `await app.register(authPlugin, { accessSecret: env.JWT_ACCESS_SECRET });` line and before the `await app.register(swagger, ...)` block:

```ts
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  mkdirSync(uploadDir, { recursive: true });
  await app.register(multipart, {
    limits: { fileSize: (env.UPLOAD_MAX_SIZE_MB + 1) * 1024 * 1024 },
  });
  await app.register(fastifyStatic, { root: uploadDir, prefix: '/uploads/' });
```

Add the route registration alongside the other `await app.register(xRoutes, { prefix: '/api' });` calls, immediately after `await app.register(adminRoutes, { prefix: '/api' });`:

```ts
  await app.register(uploadRoutes, { prefix: '/api' });
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/modules/upload/upload.routes.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/upload/upload.schemas.ts backend/src/modules/upload/upload.controller.ts backend/src/modules/upload/upload.routes.ts backend/src/modules/upload/upload.routes.test.ts backend/src/app.ts
git commit -m "feat(upload): adiciona rota POST /uploads/images e integra no app"
```

---

### Task 5: Volume Docker para os arquivos enviados

**Files:**
- Modify: `/Users/jorgecamargo/Downloads/Projeto-TDS/docker-compose.yml`

**Interfaces:** none (infra-only change).

- [ ] **Step 1: Add the volume mount to the `app` service**

In `docker-compose.yml`, inside the `app:` service block, add a `volumes:` key. Insert it immediately after the `ports:` block and before `healthcheck:`:

```yaml
    volumes:
      - uploads_data:/app/uploads
```

- [ ] **Step 2: Register the named volume**

In the top-level `volumes:` map at the bottom of the file (currently `mysql_data:`, `redis_data:`, `prometheus_data:`, `grafana_data:`), add a new entry:

```yaml
  uploads_data:
```

- [ ] **Step 3: Validate the compose file**

Run: `docker compose config --quiet`
Expected: exits 0, no output (silent success means the YAML is valid and resolves)

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(upload): adiciona volume docker para arquivos enviados"
```

---

### Task 6: Verificacao final do backend

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: exits 0

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: exits 0

- [ ] **Step 3: Full backend test suite**

Run: `npm run test`
Expected: PASS, every suite green (existing suites + `image-signature.test.ts`, `upload.service.test.ts`, `upload.routes.test.ts`, updated `config.test.ts` and `errors.test.ts`)

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: exits 0

- [ ] **Step 5: Manual smoke check (optional, dev server)**

Run: `npm run dev`, then from another terminal:

```bash
curl -X POST http://localhost:3000/api/uploads/images \
  -H "Authorization: Bearer <valid-access-token>" \
  -F "file=@/path/to/any/real.jpg"
```

Expected: `201` with `{ "url": "/uploads/<uuid>.jpg", "filename": "<uuid>.jpg", "size": <bytes> }`. Then `curl http://localhost:3000<url>` should return the same image bytes back. Stop the dev server (`Ctrl+C`) once confirmed. No commit for this step — verification gate only.

---

Next: [plan_phase_frontend.md](plan_phase_frontend.md)
