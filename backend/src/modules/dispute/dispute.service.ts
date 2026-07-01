import type { Repository } from 'typeorm';
import type { ContractDispute } from '../../infra/database/entities/contract-dispute.entity.js';
import type { Contract } from '../../infra/database/entities/contract.entity.js';
import { NotFoundError, ForbiddenError, UnprocessableError } from '../../shared/errors.js';
import type { DisputeResponse } from './dispute.schemas.js';

interface DisputeServiceDeps {
  disputes: Repository<ContractDispute>;
  contracts: Repository<Contract>;
}

export class DisputeService {
  constructor(private readonly deps: DisputeServiceDeps) {}

  private toResponse(dispute: ContractDispute): DisputeResponse {
    return {
      id: dispute.id,
      contractId: dispute.contract_id,
      openedBy: dispute.opened_by,
      reason: dispute.reason,
      status: dispute.status,
      resolution: dispute.resolution,
      createdAt: dispute.created_at.toISOString(),
    };
  }

  private assertActorIsParticipant(
    contract: Contract,
    actor: { userId: string; professionalId: string | null },
  ): void {
    const isClient = contract.client_id === actor.userId;
    const isProfessional = actor.professionalId !== null && contract.professional_id === actor.professionalId;
    if (!isClient && !isProfessional) {
      throw new ForbiddenError('Sem acesso ao contrato');
    }
  }

  async open(
    contractId: string,
    actor: { userId: string; professionalId: string | null },
    reason: string,
  ): Promise<DisputeResponse> {
    const contract = await this.deps.contracts.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundError('Contrato nao encontrado');
    this.assertActorIsParticipant(contract, actor);
    if (contract.status !== 'active') {
      throw new UnprocessableError('Contrato nao pode ter disputa aberta');
    }
    const existing = await this.deps.disputes.findOne({ where: { contract_id: contractId, status: 'open' } });
    if (existing) throw new UnprocessableError('Disputa ja aberta para este contrato');

    const dispute = await this.deps.disputes.save(
      this.deps.disputes.create({
        contract_id: contractId,
        opened_by: actor.userId,
        reason,
        status: 'open',
        resolution: null,
        resolved_by: null,
        resolved_at: null,
      }),
    );

    contract.status = 'disputed';
    await this.deps.contracts.save(contract);

    return this.toResponse(dispute);
  }

  async listByContract(
    contractId: string,
    actor: { userId: string; professionalId: string | null },
  ): Promise<DisputeResponse[]> {
    const contract = await this.deps.contracts.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundError('Contrato nao encontrado');
    this.assertActorIsParticipant(contract, actor);
    const rows = await this.deps.disputes.find({ where: { contract_id: contractId }, order: { created_at: 'DESC' } });
    return rows.map((d) => this.toResponse(d));
  }

  async resolve(
    disputeId: string,
    status: 'resolved' | 'rejected',
    resolution: string,
  ): Promise<DisputeResponse> {
    const dispute = await this.deps.disputes.findOne({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundError('Disputa nao encontrada');
    if (dispute.status === 'resolved' || dispute.status === 'rejected') {
      throw new UnprocessableError('Disputa ja encerrada');
    }
    dispute.status = status;
    dispute.resolution = resolution;
    dispute.resolved_at = new Date();
    const saved = await this.deps.disputes.save(dispute);

    const contract = await this.deps.contracts.findOne({ where: { id: dispute.contract_id } });
    if (contract && contract.status === 'disputed') {
      contract.status = 'active';
      await this.deps.contracts.save(contract);
    }

    return this.toResponse(saved);
  }
}
