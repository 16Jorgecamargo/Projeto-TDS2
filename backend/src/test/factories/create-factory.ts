import type { DataSource, DeepPartial, EntityTarget, ObjectLiteral } from 'typeorm';

export function createFactory<T extends ObjectLiteral>(
  target: EntityTarget<T>,
  defaults: () => DeepPartial<T>,
) {
  return async (dataSource: DataSource, overrides: DeepPartial<T> = {} as DeepPartial<T>): Promise<T> => {
    const repository = dataSource.getRepository(target);
    const entity = repository.create({ ...defaults(), ...overrides } as DeepPartial<T>);
    return repository.save(entity);
  };
}
