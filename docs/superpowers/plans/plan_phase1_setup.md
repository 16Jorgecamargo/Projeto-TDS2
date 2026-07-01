# Fase 1 — Setup do Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans para implementar este plano task-a-task. Steps usam checkbox (`- [ ]`) syntax para tracking.

**Goal:** Estabelecer o monorepo (raiz + `backend/` + `frontend/`) com TypeScript strict, ESLint/Prettier, config global validada por Zod e scaffold Vite React 19 + Tailwind 3, deixando `npm run typecheck` e `npm run lint` verdes nos dois projetos e o app Vite subindo.

**Architecture:** npm workspaces na raiz orquestra `backend/` (Fastify futuro, ESM + NodeNext) e `frontend/` (Vite 6 + React 19, ESM). Prettier compartilhado na raiz; ESLint flat config por projeto. Config de ambiente do backend centralizada em `backend/src/config/` com `dotenv` + `zod` (validação fail-fast). Nenhum código de negócio nesta fase — apenas fundação compilável e lintável.

**Tech Stack:** Node 20, npm workspaces, TypeScript `^5.6.2` (backend) / `^5.7.0` (frontend) strict, ESLint 9 flat config, Prettier 3, `dotenv` + `zod` (backend config), Vite 6 + React 19 + Tailwind 3 + PostCSS/Autoprefixer (frontend), Vitest para o teste de config.

## Global Constraints

Toda task herda estas regras verbatim (fonte: `docs/superpowers/plans/plan_index.md` §Global Constraints):

- Node.js `>=20`. TypeScript `^5.6.2` (backend) / `^5.7.0` (frontend), **strict: true** nos dois.
- **Sem comentários no código.**
- **Inglês** em variáveis, funções, arquivos. (Docs de plano e mensagens de commit em pt-BR.)
- Não trocar libs nem adicionar deps fora das listadas na spec §2, salvo necessidade explícita documentada no plano.
- ESLint + Prettier passando antes de todo commit.
- Todo campo Zod exposto via API: `.describe('...')` + `.openapi({ example })`. Valores fixos = `z.enum([...])`, **nunca** `z.string()`.
- DECIMAL do MySQL2 chega como **string** — sempre `Number()` antes de aritmética.
- UNIQUE composto em toda relação N:M.
- `contracts.cancelled_by` FK nullable; `audit_logs.user_id` nullable; `notifications.channel` e `withdrawals.payment_method` são ENUM.
- Commits: conventional commits em português brasil, **nunca** marcar IA/coautoria.
- Test infra (Vitest) antes de código de negócio. Unit mocka repos/Redis/BullMQ. Integração usa banco real via `buildTestApp()`.

**Dependências adicionadas fora da spec §2 (necessidade explícita documentada):**
- `@typescript-eslint/parser ^8.6` e `@typescript-eslint/eslint-plugin ^8.6` no **frontend** — a spec §2 lista `@typescript-eslint/* ^8.6` apenas no backend, mas o ESLint do frontend precisa parsear `.tsx` com type-awareness. Sem eles, `npm run lint` do frontend não consegue analisar TypeScript.

Referência: `docs/superpowers/plans/plan_index.md` e `docs/superpowers/specs/2026-07-01-services-marketplace-design.md`.

---

## File Structure

Raiz:
- `package.json` — workspaces + scripts agregadores.
- `.gitignore` — ignora node_modules/dist/coverage/.env/artefatos.
- `.prettierrc` — config Prettier compartilhada pelos dois projetos.

Backend (`backend/`):
- `package.json` — deps da spec §2 + scripts do backend.
- `tsconfig.json` — strict, ESM NodeNext, decorators habilitados.
- `eslint.config.js` — flat config TypeScript + prettier.
- `.env.example` — template de variáveis de ambiente.
- `src/config/index.ts` — `loadConfig()` (Zod) + `getConfig()` (memoizado).
- `src/config/config.test.ts` — unit do parser de config.

Frontend (`frontend/`):
- `package.json` — deps da spec §2 + scripts do frontend.
- `tsconfig.json` — strict, bundler resolution, jsx react-jsx.
- `vite.config.ts` — plugin React.
- `eslint.config.js` — flat config React + TypeScript + prettier.
- `index.html` — HTML raiz do Vite.
- `postcss.config.js` — tailwindcss + autoprefixer.
- `tailwind.config.js` — content globs.
- `src/main.tsx` — bootstrap React 19.
- `src/App.tsx` — componente raiz mínimo.
- `src/index.css` — diretivas Tailwind.

---

