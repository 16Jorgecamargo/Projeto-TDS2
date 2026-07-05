import type { ObjectLiteral, Repository } from 'typeorm';
import { vi, type Mock } from 'vitest';

export type MockQueryBuilder = {
  select: Mock;
  addSelect: Mock;
  where: Mock;
  andWhere: Mock;
  orWhere: Mock;
  leftJoin: Mock;
  leftJoinAndSelect: Mock;
  innerJoin: Mock;
  innerJoinAndSelect: Mock;
  orderBy: Mock;
  addOrderBy: Mock;
  groupBy: Mock;
  distinct: Mock;
  skip: Mock;
  take: Mock;
  limit: Mock;
  offset: Mock;
  getOne: Mock;
  getMany: Mock;
  getManyAndCount: Mock;
  getCount: Mock;
  getRawOne: Mock;
  getRawMany: Mock;
  execute: Mock;
};

export function mockQueryBuilder(): MockQueryBuilder {
  const qb = {} as MockQueryBuilder;
  const chainable = [
    'select',
    'addSelect',
    'where',
    'andWhere',
    'orWhere',
    'leftJoin',
    'leftJoinAndSelect',
    'innerJoin',
    'innerJoinAndSelect',
    'orderBy',
    'addOrderBy',
    'groupBy',
    'distinct',
    'skip',
    'take',
    'limit',
    'offset',
  ] as const;
  for (const method of chainable) {
    qb[method] = vi.fn(() => qb);
  }
  qb.getOne = vi.fn().mockResolvedValue(null);
  qb.getMany = vi.fn().mockResolvedValue([]);
  qb.getManyAndCount = vi.fn().mockResolvedValue([[], 0]);
  qb.getCount = vi.fn().mockResolvedValue(0);
  qb.getRawOne = vi.fn().mockResolvedValue(undefined);
  qb.getRawMany = vi.fn().mockResolvedValue([]);
  qb.execute = vi.fn().mockResolvedValue(undefined);
  return qb;
}

export type MockRepository<T extends ObjectLiteral> = {
  [K in keyof Repository<T>]: Mock;
} & { createQueryBuilder: Mock<() => MockQueryBuilder> };

export function mockRepo<T extends ObjectLiteral>(): MockRepository<T> {
  const queryBuilder = mockQueryBuilder();
  const repo = {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue(null),
    findOneBy: vi.fn().mockResolvedValue(null),
    findOneByOrFail: vi.fn(),
    findBy: vi.fn().mockResolvedValue([]),
    findAndCount: vi.fn().mockResolvedValue([[], 0]),
    create: vi.fn((value) => value),
    save: vi.fn((value) => Promise.resolve(value)),
    insert: vi.fn().mockResolvedValue({ identifiers: [], generatedMaps: [], raw: {} }),
    update: vi.fn().mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] }),
    upsert: vi.fn().mockResolvedValue({ identifiers: [], generatedMaps: [], raw: {} }),
    delete: vi.fn().mockResolvedValue({ affected: 1, raw: {} }),
    softDelete: vi.fn().mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] }),
    remove: vi.fn((value) => Promise.resolve(value)),
    count: vi.fn().mockResolvedValue(0),
    countBy: vi.fn().mockResolvedValue(0),
    exists: vi.fn().mockResolvedValue(false),
    existsBy: vi.fn().mockResolvedValue(false),
    increment: vi.fn().mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] }),
    decrement: vi.fn().mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] }),
    createQueryBuilder: vi.fn(() => queryBuilder),
  };
  return repo as unknown as MockRepository<T>;
}
