# Upload de Imagens — Plan Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-07-02-image-upload-design.md`

**Goal:** Add a generic, authenticated image-upload endpoint to the backend (multipart upload, magic-byte validation, local-disk storage, returns a URL) plus a reusable `ImageUpload` React component on the frontend — both consumed later by Fase 2 (demand photos), Fase 3 (portfolio/avatar), and Fase 4 (contract progress photos), none of which are wired in this plan.

**Architecture:** Backend-first, bottom-up: config/error primitives → pure magic-byte detector → storage service → HTTP layer wired into the running app → infra (Docker volume) → full verification. Then frontend: thin API client → the `ImageUpload` component consuming it. The four existing consumers (`Demand.images`, `ProgressUpdate.images`, `PortfolioImage.imageUrl`, `User.avatarUrl`) already validate `z.string().url()` and are **not touched** — this plan only produces a URL for them to receive later.

**Tech Stack:** Backend: Fastify 5, TypeORM, MySQL, Zod, `@fastify/multipart`, `@fastify/static`, Vitest. Frontend: React 19, TypeScript, Axios, Vitest + Testing Library.

## Global Constraints

- No new database entity, migration, or TypeORM change — uploads are stateless (file on disk + generated URL), matching the spec's explicit scope decision.
- No change to any existing endpoint, DTO, or the four fields (`Demand.images`, `ProgressUpdate.images`, `PortfolioImage.imageUrl`, `User.avatarUrl`) that will eventually consume this feature — they keep validating `z.string().url()` exactly as today.
- File type is validated by inspecting the file's own magic bytes, never by trusting the client-supplied `Content-Type` header or filename extension.
- Every generated filename is a `crypto.randomUUID()` — never derived from the client-supplied filename (no path traversal, no collision, no injection via filename).
- The upload endpoint requires authentication (`app.authenticate`, any role) — reuses the existing auth plugin, no new auth mechanism.
- New env vars (`UPLOAD_DIR`, `UPLOAD_MAX_SIZE_MB`, `UPLOAD_ALLOWED_MIME`) follow the existing Zod-validated config pattern in `backend/src/config/index.ts` — all with sane defaults, so no `.env` file needs to change for this to work locally.
- Storage is local disk for this iteration (explicit user decision) — the `UploadService`'s public contract (`{ url, filename, size }`) is storage-agnostic, so swapping to S3/MinIO later only touches `upload.service.ts`.
- Frontend `ImageUpload` component consumes tokens from `frontend/DESIGN.md` / Tailwind theme (Fase 1) — no hardcoded colors, reuses the `Skeleton` and `Toast` primitives already built in Fase 1.

## Execution Order

1. **[plan_phase_backend.md](plan_phase_backend.md)** — Tasks 1-6: dependencies + config + error class, magic-byte image-signature detector, `UploadService` (disk I/O), schemas + controller + routes + app wiring + integration test, Docker volume, full backend verification.
2. **[plan_phase_frontend.md](plan_phase_frontend.md)** — Tasks 7-9: `uploads` API client, `ImageUpload` component, full frontend verification.

Work through the files in order — Phase Frontend's `ImageUpload` component calls the endpoint Phase Backend builds.
