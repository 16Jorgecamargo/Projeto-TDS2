## Fase E — Verificação Final (Task 13)

### Task 13: Verificação final da Fase 6

Esta task NÃO é dispatch de subagent implementador — é executada pelo controller pessoalmente, seguindo o mesmo padrão da verificação final das Fases 4 e 5.

**Pré-requisito:** Tasks 1-12 completas e commitadas (Fases A, B, C, D).

- [ ] **Step 1: Rodar a suíte completa, typecheck e lint do frontend**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa, incluindo todos os testes novos das Tasks 1-12 e todos os testes já existentes das fases anteriores (nenhuma regressão).

- [ ] **Step 2: Subir o ambiente de desenvolvimento**

Suba backend e frontend em modo dev (mesmo processo usado nas verificações das Fases 4 e 5).

- [ ] **Step 3: Verificação visual interativa via Playwright MCP**

O controller deve navegar manualmente (via Playwright MCP) por cada uma das áreas, em desktop e em pelo menos um breakpoint mobile (375px), cobrindo:

- **Landing Page** (`/`, sem login): título, `SearchBar` e `CategoryGrid` com cards clicáveis navegando pra `/search?categoryId=...`.
- **Busca** (`/search`): filtros, resultados, `<select>` de ordenação funcionando (trocar entre "Nota" e "Preço").
- **Login** (`/login`): formulário dentro do `Card`, validação de e-mail inválido, login com credenciais válidas navegando pra `/`.
- **Cadastro** (`/register`): formulário completo dentro do `Card`, cadastro navegando pra `/verify-email`.
- **Esqueci a senha** (`/forgot-password`): envio do e-mail mostrando a mensagem de confirmação.
- **Redefinir senha** (`/reset-password?token=...`): formulário de nova senha; sem token, mensagem de link inválido.
- **Verificação de e-mail** (`/verify-email`): estados sem token (com botão "Ignorar por enquanto"), pendente, sucesso, erro.
- **403** (`/forbidden`): `EmptyState` "Acesso restrito" com link de volta.
- **404** (rota inexistente, ex: `/rota-que-nao-existe`): `EmptyState` "Página não encontrada" com link de volta.

Qualquer bug real encontrado durante essa verificação deve ser corrigido diretamente pelo controller antes de considerar a Fase 6 completa (mesmo padrão das Tasks de verificação anteriores).

- [ ] **Step 4: Atualizar o ledger da fase**

Registre em `.superpowers/sdd/progress-phase6.md` a conclusão de todas as 13 tasks e o resultado da verificação visual (bugs encontrados e corrigidos, se houver; observações não-bloqueantes, se houver).

- [ ] **Step 5: Marcar a Fase 6 como completa**

Escreva no ledger: `FASE 6 COMPLETA. HEAD final: <hash do último commit>.` — isso fecha o redesign completo do frontend (Fases 1-6).
