import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { AddressService } from './address.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import type { Address } from '../../infra/database/entities/address.entity.js';

describe('AddressService', () => {
  let addresses: ReturnType<typeof mockRepo<Address>>;
  let service: AddressService;

  beforeEach(() => {
    addresses = mockRepo<Address>();
    service = new AddressService({ addresses: addresses as unknown as Repository<Address> });
  });

  it('cria endereco vinculado ao usuario', async () => {
    addresses.count.mockResolvedValue(0);
    addresses.create.mockImplementation((v) => v as Address);
    addresses.save.mockImplementation(async (v) => ({ ...v, id: 'addr-1' }) as Address);

    const created = await service.create('user-1', {
      label: 'Casa', street: 'Rua', number: '1', complement: null,
      district: 'Centro', city: 'POA', state: 'RS', zipCode: '90000-000',
    });
    const saved = addresses.save.mock.calls[0]![0] as Address;
    expect(saved.user).toEqual({ id: 'user-1' });
    expect(saved.is_primary).toBe(true);
    expect(created.id).toBe('addr-1');
  });

  it('impede atualizar endereco de outro usuario', async () => {
    addresses.findOne.mockResolvedValue({ id: 'addr-1', user: { id: 'outro' } } as Address);
    await expect(
      service.update('user-1', 'addr-1', { label: 'X' }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('setDefault zera os demais e marca o alvo', async () => {
    addresses.findOne.mockResolvedValue({ id: 'addr-2', user: { id: 'user-1' } } as Address);
    addresses.update.mockResolvedValue({ affected: 1 } as never);

    await service.setDefault('user-1', 'addr-2');
    expect(addresses.update).toHaveBeenCalledWith({ user: { id: 'user-1' } }, { is_primary: false });
    expect(addresses.update).toHaveBeenCalledWith('addr-2', { is_primary: true });
  });

  it('remove lanca 404 quando nao encontrado', async () => {
    addresses.findOne.mockResolvedValue(null);
    await expect(service.remove('user-1', 'x')).rejects.toMatchObject({ statusCode: 404 });
  });
});
