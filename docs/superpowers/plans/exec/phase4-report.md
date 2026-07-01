# Fase 4 — Shared: Relatório de Execução

**Data:** 2026-07-01  
**Branch:** feat/marketplace-implementation  
**Status:** CONCLUÍDA

---

## Commits

| Hash | Mensagem |
|------|----------|
| d479f806 | feat(shared): adiciona hierarquia AppError serializavel |
| b3b31fd7 | feat(shared): adiciona schemas base de id, paginacao e erro |
| 012e1880 | feat(shared): adiciona tipos compartilhados e helper de paginacao |
| b8af8de2 | feat(shared): adiciona middleware de request-id |
| 564663b1 | feat(shared): adiciona tipos e guard de erro no frontend |
| a69201c8 | feat(shared): adiciona utilitarios de formatacao no frontend |
| aee1e621 | fix(shared): adiciona extensoes .js nos imports ESM do backend |
| 8fe8acfd | docs: marca fase 4 concluida no indice |

---

## Reconciliação AppError × error-handler

O `error-handler.ts` (Fase 3) usa duck-typing via `isShapedError()` — checa `statusCode:number` e `code:string` por propriedade, sem instanceof. `AppError` e todas as subclasses expõem exatamente esses campos como propriedades públicas. **Nenhuma alteração no error-handler foi necessária.** Os 3 testes de `error-handler.test.ts` continuam verdes.

O teste de integração em `errors.test.ts` (Step 5) confirma que `ConflictError` traversa o handler e serializa corretamente para `{ error: { code, message, details } }`.

---

## O que foi exportado

### Backend `backend/src/shared/`

- **`errors.ts`** — `AppError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `UnprocessableError`
- **`schemas.ts`** — `idParamSchema`, `paginationQuerySchema`, `paginatedResponse<T>()`, `errorResponseSchema`
- **`types.ts`** — `Paginated<T>`, `toPaginated()`, re-export de `Role`/`AuthUser`
- **`middlewares/request-id.ts`** — `requestIdPlugin` (fp), registrado em `app.ts`

### Frontend `frontend/src/`

- **`types/index.ts`** — `ApiError`, `Paginated<T>`, `Role`, `isApiError()`
- **`lib/utils.ts`** — `cn()`, `toNumber()`, `formatCurrency()`, `formatDate()`

---

## Testes

### Backend (29/29)

```
src/shared/errors.test.ts           4 tests  PASS
src/shared/schemas.test.ts          5 tests  PASS
src/shared/types.test.ts            1 test   PASS
src/shared/middlewares/request-id.test.ts  2 tests  PASS
src/plugins/error-handler.test.ts   3 tests  PASS  (Fase 3, continua verde)
src/plugins/auth.test.ts            3 tests  PASS  (Fase 3)
src/app.test.ts                     3 tests  PASS  (Fase 3)
src/modules/health/health.routes.test.ts  2 tests  PASS  (Fase 3)
src/server.test.ts                  1 test   PASS  (Fase 3)
src/config/env.test.ts              5 tests  PASS  (Fase 1)
Total: 29 passed
```

### Frontend (16/16)

```
src/types/index.test.ts    2 tests  PASS
src/lib/utils.test.ts      4 tests  PASS
src/lib/http.test.ts       3 tests  PASS  (Fase 3)
src/stores/auth.test.ts    2 tests  PASS  (Fase 3)
src/App.test.tsx           1 test   PASS  (Fase 3)
src/lib/queryClient.ts     (sem testes próprios)
Total: 16 passed
```

---

## Concerns

- `formatCurrency` usa `Intl.NumberFormat('pt-BR')` que produz `U+00A0` (non-breaking space) entre "R$" e o valor. O teste no plano usa `.replace(/ /g, ' ')` onde a regex contém `U+00A0` — copiado fielmente do plano e funciona.
- Testes da Fase 3 (`error-handler`, `auth`, `app`, `health`) todos verdes pós-integração.
