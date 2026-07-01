import type { Repository } from 'typeorm';
import { Address } from '../../infra/database/entities/address.entity.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import type { AddressDto, CreateAddressInput, UpdateAddressInput } from './address.schemas.js';

interface AddressDeps {
  addresses: Repository<Address>;
}

export class AddressService {
  constructor(private readonly deps: AddressDeps) {}

  async list(userId: string): Promise<AddressDto[]> {
    const rows = await this.deps.addresses.find({
      where: { user: { id: userId } },
      order: { is_primary: 'DESC', created_at: 'ASC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(userId: string, input: CreateAddressInput): Promise<AddressDto> {
    const count = await this.deps.addresses.count({ where: { user: { id: userId } } });
    const entity = this.deps.addresses.create({
      label: input.label,
      street: input.street,
      number: input.number,
      complement: input.complement ?? null,
      district: input.district,
      city: input.city,
      state: input.state,
      zip_code: input.zipCode,
      user: { id: userId } as User,
      is_primary: count === 0,
    });
    const saved = await this.deps.addresses.save(entity);
    return this.toDto(saved);
  }

  async update(userId: string, id: string, input: UpdateAddressInput): Promise<AddressDto> {
    const current = await this.owned(userId, id);
    const patch: Partial<Address> = {};
    if (input.label !== undefined) patch.label = input.label;
    if (input.street !== undefined) patch.street = input.street;
    if (input.number !== undefined) patch.number = input.number;
    if (input.complement !== undefined) patch.complement = input.complement;
    if (input.district !== undefined) patch.district = input.district;
    if (input.city !== undefined) patch.city = input.city;
    if (input.state !== undefined) patch.state = input.state;
    if (input.zipCode !== undefined) patch.zip_code = input.zipCode;
    if (Object.keys(patch).length > 0) {
      await this.deps.addresses.update(id, patch);
    }
    return this.toDto({ ...current, ...patch } as Address);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.owned(userId, id);
    await this.deps.addresses.delete(id);
  }

  async setDefault(userId: string, id: string): Promise<void> {
    await this.owned(userId, id);
    await this.deps.addresses.update({ user: { id: userId } }, { is_primary: false });
    await this.deps.addresses.update(id, { is_primary: true });
  }

  private async owned(userId: string, id: string): Promise<Address> {
    const address = await this.deps.addresses.findOne({ where: { id }, relations: { user: true } });
    if (!address) {
      throw new NotFoundError('Endereco nao encontrado');
    }
    if (address.user.id !== userId) {
      throw new ForbiddenError('Endereco de outro usuario');
    }
    return address;
  }

  private toDto(a: Address): AddressDto {
    return {
      id: a.id,
      label: a.label ?? '',
      street: a.street,
      number: a.number,
      complement: a.complement ?? null,
      district: a.district,
      city: a.city,
      state: a.state,
      zipCode: a.zip_code,
      isDefault: a.is_primary,
    };
  }
}
