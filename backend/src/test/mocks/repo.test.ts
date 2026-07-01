import { describe, it, expect } from 'vitest';
import { mockRepo } from './repo.js';

type User = { id: string; email: string };

describe('mockRepo', () => {
  it('exposes repository methods as spies', () => {
    const repo = mockRepo<User>();
    expect(repo.find).toBeTypeOf('function');
    expect(repo.findOne).toBeTypeOf('function');
    expect(repo.save).toBeTypeOf('function');
    expect(repo.create).toBeTypeOf('function');
    expect(repo.delete).toBeTypeOf('function');
  });

  it('records calls and honors mocked return values', async () => {
    const repo = mockRepo<User>();
    repo.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.c' });
    const result = await repo.findOne({ where: { id: 'u1' } });
    expect(result).toEqual({ id: 'u1', email: 'a@b.c' });
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('returns a chainable query builder', async () => {
    const repo = mockRepo<User>();
    const qb = repo.createQueryBuilder();
    qb.getMany.mockResolvedValue([{ id: 'u1', email: 'a@b.c' }]);
    const rows = await qb.where('x = :x', { x: 1 }).orderBy('id').take(10).getMany();
    expect(rows).toHaveLength(1);
    expect(qb.where).toHaveBeenCalled();
  });
});
