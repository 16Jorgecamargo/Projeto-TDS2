# Fase A — Enriquecimento do Backend (clientName, professionalHeadline, professionalUserId)

Ver `plan_index.md` para Global Constraints e ordem de execução geral.

### Task 1: Enriquecer `contractResponseSchema` com dados legíveis das partes do contrato

**Files:**
- Modify: `backend/src/modules/contract/contract.schemas.ts`
- Modify: `backend/src/modules/contract/contract.service.ts`
- Modify: `backend/src/modules/contract/contract.routes.ts`
- Test: `backend/src/modules/contract/contract.routes.test.ts`

**Interfaces:**
- Produces: `contractResponseSchema` (e portanto o tipo `ContractResponse`) ganha 3 campos novos: `clientName: string`, `professionalHeadline: string`, `professionalUserId: string`. Toda task futura do frontend que consome `GET /contracts` ou `GET /contracts/:id` pode contar com esses 3 campos presentes na resposta.

**Contexto:** hoje `ContractService.toResponse()` já faz uma consulta assíncrona extra pra resolver o `schedule` do contrato (`this.deps.schedules.findOne(...)`). Vamos seguir exatamente esse padrão pra resolver o nome do cliente (`User.full_name`) e o headline do profissional (`ProfessionalProfile.headline`), e também expor o `user_id` do profissional (`professionalUserId`) — necessário porque `contract.professionalId` armazena o ID do **perfil** profissional, não o ID do usuário, e o botão de Chat (Fase F) precisa do ID de usuário do profissional pra abrir uma sala de chat com ele.

- [ ] **Step 1: Ler o arquivo atual do schema pra confirmar as linhas exatas**

Rode: `sed -n '40,58p' backend/src/modules/contract/contract.schemas.ts`

Confirme que `contractResponseSchema` termina assim, logo antes de `createdAt`:
```ts
  schedule: scheduleResponseSchema.nullable().describe('Agendamento').openapi({ example: null }),
  createdAt: z.string().datetime().describe('Criacao').openapi({ example: '2026-07-01T12:00:00Z' }),
});
```

- [ ] **Step 2: Adicionar os 3 campos novos ao schema**

Em `backend/src/modules/contract/contract.schemas.ts`, altere o trecho acima para:
```ts
  schedule: scheduleResponseSchema.nullable().describe('Agendamento').openapi({ example: null }),
  clientName: z.string().describe('Nome do cliente').openapi({ example: 'Maria Cliente' }),
  professionalHeadline: z
    .string()
    .describe('Titulo do profissional')
    .openapi({ example: 'Eletricista Residencial' }),
  professionalUserId: z
    .string()
    .uuid()
    .describe('ID de usuario do profissional')
    .openapi({ example: '2b3c4d5e-2222-4b2b-8b2b-222222222222' }),
  createdAt: z.string().datetime().describe('Criacao').openapi({ example: '2026-07-01T12:00:00Z' }),
});
```

- [ ] **Step 3: Rodar os testes de integração de contrato ANTES da mudança de service (baseline)**

Rode: `cd backend && npx vitest run src/modules/contract/contract.routes.test.ts`
Esperado: FAIL — o schema agora exige `clientName`/`professionalHeadline`/`professionalUserId` na resposta, mas `toResponse()` ainda não os preenche. Essa falha é esperada e confirma que o schema está sendo validado (RED).

- [ ] **Step 4: Atualizar `ContractServiceDeps` e `toResponse()` em `contract.service.ts`**

Leia o arquivo atual primeiro: `sed -n '1,45p' backend/src/modules/contract/contract.service.ts`

