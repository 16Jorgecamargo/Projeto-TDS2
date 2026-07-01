import { describe, it, expect } from 'vitest';
import { mockQueue } from './queue.js';

type NotifyJob = { userId: string };

describe('mockQueue', () => {
  it('records added jobs', async () => {
    const queue = mockQueue<NotifyJob>('notifications');
    const job = await queue.add('send', { userId: 'u1' });
    expect(job.name).toBe('send');
    expect(job.data).toEqual({ userId: 'u1' });
    expect(queue.jobs).toHaveLength(1);
    expect(queue.name).toBe('notifications');
  });

  it('adds jobs in bulk and retrieves by id', async () => {
    const queue = mockQueue<NotifyJob>();
    const [first] = await queue.addBulk([
      { name: 'a', data: { userId: 'u1' } },
      { name: 'b', data: { userId: 'u2' } },
    ]);
    expect(queue.jobs).toHaveLength(2);
    expect(await queue.getJob(first!.id)).toEqual(first);
  });

  it('removes a job', async () => {
    const queue = mockQueue<NotifyJob>();
    const job = await queue.add('send', { userId: 'u1' });
    await queue.remove(job.id);
    expect(queue.jobs).toHaveLength(0);
  });
});
