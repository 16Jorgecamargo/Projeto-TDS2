import type { Repository } from 'typeorm';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { AvailabilitySlot } from '../../infra/database/entities/availability-slot.entity.js';
import { AvailabilityException } from '../../infra/database/entities/availability-exception.entity.js';
import { NotFoundError } from '../../shared/errors.js';
import type { SlotInput, SlotResponse, ExceptionInput, ExceptionResponse } from './availability.schemas.js';

export interface AvailabilityServiceDeps {
  profiles: Repository<ProfessionalProfile>;
  slots: Repository<AvailabilitySlot>;
  exceptions: Repository<AvailabilityException>;
}

export class AvailabilityService {
  constructor(private readonly deps: AvailabilityServiceDeps) {}

  private async resolveProfileId(userId: string): Promise<string> {
    const profile = await this.deps.profiles.findOne({ where: { user_id: userId } });
    if (!profile) throw new NotFoundError('Perfil profissional nao encontrado');
    return profile.id;
  }

  async addSlot(userId: string, input: SlotInput): Promise<SlotResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.slots.save(
      this.deps.slots.create({
        professional_id: professionalId,
        weekday: input.weekday,
        start_time: input.startTime,
        end_time: input.endTime,
      }),
    );
    return this.toSlot(saved);
  }

  async removeSlot(userId: string, id: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const slot = await this.deps.slots.findOne({ where: { id } });
    if (!slot || slot.professional_id !== professionalId) {
      throw new NotFoundError('Slot de disponibilidade nao encontrado');
    }
    await this.deps.slots.delete({ id });
  }

  async listSlots(professionalId: string): Promise<SlotResponse[]> {
    const rows = await this.deps.slots.find({ where: { professional_id: professionalId }, order: { weekday: 'ASC' } });
    return rows.map((row) => this.toSlot(row));
  }

  async addException(userId: string, input: ExceptionInput): Promise<ExceptionResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.exceptions.save(
      this.deps.exceptions.create({
        professional_id: professionalId,
        date: input.date,
        is_available: input.isAvailable,
        start_time: input.startTime,
        end_time: input.endTime,
        reason: input.reason,
      }),
    );
    return this.toException(saved);
  }

  async removeException(userId: string, id: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const exception = await this.deps.exceptions.findOne({ where: { id } });
    if (!exception || exception.professional_id !== professionalId) {
      throw new NotFoundError('Excecao de disponibilidade nao encontrada');
    }
    await this.deps.exceptions.delete({ id });
  }

  async listExceptions(professionalId: string): Promise<ExceptionResponse[]> {
    const rows = await this.deps.exceptions.find({ where: { professional_id: professionalId }, order: { date: 'ASC' } });
    return rows.map((row) => this.toException(row));
  }

  private toSlot(slot: AvailabilitySlot): SlotResponse {
    return { id: slot.id, weekday: slot.weekday, startTime: slot.start_time, endTime: slot.end_time };
  }

  private toException(exception: AvailabilityException): ExceptionResponse {
    return {
      id: exception.id,
      date: exception.date,
      isAvailable: exception.is_available,
      startTime: exception.start_time,
      endTime: exception.end_time,
      reason: exception.reason,
    };
  }
}