Substitua o topo do arquivo (imports + interface + início da classe) por:
```ts
import type { Repository } from 'typeorm';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import type { Quote } from '../../infra/database/entities/quote.entity.js';
import type { ServiceDemand } from '../../infra/database/entities/service-demand.entity.js';
import type { Schedule } from '../../infra/database/entities/schedule.entity.js';
import type { ContractProgressUpdate } from '../../infra/database/entities/contract-progress-update.entity.js';
import type { ContractProgressImage } from '../../infra/database/entities/contract-progress-image.entity.js';
import type { User } from '../../infra/database/entities/user.entity.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { NotFoundError, ForbiddenError, UnprocessableError } from '../../shared/errors.js';
import { businessMetrics } from '../../observability/metrics.js';
import type {
  ScheduleInput,
  ProgressUpdateInput,
  ContractResponse,
  ProgressUpdateResponse,
} from './contract.schemas.js';

interface ContractServiceDeps {
  contracts: Repository<Contract>;
  quotes: Repository<Quote>;
  demands: Repository<ServiceDemand>;
  schedules: Repository<Schedule>;
  progress: Repository<ContractProgressUpdate>;
  progressImages: Repository<ContractProgressImage>;
  users: Repository<User>;
  professionalProfiles: Repository<ProfessionalProfile>;
}

export class ContractService {
  constructor(private readonly deps: ContractServiceDeps) {}

  private async toResponse(contract: Contract): Promise<ContractResponse> {
    const schedule = await this.deps.schedules.findOne({ where: { contract_id: contract.id } });
    const client = await this.deps.users.findOne({ where: { id: contract.client_id } });
    const professionalProfile = await this.deps.professionalProfiles.findOne({
      where: { id: contract.professional_id },
    });
    return {
      id: contract.id,
      demandId: contract.demand_id,
      quoteId: contract.quote_id,
      clientId: contract.client_id,
      professionalId: contract.professional_id,
      total: Number(contract.total_amount),
      status: contract.status,
      cancelledBy: contract.cancelled_by,
      cancellationReason: contract.cancellation_reason,
      startedAt: contract.started_at ? contract.started_at.toISOString() : null,
      completedAt: contract.completed_at ? contract.completed_at.toISOString() : null,
      cancelledAt: contract.cancelled_at ? contract.cancelled_at.toISOString() : null,
      schedule: schedule
        ? {
            id: schedule.id,
            scheduledDate: schedule.scheduled_date.toISOString(),
            durationMinutes: schedule.duration_minutes,
            notes: schedule.notes,
            status: schedule.status,
          }
        : null,
      clientName: client ? client.full_name : 'Cliente',
      professionalHeadline: professionalProfile ? professionalProfile.headline : 'Profissional',
      professionalUserId: professionalProfile ? professionalProfile.user_id : contract.professional_id,
      createdAt: contract.created_at.toISOString(),
    };
  }
```

Não altere nenhum outro método da classe (`assertActorIsParticipant`, `acceptQuote`, `getById`, `listMine`, `start`, `complete`, `cancel`, `addProgress`, `listProgress` continuam exatamente como estão — eles só chamam `toResponse()`, que agora resolve os campos extras internamente).

- [ ] **Step 5: Atualizar `contract.routes.ts` pra passar os 2 repositórios novos**

Leia o arquivo atual: `sed -n '1,35p' backend/src/modules/contract/contract.routes.ts`

No topo do arquivo, adicione o import do `User` (o `ProfessionalProfile` já está importado):
```ts
import { User } from '../../infra/database/entities/user.entity.js';
```

Na construção do `ContractService`, adicione as 2 linhas novas:
```ts
  const service = new ContractService({
    contracts: app.dataSource.getRepository(Contract),
    quotes: app.dataSource.getRepository(Quote),
    demands: app.dataSource.getRepository(ServiceDemand),
    schedules: app.dataSource.getRepository(Schedule),
    progress: app.dataSource.getRepository(ContractProgressUpdate),
    progressImages: app.dataSource.getRepository(ContractProgressImage),
    users: app.dataSource.getRepository(User),
    professionalProfiles: app.dataSource.getRepository(ProfessionalProfile),
  });
```

- [ ] **Step 6: Rodar os testes de integração de contrato DEPOIS da mudança (deve passar agora)**

Rode: `cd backend && npx vitest run src/modules/contract/contract.routes.test.ts`
Esperado: todos os testes já existentes passam (GREEN) — eles não verificam os campos novos ainda, mas agora a resposta é válida contra o schema.

- [ ] **Step 7: Adicionar um teste novo que verifica os 3 campos**

No arquivo `backend/src/modules/contract/contract.routes.test.ts`, dentro do `describe('contract routes', ...)`, adicione (após o teste `'aceita orcamento, inicia e registra progresso'`):
```ts
  it('resposta do contrato inclui nome do cliente e dados do profissional', async () => {
    const { pro, accept } = await createAcceptedContract();

    expect(accept.json().clientName).toEqual(expect.any(String));
    expect(accept.json().clientName.length).toBeGreaterThan(0);
    expect(accept.json().professionalHeadline).toBe('Eletricista');
    expect(accept.json().professionalUserId).toBe(pro.userId);
  });
```

- [ ] **Step 8: Rodar o teste novo pra confirmar que passa**

Rode: `cd backend && npx vitest run src/modules/contract/contract.routes.test.ts`
Esperado: PASS (todos os testes do arquivo, incluindo o novo).

- [ ] **Step 9: Rodar typecheck e lint do backend**

Rode: `cd backend && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: sem erros.

- [ ] **Step 10: Commit**

```bash
git add backend/src/modules/contract/contract.schemas.ts backend/src/modules/contract/contract.service.ts backend/src/modules/contract/contract.routes.ts backend/src/modules/contract/contract.routes.test.ts
git commit -m "feat(contracts): enriquece resposta do contrato com nome do cliente e do profissional"
```
