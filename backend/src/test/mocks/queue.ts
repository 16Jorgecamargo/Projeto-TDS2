import { randomUUID } from 'node:crypto';

export type MockJob<T> = {
  id: string;
  name: string;
  data: T;
};

export type MockQueue<T> = {
  name: string;
  jobs: MockJob<T>[];
  add(name: string, data: T): Promise<MockJob<T>>;
  addBulk(entries: Array<{ name: string; data: T }>): Promise<MockJob<T>[]>;
  getJob(id: string): Promise<MockJob<T> | undefined>;
  remove(id: string): Promise<number>;
  close(): Promise<void>;
};

export function mockQueue<T = unknown>(name = 'test-queue'): MockQueue<T> {
  const jobs: MockJob<T>[] = [];
  return {
    name,
    jobs,
    async add(jobName, data) {
      const job: MockJob<T> = { id: randomUUID(), name: jobName, data };
      jobs.push(job);
      return job;
    },
    async addBulk(entries) {
      const created = entries.map((entry) => ({
        id: randomUUID(),
        name: entry.name,
        data: entry.data,
      }));
      jobs.push(...created);
      return created;
    },
    async getJob(id) {
      return jobs.find((job) => job.id === id);
    },
    async remove(id) {
      const index = jobs.findIndex((job) => job.id === id);
      if (index === -1) {
        return 0;
      }
      jobs.splice(index, 1);
      return 1;
    },
    async close() {
      jobs.length = 0;
    },
  };
}