### Task 1: Raiz do monorepo (workspaces, gitignore, prettier)

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.prettierrc`

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: workspaces `["backend", "frontend"]`; scripts raiz `typecheck`, `lint`, `build`, `test` que fazem fan-out via `--workspaces`; `.prettierrc` herdado pelos dois projetos.

- [ ] **Step 1: Escrever verificação que falha**

Run: `test -f package.json && echo EXISTS || echo MISSING`
Expected: `MISSING`

- [ ] **Step 2: Criar `.gitignore`**

```gitignore
node_modules
dist
coverage
.env
.env.local
*.log
.DS_Store
backend/dist
frontend/dist
playwright-report
test-results
```

- [ ] **Step 3: Criar `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 4: Criar `package.json` raiz**

```json
{
  "name": "services-marketplace",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["backend", "frontend"],
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "typecheck": "npm run typecheck --workspaces",
    "lint": "npm run lint --workspaces",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

- [ ] **Step 5: Verificar que o arquivo existe e é JSON válido**

Run: `node -e "require('./package.json'); console.log('OK')"`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore .prettierrc
git commit -m "chore: inicializa monorepo com npm workspaces e prettier"
```

---

### Task 2: Backend — package.json e tsconfig

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`

**Interfaces:**
- Consumes: workspaces raiz (Task 1).
- Produces: scripts backend `dev`, `build`, `start`, `lint`, `lint:fix`, `typecheck`, `migration:run`, `migration:revert`, `migration:generate`, `test`, `test:watch`, `test:coverage`, `docs:export`; tsconfig strict ESM NodeNext com `experimentalDecorators`/`emitDecoratorMetadata` habilitados para TypeORM.

- [ ] **Step 1: Escrever verificação que falha**

Run: `cd backend 2>/dev/null && npx tsc --noEmit || echo NO_BACKEND`
Expected: `NO_BACKEND` (diretório ainda não existe)

- [ ] **Step 2: Criar `backend/package.json`**

```json
{
  "name": "@marketplace/backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "migration:run": "typeorm-ts-node-esm migration:run -d src/infra/database/data-source.ts",
    "migration:revert": "typeorm-ts-node-esm migration:revert -d src/infra/database/data-source.ts",
    "migration:generate": "typeorm-ts-node-esm migration:generate -d src/infra/database/data-source.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "docs:export": "tsx src/scripts/export-openapi.ts"
  },
  "dependencies": {
    "@fastify/compress": "^9.0.0",
    "@fastify/cors": "^11.2.0",
    "@fastify/helmet": "^13.0.2",
    "@fastify/rate-limit": "^11.0.0",
    "@fastify/swagger": "^9.7.0",
    "@fastify/swagger-ui": "^6.0.0",
    "@sentry/node": "^8.28.0",
    "bcrypt": "^5.1.1",
    "bullmq": "^5.12.12",
    "dotenv": "^16.4.5",
    "fastify": "^5.0.0",
    "fastify-type-provider-zod": "^4.0.1",
    "ioredis": "^5.4.1",
    "jsonwebtoken": "^9.0.2",
    "mysql2": "^3.11.0",
    "prom-client": "^15.1.3",
    "reflect-metadata": "^0.2.2",
    "socket.io": "^4.7.5",
    "typeorm": "^0.3.20",
    "zod": "^3.23.8",
    "zod-openapi": "^3.1.2"
  },
  "devDependencies": {
    "@swc/core": "^1.7.0",
    "@swc/helpers": "^0.5.0",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^22.0.0",
    "@typescript-eslint/eslint-plugin": "^8.6.0",
    "@typescript-eslint/parser": "^8.6.0",
    "@vitest/coverage-v8": "^2.1.1",
    "eslint": "^9.10.0",
    "eslint-config-prettier": "^9.1.0",
    "nodemon": "^3.1.0",
    "prettier": "^3.3.3",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.2",
    "unplugin-swc": "^1.5.0",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 3: Criar `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "sourceMap": true,
    "declaration": false,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Instalar dependências pela raiz**

Run: `npm install`
Expected: instalação conclui sem erro; cria `node_modules/` e `package-lock.json`.

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/tsconfig.json package-lock.json
git commit -m "chore: configura package.json e tsconfig strict do backend"
```

---

### Task 3: Backend — ESLint flat config

**Files:**
- Create: `backend/eslint.config.js`

**Interfaces:**
- Consumes: deps `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-config-prettier` (Task 2).
- Produces: `npm run lint` (backend) executável; regra `@typescript-eslint/no-unused-vars` com `argsIgnorePattern: '^_'`.

- [ ] **Step 1: Escrever verificação que falha**

Run: `npm run lint --workspace backend`
Expected: FAIL — ESLint reclama que não encontra config (`eslint.config.js`).

- [ ] **Step 2: Criar `backend/eslint.config.js`**

```js
import parser from '@typescript-eslint/parser';
import tseslint from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist', 'coverage', 'node_modules'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  prettier,
];
```

- [ ] **Step 3: Rodar lint e verificar que passa (sem arquivos .ts ainda)**

Run: `npm run lint --workspace backend`
Expected: PASS — nenhum arquivo `.ts` para lintar, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add backend/eslint.config.js
git commit -m "chore: adiciona eslint flat config do backend"
```

---

### Task 4: Backend — config global (dotenv + zod)

**Files:**
- Create: `backend/src/config/index.ts`
- Create: `backend/.env.example`
- Test: `backend/src/config/config.test.ts`

**Interfaces:**
- Consumes: `dotenv`, `zod` (Task 2); ESLint (Task 3); tsconfig strict (Task 2).
- Produces:
  - `loadConfig(source?: NodeJS.ProcessEnv): Config` — parseia e valida env, lança em caso inválido.
  - `getConfig(): Config` — singleton memoizado usado pela composição do app.
  - `type Config = z.infer<typeof envSchema>` com campos: `NODE_ENV`, `PORT`, `HOST`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `REDIS_HOST`, `REDIS_PORT`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `SENTRY_DSN?`.

- [ ] **Step 1: Escrever o teste que falha**

`backend/src/config/config.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { loadConfig } from './index.js';

const validEnv = {
  DATABASE_HOST: 'localhost',
  DATABASE_USER: 'app',
  DATABASE_PASSWORD: 'secret',
  DATABASE_NAME: 'marketplace',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
} as NodeJS.ProcessEnv;

describe('loadConfig', () => {
  it('applies defaults and coerces numeric variables', () => {
    const config = loadConfig(validEnv);
    expect(config.PORT).toBe(3000);
    expect(config.NODE_ENV).toBe('development');
    expect(config.REDIS_PORT).toBe(6379);
    expect(config.HOST).toBe('0.0.0.0');
  });

  it('throws when a required variable is missing', () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(
      'Invalid environment configuration',
    );
  });

  it('rejects a JWT secret shorter than 32 characters', () => {
    const shortSecret = { ...validEnv, JWT_ACCESS_SECRET: 'short' } as NodeJS.ProcessEnv;
    expect(() => loadConfig(shortSecret)).toThrow('Invalid environment configuration');
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npm run test --workspace backend -- src/config/config.test.ts`
Expected: FAIL — `Cannot find module './index.js'` / `loadConfig is not a function`.

- [ ] **Step 3: Implementar `backend/src/config/index.ts`**

```ts
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive().default(3306),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_NAME: z.string().min(1),
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
  SENTRY_DSN: z.string().url().optional(),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  return parsed.data;
}

let cached: Config | null = null;

export function getConfig(): Config {
  if (cached === null) {
    cached = loadConfig();
  }
  return cached;
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npm run test --workspace backend -- src/config/config.test.ts`
Expected: PASS — 3 testes verdes.

- [ ] **Step 5: Criar `backend/.env.example`**

```dotenv
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=app
DATABASE_PASSWORD=secret
DATABASE_NAME=marketplace
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_ACCESS_SECRET=change-me-access-secret-32-characters-min
JWT_REFRESH_SECRET=change-me-refresh-secret-32-characters-min
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

- [ ] **Step 6: Verificar typecheck e lint do backend**

Run: `npm run typecheck --workspace backend && npm run lint --workspace backend`
Expected: PASS — sem erros de tipo nem de lint.

- [ ] **Step 7: Commit**

```bash
git add backend/src/config/index.ts backend/src/config/config.test.ts backend/.env.example
git commit -m "feat: adiciona config global do backend validada com zod"
```

---

### Task 5: Frontend — package.json, tsconfig e Vite scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: workspaces raiz (Task 1).
- Produces: scripts frontend `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:coverage`, `e2e` (+ variantes por perfil); componente `App` default export; entry `src/main.tsx` montando em `#root`.

- [ ] **Step 1: Escrever verificação que falha**

Run: `npm run typecheck --workspace frontend 2>/dev/null || echo NO_FRONTEND`
Expected: `NO_FRONTEND`

- [ ] **Step 2: Criar `frontend/package.json`**

```json
{
  "name": "@marketplace/frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "e2e": "playwright test",
    "e2e:clients": "playwright test e2e/clients",
    "e2e:professionals": "playwright test e2e/professionals",
    "e2e:admins": "playwright test e2e/admins",
    "e2e:auth": "playwright test e2e/auth",
    "e2e:flows": "playwright test e2e/flows",
    "e2e:headed": "playwright test --headed",
    "e2e:ui": "playwright test --ui",
    "e2e:report": "playwright show-report"
  },
  "dependencies": {
    "@heroicons/react": "^2.2.0",
    "@hookform/resolvers": "^3.9.0",
    "@tanstack/react-query": "^5.62.0",
    "axios": "^1.7.9",
    "liquid-glass-react": "^1.1.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.54.0",
    "react-router-dom": "^6.28.0",
    "socket.io-client": "^4.8.0",
    "zod": "^3.24.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.60.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@typescript-eslint/eslint-plugin": "^8.6.0",
    "@typescript-eslint/parser": "^8.6.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@vitest/coverage-v8": "^2.1.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.10.0",
    "eslint-config-prettier": "^10.0.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.0",
    "prettier": "^3.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: Criar `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 4: Criar `frontend/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
```

- [ ] **Step 5: Criar `frontend/index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Services Marketplace</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Criar `frontend/src/App.tsx`**

```tsx
export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-900">Services Marketplace</h1>
    </main>
  );
}
```

- [ ] **Step 7: Criar `frontend/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 8: Instalar dependências pela raiz**

Run: `npm install`
Expected: instalação conclui; deps do frontend disponíveis.

- [ ] **Step 9: Commit**

```bash
git add frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/index.html frontend/src/App.tsx frontend/src/main.tsx package-lock.json
git commit -m "feat: adiciona scaffold vite react 19 do frontend"
```

---

### Task 6: Frontend — Tailwind 3 + PostCSS

**Files:**
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/index.css`

**Interfaces:**
- Consumes: `tailwindcss`, `postcss`, `autoprefixer` (Task 5); `src/main.tsx` importa `./index.css`.
- Produces: pipeline Tailwind ativo; classes utilitárias resolvidas no build do Vite.

- [ ] **Step 1: Escrever verificação que falha**

Run: `test -f frontend/tailwind.config.js && echo EXISTS || echo MISSING`
Expected: `MISSING`

- [ ] **Step 2: Criar `frontend/tailwind.config.js`**

```js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 3: Criar `frontend/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Criar `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Verificar que o build do Vite processa o Tailwind**

Run: `npm run build --workspace frontend`
Expected: PASS — `tsc --noEmit` sem erros e `vite build` gera `frontend/dist/` com CSS contendo utilitários do Tailwind.

- [ ] **Step 6: Commit**

```bash
git add frontend/tailwind.config.js frontend/postcss.config.js frontend/src/index.css
git commit -m "feat: configura tailwind e postcss no frontend"
```

---

### Task 7: Frontend — ESLint flat config

**Files:**
- Create: `frontend/eslint.config.js`

**Interfaces:**
- Consumes: `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-config-prettier` (Task 5).
- Produces: `npm run lint` (frontend) executável; `react/react-in-jsx-scope` desligado (React 19 JSX transform).

- [ ] **Step 1: Escrever verificação que falha**

Run: `npm run lint --workspace frontend`
Expected: FAIL — ESLint não encontra `eslint.config.js`.

- [ ] **Step 2: Criar `frontend/eslint.config.js`**

```js
import parser from '@typescript-eslint/parser';
import tseslint from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist', 'coverage', 'node_modules'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  prettier,
];
```

- [ ] **Step 3: Rodar lint e verificar que passa**

Run: `npm run lint --workspace frontend`
Expected: PASS — `App.tsx` e `main.tsx` sem violações.

- [ ] **Step 4: Commit**

```bash
git add frontend/eslint.config.js
git commit -m "chore: adiciona eslint flat config do frontend"
```

---

### Task 8: Verificação integrada da fase

**Files:**
- Nenhum arquivo novo — valida o deliverable da fase inteira.

**Interfaces:**
- Consumes: todas as tasks anteriores.
- Produces: evidência de que `npm run typecheck` e `npm run lint` estão verdes nos dois workspaces e o dev server do Vite sobe.

- [ ] **Step 1: Typecheck agregado**

Run: `npm run typecheck`
Expected: PASS — backend (`tsc --noEmit`) e frontend (`tsc --noEmit`) sem erros.

- [ ] **Step 2: Lint agregado**

Run: `npm run lint`
Expected: PASS — backend e frontend sem violações.

- [ ] **Step 3: Testes do backend**

Run: `npm run test --workspace backend`
Expected: PASS — suite de config verde.

- [ ] **Step 4: Subir o dev server do Vite e checar resposta HTTP**

Run:
```bash
npm run dev --workspace frontend &
VITE_PID=$!
sleep 5
curl -sf http://localhost:5173/ | grep -q 'id="root"' && echo VITE_OK
kill $VITE_PID
```
Expected: imprime `VITE_OK` — o Vite serve o `index.html` com o container `#root`.

- [ ] **Step 5: Commit (se houver ajustes)**

```bash
git add -A
git commit -m "chore: valida fase 1 com typecheck, lint e boot do vite" || echo "nada a commitar"
```
