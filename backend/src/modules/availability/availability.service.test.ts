import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { AvailabilityService } from './availability.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import type { AvailabilitySlot } from '../../infra/database/entities/availability-slot.entity.js';
import type { AvailabilityException } from '../../infra/database/entities/availability-exception.entity.js';

describe('AvailabilityService', () => {
  let profiles: ReturnType<typeof mockRepo<ProfessionalProfile>>;
  let slots: ReturnType<typeof mockRepo<AvailabilitySlot>>;
  let exceptions: ReturnType<typeof mockRepo<AvailabilityException>>;
  let service: AvailabilityService;

  beforeEach(() => {
    profiles = mockRepo<ProfessionalProfile>();
    slots = mockRepo<AvailabilitySlot>();
    exceptions = mockRepo<AvailabilityException>();
    service = new AvailabilityService({
      profiles: profiles as unknown as Repository<ProfessionalProfile>,
      slots: slots as unknown as Repository<AvailabilitySlot>,
      exceptions: exceptions as unknown as Repository<AvailabilityException>,
    });
  });

  it('adiciona slot de disponibilidade', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    slots.create.mockImplementation((v) => v as AvailabilitySlot);
    slots.save.mockImplementation(async (v) => ({ id: 'slot-1', ...v }) as AvailabilitySlot);

    const created = await service.addSlot('user-1', { weekday: 1, startTime: '08:00', endTime: '18:00' });
    expect(created.id).toBe('slot-1');
    expect(slots.create).toHaveBeenCalledWith(
      expect.objectContaining({ professional_id: 'prof-1', weekday: 1 }),
    );
  });

  it('cria perfil vazio ao adicionar slot sem perfil profissional ainda', async () => {
    profiles.findOne.mockResolvedValueOnce(null);
    profiles.save.mockResolvedValueOnce({ id: 'prof-new', user_id: 'user-sem-perfil' } as ProfessionalProfile);
    slots.create.mockImplementation((v) => v as AvailabilitySlot);
    slots.save.mockImplementation(async (v) => ({ id: 'slot-1', ...v }) as AvailabilitySlot);

    const created = await service.addSlot('user-sem-perfil', { weekday: 1, startTime: '08:00', endTime: '18:00' });

    expect(created.id).toBe('slot-1');
    expect(slots.create).toHaveBeenCalledWith(expect.objectContaining({ professional_id: 'prof-new' }));
  });

  it('remove slot do proprio profissional e rejeita de outro', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    slots.findOne.mockResolvedValueOnce({ id: 'slot-1', professional_id: 'prof-1' } as AvailabilitySlot);
    await service.removeSlot('user-1', 'slot-1');
    expect(slots.delete).toHaveBeenCalledWith({ id: 'slot-1' });

    slots.findOne.mockResolvedValueOnce({ id: 'slot-2', professional_id: 'prof-OUTRO' } as AvailabilitySlot);
    await expect(service.removeSlot('user-1', 'slot-2')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lista slots por professionalId', async () => {
    slots.find.mockResolvedValue([
      { id: 'slot-1', professional_id: 'prof-1', weekday: 1, start_time: '08:00', end_time: '18:00' } as AvailabilitySlot,
    ]);
    const list = await service.listSlots('prof-1');
    expect(list).toHaveLength(1);
    expect(list[0]?.startTime).toBe('08:00');
  });

  it('normaliza horario com segundos vindo do banco para HH:MM ao listar slots', async () => {
    slots.find.mockResolvedValue([
      { id: 'slot-1', professional_id: 'prof-1', weekday: 1, start_time: '08:00:00', end_time: '18:00:00' } as AvailabilitySlot,
    ]);
    const list = await service.listSlots('prof-1');
    expect(list[0]?.startTime).toBe('08:00');
    expect(list[0]?.endTime).toBe('18:00');
  });

  it('adiciona e remove excecao de disponibilidade', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    exceptions.create.mockImplementation((v) => v as AvailabilityException);
    exceptions.save.mockImplementation(async (v) => ({ id: 'exc-1', ...v }) as AvailabilityException);

    const created = await service.addException('user-1', {
      date: '2026-12-25',
      isAvailable: false,
      startTime: null,
      endTime: null,
      reason: 'Feriado',
    });
    expect(created.id).toBe('exc-1');

    exceptions.findOne.mockResolvedValue({ id: 'exc-1', professional_id: 'prof-1' } as AvailabilityException);
    await service.removeException('user-1', 'exc-1');
    expect(exceptions.delete).toHaveBeenCalledWith({ id: 'exc-1' });
  });

  it('lista excecoes por professionalId', async () => {
    exceptions.find.mockResolvedValue([
      {
        id: 'exc-1',
        professional_id: 'prof-1',
        date: '2026-12-25',
        is_available: false,
        start_time: null,
        end_time: null,
        reason: 'Feriado',
      } as AvailabilityException,
    ]);
    const list = await service.listExceptions('prof-1');
    expect(list).toHaveLength(1);
    expect(list[0]?.reason).toBe('Feriado');
  });

  it('normaliza horario com segundos vindo do banco para HH:MM ao listar excecoes', async () => {
    exceptions.find.mockResolvedValue([
      {
        id: 'exc-1',
        professional_id: 'prof-1',
        date: '2026-12-25',
        is_available: true,
        start_time: '08:00:00',
        end_time: '12:00:00',
        reason: null,
      } as AvailabilityException,
    ]);
    const list = await service.listExceptions('prof-1');
    expect(list[0]?.startTime).toBe('08:00');
    expect(list[0]?.endTime).toBe('12:00');
  });
});
